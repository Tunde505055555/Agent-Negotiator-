"""Adversarial tests for the corrected negotiation lifecycle.

Covers:
* two-party authorization: an agreement exists only after the seller signed the
  proposal AND the buyer's owner accepted it (explicitly or via a signed
  delegation with price/deadline ceilings);
* deterministic term binding: consensus output cannot change the price,
  deadline or deliverables of a signed proposal, and hard limits are enforced
  in code;
* recovery: rejected, overturned or unresolved agreements can be reopened or
  cancelled, with the old agreement archived in history.
"""

import json

import pytest

from test_consensus_binding import BUYER, SELLER, script, validator_answer, verification_answer

ALICE = "0xalice"  # buyer owner
BOB = "0xbob"  # seller owner
MALLORY = "0xmallory"  # attacker

DEAL = {"buyer_agent_id": "buyer1", "title": "Landing page", "budget": 100, "deadline_days": 3}
PROPOSAL = json.dumps(
    {
        "agent_id": "seller1",
        "price": 90,
        "deadline": 3,
        "deliverables": ["responsive landing page"],
        "payment_terms": "on delivery",
        "penalties": "5% per day late",
    }
)
OVERTURN = json.dumps(
    {"final_decision": "OVERTURNED", "grounds": ["round 1"], "confidence_band": "high", "reason": "x"}
)


@pytest.fixture
def as_wallet(module):
    original = module.gl.message.sender_address

    def switch(address):
        module.gl.message.sender_address = address

    yield switch
    module.gl.message.sender_address = original


def setup(contract, as_wallet, **deal_overrides):
    as_wallet(ALICE)
    contract.register_agent("buyer1", BUYER)
    as_wallet(BOB)
    contract.register_agent("seller1", SELLER)
    as_wallet(ALICE)
    contract.post_deal("deal1", json.dumps({**DEAL, **deal_overrides}))


def propose(contract, as_wallet, pid="p1", proposal=PROPOSAL, **answer):
    as_wallet(BOB)
    script(contract, validator_answer(**answer))
    return json.loads(contract.submit_proposal("deal1", pid, proposal))


def deal(contract):
    return json.loads(contract.deals["deal1"])


def agreed(contract, as_wallet):
    setup(contract, as_wallet)
    propose(contract, as_wallet)
    as_wallet(ALICE)
    contract.accept_proposal("deal1", "p1")


# --- authorization ---------------------------------------------------------


def test_accepted_evaluation_does_not_auto_finalize(contract, as_wallet):
    setup(contract, as_wallet)
    result = propose(contract, as_wallet)
    assert result["accepted"] is True
    d = deal(contract)
    assert d["status"] == "pending_acceptance"
    assert d["agreement"]["seller_authorized_by"] == BOB
    assert d["agreement"]["buyer_authorized_by"] == ""
    assert "agreed_with_agent_id" not in d


def test_buyer_owner_must_sign_acceptance(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet)
    for wallet in (MALLORY, BOB):  # attacker and the seller itself
        as_wallet(wallet)
        with pytest.raises(errors):
            contract.accept_proposal("deal1", "p1")
    assert deal(contract)["status"] == "pending_acceptance"
    as_wallet(ALICE)
    contract.accept_proposal("deal1", "p1")
    d = deal(contract)
    assert d["status"] == "agreed"
    assert d["agreement"]["buyer_authorization"] == "explicit"
    assert d["agreement"]["buyer_authorized_by"] == ALICE


def test_cannot_accept_a_different_proposal_id(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet, fairness_band="low")  # p1 rejected
    propose(contract, as_wallet, pid="p2")  # p2 pending
    as_wallet(ALICE)
    with pytest.raises(errors):
        contract.accept_proposal("deal1", "p1")


def test_verification_blocked_until_both_parties_authorized(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet)
    for wallet in (ALICE, BOB):
        as_wallet(wallet)
        script(contract, verification_answer())
        with pytest.raises(errors):
            contract.verify_agreement("deal1")


def test_delegation_within_limits_finalizes(contract, as_wallet):
    setup(contract, as_wallet, delegation={"max_price": 95, "max_deadline_days": 3})
    propose(contract, as_wallet)
    d = deal(contract)
    assert d["status"] == "agreed"
    assert d["agreement"]["buyer_authorization"] == "delegated"
    assert d["agreement"]["buyer_authorized_by"] == ALICE


def test_delegation_exceeded_requires_explicit_acceptance(contract, as_wallet):
    setup(contract, as_wallet, delegation={"max_price": 80, "max_deadline_days": 3})
    propose(contract, as_wallet)  # 90 GEN > 80 ceiling
    assert deal(contract)["status"] == "pending_acceptance"


def test_delegation_cannot_exceed_budget(contract, as_wallet, errors):
    as_wallet(ALICE)
    contract.register_agent("buyer1", BUYER)
    with pytest.raises(errors):
        contract.post_deal(
            "deal1", json.dumps({**DEAL, "delegation": {"max_price": 500, "max_deadline_days": 3}})
        )


def test_caller_cannot_forge_delegation_grantor(contract, as_wallet):
    setup(
        contract,
        as_wallet,
        delegation={"max_price": 95, "max_deadline_days": 3, "granted_by": MALLORY},
    )
    assert deal(contract)["delegation"]["granted_by"] == ALICE


def test_caller_cannot_inject_agreement_when_posting(contract, as_wallet):
    setup(contract, as_wallet, agreement={"proposal_id": "fake"}, status="agreed")
    d = deal(contract)
    assert d["status"] == "open"
    assert "agreement" not in d


def test_seller_can_withdraw_but_outsider_cannot(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet)
    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.withdraw_proposal("deal1", "p1")
    as_wallet(BOB)
    contract.withdraw_proposal("deal1", "p1")
    d = deal(contract)
    assert d["status"] == "negotiating"
    assert "agreement" not in d


def test_buyer_rejection_reopens_negotiation(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet)
    as_wallet(BOB)
    with pytest.raises(errors):
        contract.reject_proposal("deal1", "p1", "seller cannot reject for buyer")
    as_wallet(ALICE)
    contract.reject_proposal("deal1", "p1", "need faster delivery")
    assert deal(contract)["status"] == "negotiating"
    propose(contract, as_wallet, pid="p2")
    assert deal(contract)["status"] == "pending_acceptance"


# --- deterministic term binding -------------------------------------------


def test_consensus_cannot_restate_a_different_price(contract, as_wallet):
    setup(contract, as_wallet)
    result = propose(contract, as_wallet, price=40)  # model "remembers" 40 GEN
    assert result["accepted"] is False
    assert result["terms_match"] is False
    assert result["price"] == 90  # stored terms are the signed ones
    assert deal(contract)["status"] == "negotiating"


def test_consensus_cannot_restate_a_different_deadline(contract, as_wallet):
    setup(contract, as_wallet)
    result = propose(contract, as_wallet, deadline=1)
    assert result["accepted"] is False


def test_price_over_budget_is_rejected_even_if_model_approves(contract, as_wallet):
    setup(contract, as_wallet)
    over = json.dumps({**json.loads(PROPOSAL), "price": 150})
    result = propose(contract, as_wallet, proposal=over, price=150)
    assert result["accepted"] is False
    assert "price exceeds the deal budget" in result["requirements_failed"]


def test_deadline_over_window_is_rejected_even_if_model_approves(contract, as_wallet):
    setup(contract, as_wallet)
    late = json.dumps({**json.loads(PROPOSAL), "deadline": 9})
    result = propose(contract, as_wallet, proposal=late, deadline=9)
    assert result["accepted"] is False


def test_final_terms_come_from_signed_proposal(contract, as_wallet):
    agreed(contract, as_wallet)
    d = deal(contract)
    assert d["final_terms"] == "90 GEN | 3 days | responsive landing page"
    assert d["agreement"]["terms"]["payment_terms"] == "on delivery"
    assert d["agreement"]["terms"]["penalties"] == "5% per day late"


def test_non_integer_price_is_refused(contract, as_wallet, errors):
    setup(contract, as_wallet)
    bad = json.dumps({**json.loads(PROPOSAL), "price": "ninety"})
    with pytest.raises(errors):
        propose(contract, as_wallet, proposal=bad)


def test_tampered_agreement_fails_verification(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    d = deal(contract)
    d["agreement"]["terms"]["price"] = 10  # storage tampering / bug simulation
    contract.deals["deal1"] = json.dumps(d)
    as_wallet(ALICE)
    script(contract, verification_answer())
    with pytest.raises(errors):
        contract.verify_agreement("deal1")
    assert contract.verifications.get("deal1") is None


# --- recovery ------------------------------------------------------------


def test_overturned_agreement_can_be_reopened_and_renegotiated(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    as_wallet(ALICE)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    as_wallet(BOB)
    script(contract, OVERTURN)
    contract.challenge_agreement("deal1", "scope altered")
    assert deal(contract)["status"] == "needs_review"

    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.reopen_deal("deal1", "attacker")

    as_wallet(ALICE)
    contract.reopen_deal("deal1", "renegotiate after overturn")
    d = deal(contract)
    assert d["status"] == "negotiating"
    assert d["epoch"] == 1
    assert "agreement" not in d and "agreed_with_agent_id" not in d
    assert contract.verifications.get("deal1") is None
    assert contract.challenges.get("deal1") is None

    archived = [e for e in json.loads(contract.get_history("deal1")) if e["type"] == "reopened"]
    assert archived[0]["challenge"]["final_decision"] == "OVERTURNED"
    assert archived[0]["agreement"]["proposal_id"] == "p1"

    # full second round: new proposal, new acceptance, fresh verification/challenge slot
    propose(contract, as_wallet, pid="p2")
    as_wallet(ALICE)
    contract.accept_proposal("deal1", "p2")
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    assert deal(contract)["status"] == "verified"


def test_rejected_verification_can_be_reopened(contract, as_wallet):
    agreed(contract, as_wallet)
    as_wallet(BOB)
    script(contract, verification_answer(verification_status="REJECTED"))
    contract.verify_agreement("deal1")
    assert deal(contract)["status"] == "rejected"
    contract.reopen_deal("deal1", "fix terms")
    assert deal(contract)["status"] == "negotiating"


def test_verified_deal_cannot_be_reopened_or_cancelled(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    as_wallet(ALICE)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    with pytest.raises(errors):
        contract.reopen_deal("deal1", "buyer's remorse")
    with pytest.raises(errors):
        contract.cancel_deal("deal1", "buyer's remorse")


def test_unresolved_deal_can_be_cancelled_by_buyer_only(contract, as_wallet, errors):
    setup(contract, as_wallet)
    propose(contract, as_wallet)  # pending, buyer never answers
    as_wallet(BOB)
    with pytest.raises(errors):
        contract.cancel_deal("deal1", "seller tries")
    as_wallet(ALICE)
    contract.cancel_deal("deal1", "no longer needed")
    assert deal(contract)["status"] == "cancelled"
    with pytest.raises(errors):
        propose(contract, as_wallet, pid="p2")
