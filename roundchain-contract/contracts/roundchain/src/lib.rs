#![no_std]

mod error;
mod storage;
mod types;

use error::RoundChainError;
use soroban_sdk::{
    contract, contractimpl, panic_with_error, token, Address, Env, Vec,
};
use storage::{
    member_exists, read_circle, read_member, read_next_circle_id, write_circle, write_member,
    write_next_circle_id,
};
use types::{CircleState, CircleStatus, ContributionEntry, MemberState};

#[contract]
pub struct RoundChainContract;

#[contractimpl]
impl RoundChainContract {
    /// Admin creates a new ROSCA circle.
    pub fn create_circle(
        env: Env,
        admin: Address,
        token: Address,
        contribution_amount: i128,
        period_duration: u64,
        max_members: u32,
    ) -> u32 {
        admin.require_auth();

        if contribution_amount <= 0 {
            panic_with_error!(&env, RoundChainError::InvalidAmount);
        }
        if max_members < 2 {
            panic_with_error!(&env, RoundChainError::InvalidMaxMembers);
        }
        if period_duration == 0 {
            panic_with_error!(&env, RoundChainError::InvalidPeriod);
        }

        let circle_id = read_next_circle_id(&env);
        write_next_circle_id(&env, circle_id + 1);

        let circle = CircleState {
            admin: admin.clone(),
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
        };

        write_circle(&env, circle_id, &circle);
        circle_id
    }

    /// Member joins a pending circle by depositing collateral (1x contribution).
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
        write_circle(&env, circle_id, &circle);
    }

    /// Admin starts the circle once all member slots are filled.
    pub fn start_circle(env: Env, circle_id: u32) {
        let mut circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        circle.admin.require_auth();

        if circle.status != CircleStatus::Pending {
            panic_with_error!(&env, RoundChainError::CircleNotPending);
        }
        if circle.member_count < circle.max_members {
            panic_with_error!(&env, RoundChainError::NotEnoughMembers);
        }

        env.prng().shuffle(&mut circle.payout_order);

        circle.status = CircleStatus::Active;
        circle.current_round = 0;
        circle.next_payout_time = env.ledger().timestamp() + circle.period_duration;
        write_circle(&env, circle_id, &circle);
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

        let recipient = circle
            .payout_order
            .get(circle.current_round)
            .unwrap_or_else(|| panic_with_error!(&env, RoundChainError::CircleNotFound));

        let mut recipient_state = read_member(&env, circle_id, &recipient).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

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
        } else {
            circle.next_payout_time = env.ledger().timestamp() + circle.period_duration;
        }

        write_circle(&env, circle_id, &circle);
    }

    /// Slash a defaulter's collateral and distribute it to other members.
    pub fn slash_defaulter(env: Env, circle_id: u32, member: Address) {
        let circle = read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        });

        if circle.status != CircleStatus::Active {
            panic_with_error!(&env, RoundChainError::CircleNotActive);
        }
        if env.ledger().timestamp() < circle.next_payout_time {
            panic_with_error!(&env, RoundChainError::CannotSlash);
        }

        let mut member_state = read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        });

        if member_state.is_slashed {
            panic_with_error!(&env, RoundChainError::AlreadySlashed);
        }
        if member_state.contributions_paid > circle.current_round {
            panic_with_error!(&env, RoundChainError::CannotSlash);
        }

        let collateral = member_state.collateral_deposited;
        if collateral <= 0 {
            panic_with_error!(&env, RoundChainError::CannotSlash);
        }

        let token_client = token::TokenClient::new(&env, &circle.token);
        Self::distribute_equal(
            &env,
            circle_id,
            &circle,
            &token_client,
            collateral,
            Some(&member),
        );

        member_state.is_slashed = true;
        member_state.collateral_deposited = 0;
        write_member(&env, circle_id, &member_state);
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

    /// View: get circle state.
    pub fn get_circle(env: Env, circle_id: u32) -> CircleState {
        read_circle(&env, circle_id).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::CircleNotFound);
        })
    }

    /// View: get member state.
    pub fn get_member(env: Env, circle_id: u32, member: Address) -> MemberState {
        read_member(&env, circle_id, &member).unwrap_or_else(|_| {
            panic_with_error!(&env, RoundChainError::MemberNotFound);
        })
    }

    /// View: next circle ID (total circles created + 1).
    pub fn get_next_circle_id(env: Env) -> u32 {
        read_next_circle_id(&env)
    }

    /// View: contribution status for a given round.
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
