use soroban_sdk::{contracttype, Address, Vec};

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
