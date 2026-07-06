#![cfg(test)]

extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};
use types::{collateral_amount, DEFAULT_PLATFORM_FEE_BPS, MAX_MEMBERS_CAP};

const CONTRIBUTION: i128 = 10_000_000;
const PERIOD: u64 = 604_800;
const NO_MIN_TRUST: Option<u32> = None;

fn net_pot(gross: i128) -> i128 {
    gross - gross * (DEFAULT_PLATFORM_FEE_BPS as i128) / 10_000
}

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
    client.init(&token, &creator, &DEFAULT_PLATFORM_FEE_BPS);

    fund_member(&token_admin, &creator, member_budget(MAX_MEMBERS_CAP));

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
    fund_member(
        &setup.token_admin,
        &setup.creator,
        member_budget(max_members),
    );
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
    members.push_back(setup.creator.clone());
    for _ in 0..max_members.saturating_sub(1) {
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
    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(circle.current_round).unwrap();
    for member in members.iter() {
        let state = setup.client.get_member(&circle_id, &member);
        if state.is_slashed || state.is_exited_clean || member == recipient {
            continue;
        }
        setup.client.contribute(&circle_id, &member);
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
    fund_member(&setup.token_admin, &setup.creator, member_budget(3));
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
    assert_eq!(circle.member_count, 1);
    assert_eq!(circle.status, CircleStatus::Pending);
    assert!(circle.join_deadline > 0);
    assert!(setup.client.get_member(&circle_id, &setup.creator).collateral_deposited > 0);
}

#[test]
fn test_join_circle_deposits_collateral() {
    let setup = setup();
    fund_member(&setup.token_admin, &setup.creator, member_budget(3));
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
    assert_eq!(
        token_client.balance(&setup.contract_id),
        expected * 2
    );
}

#[test]
fn test_contribute_and_payout() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();

    for member in members.iter() {
        if member == recipient {
            continue;
        }
        setup.client.contribute(&circle_id, &member);
    }

    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    let balance_before = token_client.balance(&recipient);

    setup.client.trigger_payout(&circle_id);

    let expected_pot = CONTRIBUTION * 2;
    assert_eq!(
        token_client.balance(&recipient) - balance_before,
        net_pot(expected_pot)
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #35)")]
fn test_recipient_cannot_contribute() {
    let setup = setup();
    let (circle_id, _members) = create_and_fill_circle(&setup, 3);
    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();
    setup.client.contribute(&circle_id, &recipient);
}

#[test]
fn test_no_stranded_funds_after_full_cycle() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);
    let token_client = TokenClient::new(&setup.env, &setup.token);

    run_full_round(&setup, circle_id, &members, 0);
    run_full_round(&setup, circle_id, &members, 1);
    run_full_round(&setup, circle_id, &members, 2);

    assert_eq!(
        setup.client.get_circle(&circle_id).status,
        CircleStatus::Completed
    );
    assert_eq!(token_client.balance(&setup.contract_id), 0);
}

#[test]
fn test_slash_defaulter() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();

    let mut defaulter: Option<Address> = None;
    let mut payers: std::vec::Vec<Address> = std::vec::Vec::new();
    for i in 0..members.len() {
        let m = members.get(i).unwrap();
        if m == recipient {
            continue;
        }
        if defaulter.is_none() {
            defaulter = Some(m.clone());
            continue;
        }
        payers.push(m.clone());
        setup.client.contribute(&circle_id, &m);
    }
    let defaulter = defaulter.expect("non-recipient defaulter");

    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let mut balances_before: std::vec::Vec<i128> = std::vec::Vec::new();
    for i in 0..members.len() {
        let m = members.get(i).unwrap();
        balances_before.push(token_client.balance(&m));
    }

    setup.client.slash_defaulter(&circle_id, &defaulter);

    assert!(setup.client.get_member(&circle_id, &defaulter).is_slashed);
    assert_eq!(setup.client.get_trust_score(&defaulter).circles_defaulted, 1);

    let expected_collateral = collateral_amount(CONTRIBUTION, 3);
    let mut total_received = 0_i128;
    for i in 0..members.len() {
        let m = members.get(i).unwrap();
        if m == defaulter {
            continue;
        }
        total_received += token_client.balance(&m) - balances_before[i as usize];
    }
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
    assert_eq!(setup.client.get_trust_score(&early).circles_completed, 0);

    run_full_round(&setup, circle_id, &members, 1);
    run_full_round(&setup, circle_id, &members, 2);

    assert_eq!(
        setup.client.get_circle(&circle_id).status,
        CircleStatus::Completed
    );
    assert_eq!(setup.client.get_trust_score(&early).circles_completed, 1);
}

#[test]
fn test_creator_cannot_cancel_with_members_before_deadline() {
    let setup = setup();
    let deadline = setup.env.ledger().timestamp() + 10_000;
    fund_member(&setup.token_admin, &setup.creator, member_budget(2));
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
    fund_member(&setup.token_admin, &setup.creator, member_budget(3));
    let circle_id = setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &NO_MIN_TRUST,
        &Some(deadline),
    );

    let member = Address::generate(&setup.env);
    fund_member(&setup.token_admin, &member, member_budget(3));
    setup.client.join_circle(&circle_id, &member);

    setup.env.ledger().set_timestamp(deadline + 1);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let bal_before = token_client.balance(&member);
    let anyone = Address::generate(&setup.env);

    setup.client.cancel_circle(&circle_id, &anyone);

    assert_eq!(
        token_client.balance(&member) - bal_before,
        collateral_amount(CONTRIBUTION, 3)
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
    fund_member(&setup.token_admin, &setup.creator, member_budget(3));
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

#[test]
#[should_panic(expected = "Error(Contract, #20)")]
fn test_creator_rejected_insufficient_trust() {
    let setup = setup();
    fund_member(&setup.token_admin, &setup.creator, member_budget(3));
    setup.client.create_circle(
        &setup.creator,
        &setup.token,
        &CONTRIBUTION,
        &PERIOD,
        &3,
        &Some(50),
        &Some(default_deadline(&setup.env)),
    );
}

#[test]
fn test_default_reduced_pot_not_inflated() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();

    let mut defaulter: Option<Address> = None;
    for i in 0..members.len() {
        let m = members.get(i).unwrap();
        if m == recipient {
            continue;
        }
        if defaulter.is_none() {
            defaulter = Some(m.clone());
            continue;
        }
        setup.client.contribute(&circle_id, &m);
    }
    let defaulter = defaulter.expect("non-recipient defaulter");

    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);

    setup.client.slash_defaulter(&circle_id, &defaulter);

    let token_client = TokenClient::new(&setup.env, &setup.token);
    let balance_before = token_client.balance(&recipient);

    setup.client.trigger_payout(&circle_id);

    let expected_gross = CONTRIBUTION;
    assert_eq!(
        token_client.balance(&recipient) - balance_before,
        net_pot(expected_gross)
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #28)")]
fn test_exit_blocked_after_contributing() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);

    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();

    for member in members.iter() {
        if member == recipient {
            continue;
        }
        setup.client.contribute(&circle_id, &member);
    }

    let payer = members
        .iter()
        .find(|m| *m != recipient)
        .expect("payer");
    setup.client.exit_circle(&circle_id, &payer);
}

#[test]
fn test_full_cycle_with_default_completes() {
    let setup = setup();
    let (circle_id, members) = create_and_fill_circle(&setup, 3);
    let token_client = TokenClient::new(&setup.env, &setup.token);

    let circle = setup.client.get_circle(&circle_id);
    let recipient = circle.payout_order.get(0).unwrap();

    let mut defaulter: Option<Address> = None;
    for i in 0..members.len() {
        let m = members.get(i).unwrap();
        if m == recipient {
            continue;
        }
        if defaulter.is_none() {
            defaulter = Some(m.clone());
            continue;
        }
        setup.client.contribute(&circle_id, &m);
    }
    let defaulter = defaulter.expect("defaulter");

    setup
        .env
        .ledger()
        .set_timestamp(circle.activated_at + PERIOD + 1);
    setup.client.slash_defaulter(&circle_id, &defaulter);
    setup.client.trigger_payout(&circle_id);

    run_full_round(&setup, circle_id, &members, 1);
    run_full_round(&setup, circle_id, &members, 2);

    assert_eq!(
        setup.client.get_circle(&circle_id).status,
        CircleStatus::Completed
    );
    assert!(setup.client.get_member(&circle_id, &defaulter).is_slashed);
    assert_eq!(setup.client.get_trust_score(&defaulter).circles_defaulted, 1);
    assert_eq!(token_client.balance(&setup.contract_id), 0);
}
