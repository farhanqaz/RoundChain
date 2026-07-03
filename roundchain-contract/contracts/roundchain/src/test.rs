#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

const CONTRIBUTION: i128 = 10_000_000;
const PERIOD: u64 = 604_800;
const NO_MIN_TRUST: Option<u32> = None;

struct TestSetup<'a> {
    env: Env,
    contract_id: Address,
    client: RoundChainContractClient<'a>,
    token: Address,
    token_admin: StellarAssetClient<'a>,
    admin: Address,
}

fn setup() -> TestSetup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token);

    let contract_id = env.register(RoundChainContract, ());
    let client = RoundChainContractClient::new(&env, &contract_id);

    TestSetup {
        env,
        contract_id,
        client,
        token,
        token_admin,
        admin,
    }
}

fn fund_member(token_admin: &StellarAssetClient, member: &Address, amount: i128) {
    token_admin.mint(member, &amount);
}

fn create_and_fill_circle(
    setup: &TestSetup,
    max_members: u32,
) -> (u32, soroban_sdk::Vec<Address>) {
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &max_members,
        &NO_MIN_TRUST,
    );

    let mut members = soroban_sdk::Vec::new(&setup.env);
    for _ in 0..max_members {
        let member = Address::generate(&setup.env);
        fund_member(
            &setup.token_admin,
            &member,
            CONTRIBUTION * (max_members as i128 + 2),
        );
        setup.client.join_circle(&circle_id, &member);
        members.push_back(member);
    }

    setup.client.start_circle(&circle_id);
    (circle_id, members)
}

#[test]
fn test_create_circle() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
    );

    assert_eq!(circle_id, 1);
    let circle = setup.client.get_circle(&circle_id);
    assert_eq!(circle.admin, setup.admin);
    assert_eq!(circle.contribution_amount, CONTRIBUTION);
    assert_eq!(circle.max_members, 3);
    assert_eq!(circle.member_count, 0);
    assert_eq!(circle.status, CircleStatus::Pending);
    assert_eq!(circle.min_trust_score, None);
}

#[test]
fn test_join_circle_deposits_collateral() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, CONTRIBUTION * 5);
    setup.client.join_circle(&circle_id, &member);

    let member_state = setup.client.get_member(&circle_id, &member);
    assert_eq!(member_state.collateral_deposited, CONTRIBUTION);
    assert!(!member_state.is_slashed);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    assert_eq!(token_client.balance(&setup.contract_id), CONTRIBUTION);
}

#[test]
fn test_start_circle_requires_full() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &NO_MIN_TRUST,
    );

    let m1 = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &m1, CONTRIBUTION * 5);
    setup.client.join_circle(&circle_id, &m1);

    let result = setup.client.try_start_circle(&circle_id);
    assert!(result.is_err());
}

#[test]
fn test_payout_order_shuffled_on_start() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &4,
        &NO_MIN_TRUST,
    );

    let mut members = soroban_sdk::Vec::new(&setup.env);
    for _ in 0..4 {
        let member = Address::generate(&setup.env);
        fund_member(&setup.token_admin, &member, CONTRIBUTION * 10);
        setup.client.join_circle(&circle_id, &member);
        members.push_back(member.clone());
    }

    let pending = setup.client.get_circle(&circle_id);
    for i in 0..4 {
        assert_eq!(pending.payout_order.get(i).unwrap(), members.get(i).unwrap());
    }

    setup.client.start_circle(&circle_id);

    let active = setup.client.get_circle(&circle_id);
    assert_eq!(active.payout_order.len(), 4);

    let mut seen = 0u32;
    for member in members.iter() {
        for i in 0..4 {
            if active.payout_order.get(i).unwrap() == member {
                seen += 1;
                break;
            }
        }
    }
    assert_eq!(seen, 4);
}

#[test]
fn test_contribute_and_payout() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let token_client = TokenClient::new(&setup.env, &setup.token);

    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }

    setup.env.ledger().set_timestamp(PERIOD + 1);

    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();
    let balance_before = token_client.balance(&recipient);

    setup.client.trigger_payout(&circle_id);

    let expected_pot = CONTRIBUTION * 3;
    assert_eq!(
        token_client.balance(&recipient) - balance_before,
        expected_pot
    );

    let circle = setup.client.get_circle(&circle_id);
    assert_eq!(circle.current_round, 1);

    let recipient_state = setup.client.get_member(&circle_id, &recipient);
    assert!(recipient_state.has_received_payout);
}

#[test]
fn test_slash_defaulter() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let defaulter = members.get(1).unwrap();
    let payer1 = members.get(0).unwrap();
    let payer2 = members.get(2).unwrap();

    setup.client.contribute(&circle_id, &payer1);
    setup.client.contribute(&circle_id, &payer2);

    setup.env.ledger().set_timestamp(PERIOD + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let bal1_before = token_client.balance(&payer1);
    let bal2_before = token_client.balance(&payer2);

    setup.client.slash_defaulter(&circle_id, &defaulter);

    let defaulter_state = setup.client.get_member(&circle_id, &defaulter);
    assert!(defaulter_state.is_slashed);
    assert_eq!(defaulter_state.collateral_deposited, 0);

    let total_received = (token_client.balance(&payer1) - bal1_before)
        + (token_client.balance(&payer2) - bal2_before);
    assert_eq!(total_received, CONTRIBUTION);
}

#[test]
fn test_full_cycle_completion() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 2);

    let token_client = TokenClient::new(&setup.env, &setup.token);

    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD + 1);
    setup.client.trigger_payout(&circle_id);

    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD * 2 + 2);
    setup.client.trigger_payout(&circle_id);

    let circle = setup.client.get_circle(&circle_id);
    assert_eq!(circle.status, CircleStatus::Completed);

    for member in members.iter() {
        let bal_before = token_client.balance(&member);
        setup.client.claim_collateral(&circle_id, &member);
        assert_eq!(
            token_client.balance(&member) - bal_before,
            CONTRIBUTION
        );
    }
}

#[test]
fn test_get_contribution_status() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    setup.client.contribute(&circle_id, &members.get(0).unwrap());
    setup.client.contribute(&circle_id, &members.get(1).unwrap());

    let m0 = members.get(0).unwrap();
    let m1 = members.get(1).unwrap();

    let status = setup.client.get_contribution_status(&circle_id, &0);
    assert_eq!(status.len(), 3);
    for entry in status.iter() {
        let paid = entry.address == m0 || entry.address == m1;
        assert_eq!(entry.paid, paid, "unexpected paid flag for member");
    }
}

#[test]
fn test_get_next_circle_id() {
    let setup = setup();
    assert_eq!(setup.client.get_next_circle_id(), 1);

    setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
    );
    assert_eq!(setup.client.get_next_circle_id(), 2);
}

#[test]
fn test_create_multiple_circles() {
    let setup = setup();
    let id1 = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
    );
    let id2 = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &NO_MIN_TRUST,
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
}

#[test]
fn test_trust_score_starts_at_zero() {
    let setup = setup();
    let member = Address::generate(&setup.env);
    let trust = setup.client.get_trust_score(&member);
    assert_eq!(trust.score, 0);
    assert_eq!(trust.circles_completed, 0);
    assert_eq!(trust.circles_defaulted, 0);
}

#[test]
fn test_join_rejected_insufficient_trust() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &Some(10),
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, CONTRIBUTION * 5);

    let result = setup.client.try_join_circle(&circle_id, &member);
    assert!(result.is_err());
}

#[test]
fn test_trust_score_awarded_on_clean_completion() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 2);

    let token_client = TokenClient::new(&setup.env, &setup.token);

    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD + 1);
    setup.client.trigger_payout(&circle_id);

    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD * 2 + 2);
    setup.client.trigger_payout(&circle_id);

    for member in members.iter() {
        let trust = setup.client.get_trust_score(&member);
        assert_eq!(trust.circles_completed, 1);
        assert_eq!(trust.circles_defaulted, 0);
        assert_eq!(trust.score, 10);

        let bal_before = token_client.balance(&member);
        setup.client.claim_collateral(&circle_id, &member);
        assert_eq!(
            token_client.balance(&member) - bal_before,
            CONTRIBUTION
        );
    }
}

#[test]
fn test_trust_score_penalizes_default() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let defaulter = members.get(1).unwrap();
    let payer1 = members.get(0).unwrap();
    let payer2 = members.get(2).unwrap();

    setup.client.contribute(&circle_id, &payer1);
    setup.client.contribute(&circle_id, &payer2);
    setup.env.ledger().set_timestamp(PERIOD + 1);
    setup.client.slash_defaulter(&circle_id, &defaulter);
    setup.client.trigger_payout(&circle_id);

    for member in members.iter() {
        if member == defaulter {
            continue;
        }
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD * 2 + 2);
    setup.client.trigger_payout(&circle_id);

    for member in members.iter() {
        if member == defaulter {
            continue;
        }
        setup.client.contribute(&circle_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD * 3 + 3);
    setup.client.trigger_payout(&circle_id);

    let defaulter_trust = setup.client.get_trust_score(&defaulter);
    assert_eq!(defaulter_trust.circles_defaulted, 1);
    assert_eq!(defaulter_trust.circles_completed, 0);
    assert_eq!(defaulter_trust.score, 0);

    let payer_trust = setup.client.get_trust_score(&payer1);
    assert_eq!(payer_trust.circles_completed, 1);
    assert_eq!(payer_trust.score, 10);
}

#[test]
fn test_join_allowed_with_sufficient_trust() {
    let setup = setup();
    let (completed_id, completed_members) = create_and_fill_circle(&setup, 2);
    let token_client = TokenClient::new(&setup.env, &setup.token);

    for member in completed_members.iter() {
        setup.client.contribute(&completed_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD + 1);
    setup.client.trigger_payout(&completed_id);

    for member in completed_members.iter() {
        setup.client.contribute(&completed_id, &member);
    }
    setup.env.ledger().set_timestamp(PERIOD * 2 + 2);
    setup.client.trigger_payout(&completed_id);

    for member in completed_members.iter() {
        setup.client.claim_collateral(&completed_id, &member);
    }

    let veteran = completed_members.get(0).unwrap();
    let trust = setup.client.get_trust_score(&veteran);
    assert_eq!(trust.score, 10);

    let gated_id = setup.client.create_circle(
        &setup.admin,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &Some(10),
    );

    fund_member(&setup.token_admin, &veteran, CONTRIBUTION * 5);
    setup.client.join_circle(&gated_id, &veteran);

    let circle = setup.client.get_circle(&gated_id);
    assert_eq!(circle.member_count, 1);
    assert_eq!(token_client.balance(&setup.contract_id), CONTRIBUTION);
}
