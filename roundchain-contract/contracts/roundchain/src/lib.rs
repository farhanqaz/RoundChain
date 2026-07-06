#![no_std]

mod error;
mod storage;
mod types;

use error::RoundChainError;
use soroban_sdk::{
    contract, contractimpl, panic_with_error, token, Address, Env, Vec,
};
use storage::{
    delete_member, has_allowed_token, member_exists, read_allowed_token, read_circle,
    read_member, read_next_circle_id, read_trust_score, write_allowed_token, write_circle,
    write_member, write_next_circle_id, write_trust_score,
};
use types::{
    collateral_amount, compute_trust_score, CircleState, CircleStatus, ContributionEntry,
    MemberState, TrustScore, DEFAULT_JOIN_WINDOW_SECS, MAX_MEMBERS_CAP,
};

#[contract]
pub struct RoundChainContract;

#[contractimpl]
impl RoundChainContract {
    /// One-time: whitelist the SAC token address used by `create_circle`.
    pub fn init(env: Env, allowed_token: Address) {
        if has_allowed_token(&env) {
            panic_with_error!(&env, RoundChainError::AlreadyInitialized);
        }
        write_allowed_token(&env, &allowed_token);
    }

    /// Creator opens a new ROSCA circle.
    pub fn create_circle(
        env: Env,
        creator: Address,
        token: Address,
        contribution_amount: i128,
        period_duration: u64,
        max_members: u32,
        min_trust_score: Option<u32>,
        join_deadline: Option<u64>,
    ) -> u32 {
        creator.require_auth();

        let allowed = read_allowed_token(&env).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::NotInitialized);
        });
        if token != allowed {
            panic_with_error!(&env, RoundChainError::InvalidToken);
        }

        if contribution_amount <= 0 {
            panic_with_error!(&env, RoundChainError::InvalidAmount);
        }
        if max_members < 2 || max_members > MAX_MEMBERS_CAP {
            panic_with_error!(&env, RoundChainError::InvalidMaxMembers);
        }
        if period_duration == 0 {
            panic_with_error!(&env, RoundChainError::InvalidPeriod);
        }

        let now = env.ledger().timestamp();
        let deadline = join_deadline.unwrap_or(now + DEFAULT_JOIN_WINDOW_SECS);
        if deadline <= now {
            panic_with_error!(&env, RoundChainError::InvalidPeriod);
        }

        let circle_id = read_next_circle_id(&env);
        write_next_circle_id(&env, circle_id + 1);

        let circle = CircleState {
            creator: creator.clone(),
            token,
            contribution_amount,
            period_duration,
            max_members,
            member_count: 0,
            current_round: 0,
            total_rounds: max_members,
            status: CircleStatus::Pending,
            payout_order: Vec::new(&env),
            next_payout_time: 0,
            min_trust_score,
            created_at: now,
            join_deadline: deadline,
            activated_at: 0,
        };

        write_circle(&env, circle_id, &circle);
        circle_id
    }

    /// Member joins a pending circle by depositing collateral ((max_members - 1) × contribution).
    /// Auto-starts when the last slot is filled.
    pub fn join_circle(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CircleNotPending);
        }
        if circle.member_count >= circle.max_members {
            panic_with_error!(&env, RoundChainError::CircleFull);
        }
        if member_exists(&env, circle_id, &member) {
            panic_with_error!(&env, RoundChainError::AlreadyMember);
        }

        let now = env.ledger().timestamp();
        if now > circle.join_deadline {
            panic_with_error!(&env, RoundChainError::JoinDeadlinePassed);
        }

        if let Some(min_score) = circle.min_trust_score {
            let trust = read_trust_score(&env, &member);
            if trust.score < min_score {
                panic_with_error!(&env, RoundChainError::InsufficientTrustScore);
            }
        }

        let collateral = collateral_amount(circle.contribution_amount, circle.max_members);
        let token_client = token::TokenClient::new(&env, &circle.token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &collateral,
        );

        let member_state = MemberState {
            address: member.clone(),
            collateral_deposited: collateral,
            contributions_paid: 0,
            has_received_payout: false,
            is_slashed: false,
            collateral_claimed: false,
            is_exited_clean: false,
            prepaid_rounds: 0,
            exit_at_round: 0,
            trust_settled: false,
        };
        write_member(&env, circle_id, &member_state);

        circle.payout_order.push_back(member);
        circle.member_count += 1;

        if circle.member_count == circle.max_members {
            Self::activate_circle(&env, &mut circle);
        }

        write_circle(&env, circle_id, &circle);
    }

    /// Member leaves a pending circle and receives a full collateral refund.
    pub fn leave_circle(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CircleNotPending);
        }
        if !member_exists(&env, circle_id, &member) {
            panic_with_error!(&env, RoundChainError::NotMember);
        }

        let member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        let refund = member_state.collateral_deposited;
        if refund > 0 {
            let token_client = token::TokenClient::new(&env, &circle.token);
            token_client.transfer(
                &env.current_contract_address(),
                &member,
                &refund,
            );
        }

        delete_member(&env, circle_id, &member);
        circle.payout_order = Self::remove_from_order(&env, &circle.payout_order, &member);
        circle.member_count -= 1;
        write_circle(&env, circle_id, &circle);
    }

    /// Permissionless recovery: activate a full pending circle if auto-start was skipped.
    pub fn start_circle(env: Env, circle_id: u32) {
        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CircleNotPending);
        }
        if circle.member_count < circle.max_members {
            panic_with_error!(&env, RoundChainError::NotEnoughMembers);
        }

        Self::activate_circle(&env, &mut circle);
        write_circle(&env, circle_id, &circle);
    }

    /// Cancel a pending circle after join_deadline (permissionless) or when empty (creator).
    pub fn cancel_circle(env: Env, circle_id: u32, caller: Address) {
        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CannotCancel);
        }

        let now = env.ledger().timestamp();
        let deadline_passed = now >= circle.join_deadline;

        if circle.member_count == 0 {
            if caller == circle.creator {
                caller.require_auth();
            } else {
                panic_with_error!(&env, RoundChainError::NotCreator);
            }
        } else if !deadline_passed {
            panic_with_error!(&env, RoundChainError::CannotCancel);
        }

        Self::refund_all_members(&env, circle_id, &circle, &circle.payout_order);

        circle.status = CircleStatus::Cancelled;
        circle.member_count = 0;
        circle.payout_order = Vec::new(&env);
        write_circle(&env, circle_id, &circle);
    }

    /// Voluntary exit before receiving payout — forfeits collateral (default).
    pub fn exit_circle(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        let member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if member_state.has_received_payout {
            panic_with_error!(&env, RoundChainError::UseCompleteExit);
        }

        if member_state.contributions_paid <= circle.current_round
            && env.ledger().timestamp() < circle.next_payout_time
        {
            panic_with_error!(&env, RoundChainError::CannotExitEarly);
        }

        Self::slash_member(&env, circle_id, &member, true);
    }

    /// Exit after receiving payout — prepay remaining rounds so others keep full pots.
    pub fn complete_exit(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Active {
            panic_with_error!(&env, RoundChainError::CircleNotActive);
        }

        let mut member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if member_state.is_slashed || member_state.is_exited_clean {
            panic_with_error!(&env, RoundChainError::MemberExited);
        }
        if !member_state.has_received_payout {
            panic_with_error!(&env, RoundChainError::NoPayoutReceived);
        }

        let remaining = circle.total_rounds.saturating_sub(circle.current_round);
        if remaining == 0 {
            panic_with_error!(&env, RoundChainError::MemberExited);
        }

        let settlement = circle.contribution_amount * (remaining as i128);
        let token_client = token::TokenClient::new(&env, &circle.token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &settlement,
        );

        member_state.is_exited_clean = true;
        member_state.prepaid_rounds = remaining;
        member_state.exit_at_round = circle.current_round;

        let collateral = member_state.collateral_deposited;
        if collateral > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &member,
                &collateral,
            );
            member_state.collateral_deposited = 0;
            member_state.collateral_claimed = true;
        }

        Self::apply_trust_completed(&env, &member);
        member_state.trust_settled = true;
        write_member(&env, circle_id, &member_state);
    }

    /// Member pays their contribution for the current round.
    pub fn contribute(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Active {
            panic_with_error!(&env, RoundChainError::CircleNotActive);
        }

        let mut member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if member_state.is_slashed || member_state.is_exited_clean {
            panic_with_error!(&env, RoundChainError::MemberExited);
        }
        if member_state.contributions_paid != circle.current_round {
            panic_with_error!(&env, RoundChainError::AlreadyContributed);
        }

        let token_client = token::TokenClient::new(&env, &circle.token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &circle.contribution_amount,
        );

        member_state.contributions_paid += 1;
        write_member(&env, circle_id, &member_state);
    }

    /// Distribute the round pot to the scheduled recipient.
    pub fn trigger_payout(env: Env, circle_id: u32) {
        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Active {
            panic_with_error!(&env, RoundChainError::CircleNotActive);
        }
        if env.ledger().timestamp() < circle.next_payout_time {
            panic_with_error!(&env, RoundChainError::PayoutTooEarly);
        }
        if !Self::all_active_paid(&env, circle_id, &circle) {
            panic_with_error!(&env, RoundChainError::NotAllContributed);
        }

        let recipient = circle
            .payout_order
            .get(circle.current_round)
            .unwrap_or_else(|| panic_with_error!(&env, RoundChainError::CircleNotFound));

        let mut recipient_state = read_member(&env, circle_id, &recipient).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if Self::member_is_active(&recipient_state)
            && recipient_state.contributions_paid <= circle.current_round
        {
            panic_with_error!(&env, RoundChainError::RecipientNotPaid);
        }

        let pot = Self::calculate_round_pot(&env, circle_id, &circle);
        let token_client = token::TokenClient::new(&env, &circle.token);

        if !Self::member_is_active(&recipient_state) {
            Self::distribute_equal(
                &env,
                circle_id,
                &circle,
                &token_client,
                pot,
                None,
                circle.current_round,
            );
        } else {
            if recipient_state.has_received_payout {
                panic_with_error!(&env, RoundChainError::AlreadyReceivedPayout);
            }
            token_client.transfer(
                &env.current_contract_address(),
                &recipient,
                &pot,
            );
            recipient_state.has_received_payout = true;
            write_member(&env, circle_id, &recipient_state);
        }

        circle.current_round += 1;

        if circle.current_round >= circle.total_rounds {
            circle.status = CircleStatus::Completed;
            Self::apply_circle_trust_scores(&env, circle_id, &circle);
            Self::auto_claim_collateral(&env, circle_id, &circle);
        } else {
            circle.next_payout_time =
                Self::round_deadline(&circle, circle.current_round);
        }

        write_circle(&env, circle_id, &circle);
    }

    /// Slash a defaulter's collateral and distribute it to other members.
    pub fn slash_defaulter(env: Env, circle_id: u32, member: Address) {
        Self::slash_member(&env, circle_id, &member, false);
    }

    /// Claim collateral back after the circle completes (fallback if auto-claim missed).
    pub fn claim_collateral(env: Env, circle_id: u32, member: Address) {
        member.require_auth();

        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Completed {
            panic_with_error!(&env, RoundChainError::CircleNotCompleted);
        }

        let mut member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if member_state.is_slashed || member_state.is_exited_clean {
            panic_with_error!(&env, RoundChainError::MemberExited);
        }
        if member_state.collateral_claimed {
            panic_with_error!(&env, RoundChainError::CollateralAlreadyClaimed);
        }

        let amount = member_state.collateral_deposited;
        if amount <= 0 {
            panic_with_error!(&env, RoundChainError::CollateralAlreadyClaimed);
        }

        let token_client = token::TokenClient::new(&env, &circle.token);
        token_client.transfer(
            &env.current_contract_address(),
            &member,
            &amount,
        );

        member_state.collateral_claimed = true;
        member_state.collateral_deposited = 0;
        write_member(&env, circle_id, &member_state);
    }

    pub fn get_trust_score(env: Env, address: Address) -> TrustScore {
        read_trust_score(&env, &address)
    }

    pub fn get_circle(env: Env, circle_id: u32) -> CircleState {
        read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        })
    }

    pub fn get_member(env: Env, circle_id: u32, member: Address) -> MemberState {
        read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        })
    }

    pub fn get_next_circle_id(env: Env) -> u32 {
        read_next_circle_id(&env)
    }

    pub fn get_contribution_status(env: Env, circle_id: u32, round: u32) -> Vec<ContributionEntry> {
        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        let mut result = Vec::new(&env);
        for addr in circle.payout_order.iter() {
            let member_state = read_member(&env, circle_id, &addr).unwrap_or_else(|_| {
                panic_with_error!(&env, RoundChainError::MemberNotFound);
            });
            let paid = Self::has_paid_round(&member_state, round);
            result.push_back(ContributionEntry {
                address: addr,
                paid,
            });
        }
        result
    }
}

impl RoundChainContract {
    fn member_is_active(state: &MemberState) -> bool {
        !state.is_slashed && !state.is_exited_clean
    }

    fn has_paid_round(state: &MemberState, round: u32) -> bool {
        if state.contributions_paid > round {
            return true;
        }
        if state.is_exited_clean && state.prepaid_rounds > 0 {
            return round >= state.exit_at_round && round < state.exit_at_round + state.prepaid_rounds;
        }
        false
    }

    fn round_deadline(circle: &CircleState, round: u32) -> u64 {
        circle.activated_at + circle.period_duration * (round as u64 + 1)
    }

    fn activate_circle(env: &Env, circle: &mut CircleState) {
        env.prng().shuffle(&mut circle.payout_order);
        let now = env.ledger().timestamp();
        circle.status = CircleStatus::Active;
        circle.current_round = 0;
        circle.activated_at = now;
        circle.next_payout_time = Self::round_deadline(circle, 0);
    }

    fn remove_from_order(env: &Env, order: &Vec<Address>, member: &Address) -> Vec<Address> {
        let mut next = Vec::new(env);
        for addr in order.iter() {
            if addr != *member {
                next.push_back(addr);
            }
        }
        next
    }

    fn refund_all_members(env: &Env, circle_id: u32, circle: &CircleState, members: &Vec<Address>) {
        let token_client = token::TokenClient::new(env, &circle.token);
        for addr in members.iter() {
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                let refund = member_state.collateral_deposited;
                if refund > 0 {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &addr,
                        &refund,
                    );
                }
                delete_member(env, circle_id, &addr);
            }
        }
    }

    fn all_active_paid(env: &Env, circle_id: u32, circle: &CircleState) -> bool {
        for addr in circle.payout_order.iter() {
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                if Self::member_is_active(&member_state)
                    && member_state.contributions_paid <= circle.current_round
                {
                    return false;
                }
            }
        }
        true
    }

    fn slash_member(env: &Env, circle_id: u32, member: &Address, voluntary: bool) {
        let circle = read_circle(env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Active {
            panic_with_error!(env, RoundChainError::CircleNotActive);
        }
        if !voluntary && env.ledger().timestamp() < circle.next_payout_time {
            panic_with_error!(env, RoundChainError::CannotSlash);
        }

        let mut member_state = read_member(env, circle_id, member).unwrap_or_else(|_| {
            panic_with_error!(env, RoundChainError::MemberNotFound);
        });

        if member_state.is_slashed || member_state.is_exited_clean {
            panic_with_error!(env, RoundChainError::MemberExited);
        }
        if !voluntary && member_state.contributions_paid > circle.current_round {
            panic_with_error!(env, RoundChainError::CannotSlash);
        }

        let collateral = member_state.collateral_deposited;
        if collateral <= 0 {
            panic_with_error!(env, RoundChainError::CannotSlash);
        }

        let token_client = token::TokenClient::new(env, &circle.token);
        Self::distribute_equal(
            env,
            circle_id,
            &circle,
            &token_client,
            collateral,
            Some(member),
            circle.current_round,
        );

        member_state.is_slashed = true;
        member_state.collateral_deposited = 0;
        if !member_state.trust_settled {
            Self::apply_trust_default(env, member);
            member_state.trust_settled = true;
        }
        write_member(env, circle_id, &member_state);
    }

    fn apply_trust_default(env: &Env, address: &Address) {
        let mut trust = read_trust_score(env, address);
        trust.circles_defaulted += 1;
        trust.score = compute_trust_score(trust.circles_completed, trust.circles_defaulted);
        write_trust_score(env, &trust);
    }

    fn apply_trust_completed(env: &Env, address: &Address) {
        let mut trust = read_trust_score(env, address);
        trust.circles_completed += 1;
        trust.score = compute_trust_score(trust.circles_completed, trust.circles_defaulted);
        write_trust_score(env, &trust);
    }

    fn apply_circle_trust_scores(env: &Env, circle_id: u32, circle: &CircleState) {
        for addr in circle.payout_order.iter() {
            if let Ok(mut member_state) = read_member(env, circle_id, &addr) {
                if member_state.trust_settled {
                    continue;
                }
                if member_state.is_slashed {
                    Self::apply_trust_default(env, &addr);
                } else {
                    Self::apply_trust_completed(env, &addr);
                }
                member_state.trust_settled = true;
                write_member(env, circle_id, &member_state);
            }
        }
    }

    fn auto_claim_collateral(env: &Env, circle_id: u32, circle: &CircleState) {
        let token_client = token::TokenClient::new(env, &circle.token);
        for addr in circle.payout_order.iter() {
            if let Ok(mut member_state) = read_member(env, circle_id, &addr) {
                if !Self::member_is_active(&member_state) || member_state.collateral_claimed {
                    continue;
                }
                let amount = member_state.collateral_deposited;
                if amount <= 0 {
                    continue;
                }
                token_client.transfer(
                    &env.current_contract_address(),
                    &addr,
                    &amount,
                );
                member_state.collateral_claimed = true;
                member_state.collateral_deposited = 0;
                write_member(env, circle_id, &member_state);
            }
        }
    }

    fn calculate_round_pot(env: &Env, circle_id: u32, circle: &CircleState) -> i128 {
        let len = circle.payout_order.len();
        if len <= 1 {
            return 0;
        }

        let mut pot: i128 = 0;
        for i in 0..len {
            if i == circle.current_round {
                continue;
            }
            let addr = circle
                .payout_order
                .get(i)
                .unwrap_or_else(|| panic_with_error!(env, RoundChainError::CircleNotFound));
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                if Self::has_paid_round(&member_state, circle.current_round) {
                    pot += circle.contribution_amount;
                }
            }
        }

        // When all active obligations are met, remaining members receive a full ROSCA pot
        // ((n - 1) × contribution) — prepaid complete_exit settlements cover any shortfall.
        let full_pot = (len as i128 - 1) * circle.contribution_amount;
        if pot < full_pot && Self::all_active_paid(env, circle_id, circle) {
            pot = full_pot;
        }

        pot
    }

    fn active_members(
        env: &Env,
        circle_id: u32,
        circle: &CircleState,
        exclude: Option<&Address>,
    ) -> Vec<Address> {
        let mut members = Vec::new(env);
        for addr in circle.payout_order.iter() {
            if let Some(excluded) = exclude {
                if excluded == &addr {
                    continue;
                }
            }
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                if Self::member_is_active(&member_state) {
                    members.push_back(addr);
                }
            }
        }
        members
    }

    fn distribute_equal(
        env: &Env,
        circle_id: u32,
        circle: &CircleState,
        token_client: &token::TokenClient,
        amount: i128,
        exclude: Option<&Address>,
        round_index: u32,
    ) {
        let recipients = Self::active_members(env, circle_id, circle, exclude);
        let recipient_count = recipients.len() as usize;
        if recipient_count == 0 || amount <= 0 {
            return;
        }

        let share = amount / recipient_count as i128;
        let remainder = amount - share * recipient_count as i128;
        let start = (round_index as usize) % recipient_count;

        for offset in 0..recipient_count as u32 {
            let i = (start + offset as usize) % recipient_count;
            let recipient = recipients.get(i as u32).unwrap();
            let extra = if (offset as i128) < remainder { 1 } else { 0 };
            let payout = share + extra;
            if payout > 0 {
                token_client.transfer(
                    &env.current_contract_address(),
                    &recipient,
                    &payout,
                );
            }
        }
    }
}

mod test;
