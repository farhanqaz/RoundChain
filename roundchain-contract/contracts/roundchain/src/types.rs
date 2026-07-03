use soroban_sdk::{contracttype, Address, Vec};

pub const TRUST_POINTS_COMPLETED: u32 = 10;
pub const TRUST_PENALTY_DEFAULTED: u32 = 25;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CircleStatus {
    Pending,
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircleState {
    pub admin: Address,
    pub token: Address,
    pub contribution_amount: i128,
    pub period_duration: u64,
    pub max_members: u32,
    pub member_count: u32,
    pub current_round: u32,
    pub total_rounds: u32,
    pub status: CircleStatus,
    pub payout_order: Vec<Address>,
    pub next_payout_time: u64,
    pub min_trust_score: Option<u32>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TrustScore {
    pub address: Address,
    pub circles_completed: u32,
    pub circles_defaulted: u32,
    pub score: u32,
}

pub fn compute_trust_score(circles_completed: u32, circles_defaulted: u32) -> u32 {
    let raw = (circles_completed as i64) * TRUST_POINTS_COMPLETED as i64
        - (circles_defaulted as i64) * TRUST_PENALTY_DEFAULTED as i64;
    raw.max(0) as u32
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MemberState {
    pub address: Address,
    pub collateral_deposited: i128,
    pub contributions_paid: u32,
    pub has_received_payout: bool,
    pub is_slashed: bool,
    pub collateral_claimed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContributionEntry {
    pub address: Address,
    pub paid: bool,
}
