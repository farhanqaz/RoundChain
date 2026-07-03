use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RoundChainError {
    CircleNotFound = 1,
    MemberNotFound = 2,
    CircleFull = 3,
    CircleNotPending = 4,
    CircleNotActive = 5,
    CircleNotCompleted = 6,
    NotAdmin = 7,
    AlreadyMember = 8,
    NotEnoughMembers = 9,
    AlreadyContributed = 10,
    MemberSlashed = 11,
    PayoutTooEarly = 12,
    CannotSlash = 13,
    AlreadySlashed = 14,
    CollateralAlreadyClaimed = 15,
    InvalidAmount = 16,
    InvalidMaxMembers = 17,
    InvalidPeriod = 18,
    AlreadyReceivedPayout = 19,
}
