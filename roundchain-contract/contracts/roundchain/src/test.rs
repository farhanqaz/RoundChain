#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};
use types::collateral_amount;

const CONTRIBUTION: i128 = 10_000_000;
const PERIOD: u64 = 604_800;
const NO_MIN_TRUST: Option<u32> = None;

struct TestSetup<'a> {
    env: Env,
    contract_id: Address,
    client: RoundChainContractClient<'a>,
    token: Address,
    token_admin: StellarAssetClient<'a>,
    creator: Address,
}

fn setup() -> TestSetup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let creator = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(creator.clone());
    let token = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token);

    let contract_id = env.register(RoundChainContract, ());
    let client = RoundChainContractClient::new(&env, &contract_id);
    client.init(&token);

    TestSetup {
        env,
        contract_id,
        client,
        token,
        token_admin,
        creator,
    }
}

fn fund_member(token_admin: &StellarAssetClient, member: &Address, amount: i128) {
    token_admin.mint(member, &amount);
}

fn default_deadline(env: &Env) -> u64 {
    env.ledger().timestamp() + types::DEFAULT_JOIN_WINDOW_SECS
}

fn member_budget(max_members: u32) -> i128 {
    let collateral = collateral_amount(CONTRIBUTION, max_members);
    collateral + CONTRIBUTION * (max_members as i128 + 4)
}

fn create_and_fill_circle(
    setup: &TestSetup,
    max_members: u32,
) -> (u32, soroban_sdk::Vec<Address>) {
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &max_members,
        &NO_MIN_TRUST,
        &Some(default_deadline(&setup.env)),
    );

    let mut members = soroban_sdk::Vec::new(&setup.env);
    for _ in 0..max_members {
        let member = Address::generate(&setup.env);
        fund_member(
            &setup.token_admin,
            &member,
            member_budget(max_members),
        );
        setup.client.join_circle(&circle_id, &member);
        members.push_back(member);
    }

    let circle = setup.client.get_circle(&circle_id);
    assert_eq!(circle.status, CircleStatus::Active);

    (circle_id, members)
}

fn run_full_round(
    setup: &TestSetup,
    circle_id: u32,
    members: &soroban_sdk::Vec<Address>,
    round: u32,
) {
    for member in members.iter() {
        let state = setup.client.get_member(&circle_id, &member);
        if !state.is_slashed && !state.is_exited_clean {
            setup.client.contribute(&circle_id, &member);
        }
    }
    let circle = setup.client.get_circle(&circle_id);
    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD * (round as u64 + 1) + 1);
    setup.client.trigger_payout(&circle_id);
}

#[test]
fn test_create_circle() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
        &Some(default_deadline(&setup.env)),
    );

    assert_eq!(circle_id, 1);
    let circle = setup.client.get_circle(&circle_id);
    assert_eq!(circle.creator, setup.creator);
    assert_eq!(circle.contribution_amount, CONTRIBUTION);
    assert_eq!(circle.max_members, 3);
    assert_eq!(circle.member_count, 0);
    assert_eq!(circle.status, CircleStatus::Pending);
    assert!(circle.join_deadline > 0);
}

#[test]
fn test_join_circle_deposits_collateral() {
    let setup = setup();
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
        &Some(default_deadline(&setup.env)),
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, member_budget(3));
    setup.client.join_circle(&circle_id, &member);

    let expected = collateral_amount(CONTRIBUTION, 3);
    let member_state = setup.client.get_member(&circle_id, &member);
    assert_eq!(member_state.collateral_deposited, expected);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    assert_eq!(token_client.balance(&setup.contract_id), expected);
}

#[test]
fn test_contribute_and_payout() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    for member in members.iter() {
        setup.client.contribute(&circle_id, &member);
    }

    let circle = setup.client.get_circle(&circle_id);
    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    let recipient = circle.payout_order.get(0).unwrap();
    let balance_before = token_client.balance(&recipient);

    setup.client.trigger_payout(&circle_id);

    let expected_pot = CONTRIBUTION * 2;
    assert_eq!(
        token_client.balance(&recipient) - balance_before,
        expected_pot
    );
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

    let circle = setup.client.get_circle(&circle_id);
    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let bal1_before = token_client.balance(&payer1);
    let bal2_before = token_client.balance(&payer2);

    setup.client.slash_defaulter(&circle_id, &defaulter);

    assert!(setup.client.get_member(&circle_id, &defaulter).is_slashed);
    assert_eq!(setup.client.get_trust_score(&defaulter).circles_defaulted, 1);

    let expected_collateral = collateral_amount(CONTRIBUTION, 3);
    let total_received = (token_client.balance(&payer1) - bal1_before)
        + (token_client.balance(&payer2) - bal2_before);
    assert_eq!(total_received, expected_collateral);
}

#[test]
fn test_full_cycle_completion_auto_claim() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 2);

    run_full_round(&setup, circle_id, &members, 0);
    run_full_round(&setup, circle_id, &members, 1);

    assert_eq!(
        setup.client.get_circle(&circle_id).status,
        CircleStatus::Completed
    );

    for member in members.iter() {
        let state = setup.client.get_member(&circle_id, &member);
        assert!(state.collateral_claimed);
        assert!(state.trust_settled);
    }
}

#[test]
fn test_complete_exit_prepays_remaining() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    run_full_round(&setup, circle_id, &members, 0);

    let circle = setup.client.get_circle(&circle_id);
    let early = circle.payout_order.get(0).unwrap();
    assert!(setup.client.get_member(&circle_id, &early).has_received_payout);

    setup.client.complete_exit(&circle_id, &early);

    let after_state = setup.client.get_member(&circle_id, &early);
    assert!(after_state.is_exited_clean);
    assert_eq!(after_state.prepaid_rounds, 2);
    assert_eq!(after_state.exit_at_round, 1);
    assert_eq!(setup.client.get_trust_score(&early).circles_completed, 1);

    run_full_round(&setup, circle_id, &members, 1);

    assert_eq!(setup.client.get_circle(&circle_id).current_round, 2);
}

#[test]
fn test_creator_cannot_cancel_with_members_before_deadline() {
    let setup = setup();
    let deadline = setup.env.ledger().timestamp() + 10_000;
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &NO_MIN_TRUST,
        &Some(deadline),
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, member_budget(2));
    setup.client.join_circle(&circle_id, &member);

    assert!(setup
        .client
        .try_cancel_circle(&circle_id, &setup.creator)
        .is_err());
}

#[test]
fn test_cancel_after_deadline() {
    let setup = setup();
    let deadline = setup.env.ledger().timestamp() + 100;
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &2,
        &NO_MIN_TRUST,
        &Some(deadline),
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, member_budget(2));
    setup.client.join_circle(&circle_id, &member);

    setup.env.ledger().set_timestamp(deadline + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let bal_before = token_client.balance(&member);
    let anyone = Address::generate(&setup.env);

    setup.client.cancel_circle(&circle_id, &anyone);

    assert_eq!(
        token_client.balance(&member) - bal_before,
        collateral_amount(CONTRIBUTION, 2)
    );
}

#[test]
fn test_exit_circle_forfeits_collateral_after_period() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 2);
    let exiter = members.get(0).unwrap();
    let other = members.get(1).unwrap();

    let circle = setup.client.get_circle(&circle_id);
    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let other_before = token_client.balance(&other);

    setup.client.exit_circle(&circle_id, &exiter);

    assert!(setup.client.get_member(&circle_id, &exiter).is_slashed);
    assert_eq!(
        token_client.balance(&other) - other_before,
        collateral_amount(CONTRIBUTION, 2)
    );
    assert_eq!(setup.client.get_trust_score(&exiter).circles_defaulted, 1);
}

#[test]
#[should_panic(expected = "Error(Contract, #28)")]
fn test_exit_circle_blocked_before_period() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 2);
    setup.client.exit_circle(&circle_id, &members.get(0).unwrap());
}

#[test]
#[should_panic(expected = "Error(Contract, #27)")]
fn test_create_rejects_wrong_token() {
    let setup = setup();
    let fake = Address::generate(&setup.env);
    setup.client.create_circle(
        &setup.creator,
        &fake,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
        &Some(default_deadline(&setup.env)),
    );
}
