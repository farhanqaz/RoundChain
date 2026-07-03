use soroban_sdk::{Address, Env};

use crate::error::RoundChainError;
use crate::types::{CircleState, MemberState, TrustScore};

#[derive(Clone)]
#[soroban_sdk::contracttype]
pub enum DataKey {
    NextCircleId,
    Circle(u32),
    Member(u32, Address),
    TrustScore(Address),
}

pub fn read_next_circle_id(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::NextCircleId)
        .unwrap_or(1)
}

pub fn write_next_circle_id(env: &Env, id: u32) {
    env.storage()
        .instance()
        .set(&DataKey::NextCircleId, &id);
}

pub fn read_circle(env: &Env, circle_id: u32) -> Result<CircleState, RoundChainError> {
    env.storage()
        .persistent()
        .get(&DataKey::Circle(circle_id))
        .ok_or(RoundChainError::CircleNotFound)
}

pub fn write_circle(env: &Env, circle_id: u32, circle: &CircleState) {
    env.storage()
        .persistent()
        .set(&DataKey::Circle(circle_id), circle);
}

pub fn read_member(
    env: &Env,
    circle_id: u32,
    member: &Address,
) -> Result<MemberState, RoundChainError> {
    env.storage()
        .persistent()
        .get(&DataKey::Member(circle_id, member.clone()))
        .ok_or(RoundChainError::MemberNotFound)
}

pub fn write_member(env: &Env, circle_id: u32, member: &MemberState) {
    env.storage().persistent().set(
        &DataKey::Member(circle_id, member.address.clone()),
        member,
    );
}

pub fn member_exists(env: &Env, circle_id: u32, member: &Address) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Member(circle_id, member.clone()))
}

pub fn read_trust_score(env: &Env, address: &Address) -> TrustScore {
    env.storage()
        .persistent()
        .get(&DataKey::TrustScore(address.clone()))
        .unwrap_or(TrustScore {
            address: address.clone(),
            circles_completed: 0,
            circles_defaulted: 0,
            score: 0,
        })
}

pub fn write_trust_score(env: &Env, trust: &TrustScore) {
    env.storage()
        .persistent()
        .set(&DataKey::TrustScore(trust.address.clone()), trust);
}
