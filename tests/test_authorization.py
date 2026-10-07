"""Agent ownership and authorization tests.

Every agent is bound to the address that registered it. Deal, proposal,
counteroffer, verification, challenge and evidence actions must be signed by
the owner of a participating agent, so another wallet can neither impersonate
an agent nor consume a deal's single challenge slot.
"""

import json

import pytest

from test_consensus_binding import (
    BUYER,
    DEAL,
    PROPOSAL,
    SELLER,
    script,
    validator_answer,
    verification_answer,
)

ALICE = "0xalice"  # buyer owner
BOB = "0xbob"  # seller owner
MALLORY = "0xmallory"  # attacker


@pytest.fixture
def as_wallet(module):
    original = module.gl.message.sender_address

    def switch(address):
        module.gl.message.sender_address = address

    yield switch
    module.gl.message.sender_address = original


def setup(contract, as_wallet):
    as_wallet(ALICE)
    contract.register_agent("buyer1", BUYER)
    as_wallet(BOB)
    contract.register_agent("seller1", SELLER)
    as_wallet(ALICE)
    contract.post_deal("deal1", DEAL)


def agreed(contract, as_wallet):
    setup(contract, as_wallet)
    as_wallet(BOB)
    script(contract, validator_answer())
    contract.submit_proposal("deal1", "p1", PROPOSAL)


def test_registration_binds_signer_and_ignores_supplied_owner(contract, as_wallet):
    as_wallet(ALICE)
    payload = json.loads(BUYER)
    payload["owner"] = MALLORY
    contract.register_agent("buyer1", json.dumps(payload))
    assert json.loads(contract.get_agent("buyer1"))["owner"] == ALICE


def test_other_wallet_cannot_post_deal_for_agent(contract, as_wallet, errors):
    as_wallet(ALICE)
    contract.register_agent("buyer1", BUYER)
    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.post_deal("deal1", DEAL)
    assert contract.deals.get("deal1") is None


def test_other_wallet_cannot_propose_as_seller(contract, as_wallet, errors):
    setup(contract, as_wallet)
    as_wallet(MALLORY)
    script(contract, validator_answer())
    with pytest.raises(errors):
        contract.submit_proposal("deal1", "p1", PROPOSAL)
    assert contract.proposals.get("p1") is None


def test_owner_can_propose(contract, as_wallet):
    agreed(contract, as_wallet)
    assert contract.proposals.get("p1") is not None


def test_other_wallet_cannot_counteroffer_as_agent(contract, as_wallet, errors, module):
    setup(contract, as_wallet)
    as_wallet(BOB)
    script(contract, validator_answer(fairness_band="low"))
    contract.submit_proposal("deal1", "p1", PROPOSAL)
    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.generate_counteroffer("deal1", "p1", "buyer1")


def test_unrelated_owned_agent_cannot_counteroffer(contract, as_wallet, errors):
    setup(contract, as_wallet)
    as_wallet(BOB)
    script(contract, validator_answer(fairness_band="low"))
    contract.submit_proposal("deal1", "p1", PROPOSAL)
    as_wallet(MALLORY)
    contract.register_agent("seller2", SELLER)
    with pytest.raises(errors):
        contract.generate_counteroffer("deal1", "p1", "seller2")


def test_outsider_cannot_verify(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    as_wallet(MALLORY)
    script(contract, verification_answer())
    with pytest.raises(errors):
        contract.verify_agreement("deal1")
    assert contract.verifications.get("deal1") is None


def test_outsider_cannot_consume_challenge_slot(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    as_wallet(ALICE)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.challenge_agreement("deal1", "unfair")
    assert contract.challenges.get("deal1") is None


def test_outsider_cannot_attach_evidence(contract, as_wallet, errors):
    agreed(contract, as_wallet)
    as_wallet(MALLORY)
    with pytest.raises(errors):
        contract.attach_evidence("deal1", "https://example.com")
    assert contract.evidence.get("deal1") is None
