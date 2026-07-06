#![no_std]

mod error;
mod storage;
mod types;

use error::RoundChainError;
use soroban_sdk::{
    contract, contractimpl, panic_with_error, token, Address, Env, Vec,
};
use storage::{
    delete_member, member_exists, read_circle, read_member, read_next_circle_id, read_trust_score,
    write_circle, write_member, write_next_circle_id, write_trust_score,
};
use types::{
    compute_trust_score, CircleState, CircleStatus, ContributionEntry, MemberState, TrustScore,
};

#[contract]
pub struct RoundChainContract;

#[contractimpl]
impl RoundChainContract {
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

        if contribution_amount <= 0 {
            panic_with_error!(&env, RoundChainError::InvalidAmount);
        }
        if max_members < 2 {
            panic_with_error!(&env, RoundChainError::InvalidMaxMembers);
        }
        if period_duration == 0 {
            panic_with_error!(&env, RoundChainError::InvalidPeriod);
        }

        let now = env.ledger().timestamp();
        if let Some(deadline) = join_deadline {
            if deadline <= now {
                panic_with_error!(&env, RoundChainError::InvalidPeriod);
            }
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
            join_deadline,
        };

        write_circle(&env, circle_id, &circle);
        circle_id
    }

    /// Member joins a pending circle by depositing collateral (1x contribution).
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
        if let Some(deadline) = circle.join_deadline {
            if now > deadline {
                panic_with_error!(&env, RoundChainError::JoinDeadlinePassed);
            }
        }

        if let Some(min_score) = circle.min_trust_score {
            let trust = read_trust_score(&env, &member);
            if trust.score < min_score {
                panic_with_error!(&env, RoundChainError::InsufficientTrustScore);
            }
        }

        let collateral = circle.contribution_amount;
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

    /// Cancel a pending circle. Creator anytime; anyone after join_deadline.
    pub fn cancel_circle(env: Env, circle_id: u32, caller: Address) {
        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CannotCancel);
        }

        let now = env.ledger().timestamp();
        let deadline_passed = circle
            .join_deadline
            .map(|d| now >= d)
            .unwrap_or(false);

        if caller == circle.creator {
            caller.require_auth();
        } else if !deadline_passed {
            panic_with_error!(&env, RoundChainError::NotCreator);
        }

        Self::refund_all_members(&env, circle_id, &circle, &circle.payout_order);

        circle.status = CircleStatus::Cancelled;
        circle.member_count = 0;
        circle.payout_order = Vec::new(&env);
        write_circle(&env, circle_id, &circle);
    }

    /// Voluntary exit during an active circle — forfeits collateral like a default.
    pub fn exit_circle(env: Env, circle_id: u32, member: Address) {
        member.require_auth();
        Self::slash_member(&env, circle_id, &member, true);
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

        if member_state.is_slashed {
            panic_with_error!(&env, RoundChainError::MemberSlashed);
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
        if !Self::all_non_slashed_paid(&env, circle_id, &circle) {
            panic_with_error!(&env, RoundChainError::NotAllContributed);
        }

        let recipient = circle
            .payout_order
            .get(circle.current_round)
            .unwrap_or_else(|| panic_with_error!(&env, RoundChainError::CircleNotFound));

        let mut recipient_state = read_member(&env, circle_id, &recipient).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if !recipient_state.is_slashed
            && recipient_state.contributions_paid <= circle.current_round
        {
            panic_with_error!(&env, RoundChainError::RecipientNotPaid);
        }

        let pot = Self::calculate_round_pot(&env, circle_id, &circle);
        let token_client = token::TokenClient::new(&env, &circle.token);

        if recipient_state.is_slashed {
            Self::distribute_equal(
                &env,
                circle_id,
                &circle,
                &token_client,
                pot,
                None,
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
        } else {
            circle.next_payout_time = env.ledger().timestamp() + circle.period_duration;
        }

        write_circle(&env, circle_id, &circle);
    }

    /// Slash a defaulter's collateral and distribute it to other members.
    pub fn slash_defaulter(env: Env, circle_id: u32, member: Address) {
        Self::slash_member(&env, circle_id, &member, false);
    }

    /// Claim collateral back after the circle completes.
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

        if member_state.is_slashed {
            panic_with_error!(&env, RoundChainError::MemberSlashed);
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
            let paid = member_state.contributions_paid > round;
            result.push_back(ContributionEntry {
                address: addr,
                paid,
            });
        }
        result
    }
}

impl RoundChainContract {
    fn activate_circle(env: &Env, circle: &mut CircleState) {
        env.prng().shuffle(&mut circle.payout_order);
        circle.status = CircleStatus::Active;
        circle.current_round = 0;
        circle.next_payout_time = env.ledger().timestamp() + circle.period_duration;
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

    fn all_non_slashed_paid(env: &Env, circle_id: u32, circle: &CircleState) -> bool {
        for addr in circle.payout_order.iter() {
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                if !member_state.is_slashed
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

        if member_state.is_slashed {
            panic_with_error!(env, RoundChainError::AlreadySlashed);
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
        );

        member_state.is_slashed = true;
        member_state.collateral_deposited = 0;
        write_member(env, circle_id, &member_state);
    }

    fn apply_circle_trust_scores(env: &Env, circle_id: u32, circle: &CircleState) {
        for addr in circle.payout_order.iter() {
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                let mut trust = read_trust_score(env, &addr);
                if member_state.is_slashed {
                    trust.circles_defaulted += 1;
                } else {
                    trust.circles_completed += 1;
                }
                trust.score = compute_trust_score(trust.circles_completed, trust.circles_defaulted);
                write_trust_score(env, &trust);
            }
        }
    }

    fn calculate_round_pot(env: &Env, circle_id: u32, circle: &CircleState) -> i128 {
        let mut pot: i128 = 0;
        for addr in circle.payout_order.iter() {
            if let Ok(member_state) = read_member(env, circle_id, &addr) {
                if !member_state.is_slashed
                    && member_state.contributions_paid > circle.current_round
                {
                    pot += circle.contribution_amount;
                }
            }
        }
        pot
    }

    fn non_slashed_members(
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
                if !member_state.is_slashed {
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
    ) {
        let recipients = Self::non_slashed_members(env, circle_id, circle, exclude);
        let recipient_count = recipients.len();
        if recipient_count == 0 || amount <= 0 {
            return;
        }

        let share = amount / recipient_count as i128;
        let remainder = amount - share * recipient_count as i128;

        for (i, recipient) in recipients.iter().enumerate() {
            let payout = if i == 0 {
                share + remainder
            } else {
                share
            };
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
