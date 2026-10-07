"""Targeted tests for the validator-consensus problem GenLayer reviewers flag.

Property under test: every value that can change contract state, an acceptance
decision, a deal status, the final terms, a verification result, a challenge
result or a ranking is consensus-bound, and the persisted state is derived from
one canonical consensus result only.
"""

import json

import pytest


# --- fixtures -------------------------------------------------------------


BUYER = json.dumps(
    {
        "name": "Buyer One",
        "role": "buyer",
        "strategy": "balanced",
        "budget": 100,
        "constraints": ["mobile responsive"],
    }
)
SELLER = json.dumps(
    {"name": "Seller One", "role": "seller", "strategy": "aggressive", "budget": 60}
)
DEAL = json.dumps(
    {"buyer_agent_id": "buyer1", "title": "Landing page", "budget": 100, "deadline_days": 3}
)
PROPOSAL = json.dumps({"agent_id": "seller1", "price": 90, "deadline": 3})


def setup_deal(contract):
    contract.register_agent("buyer1", BUYER)
    contract.register_agent("seller1", SELLER)
    contract.post_deal("deal1", DEAL)


def validator_answer(**overrides):
    """A plausible validator response to the proposal evaluation prompt."""
    answer = {
        "proposal_status": "valid",
        "price": 90,
        "deadline": 3,
        "requirements_satisfied": ["mobile responsive"],
        "requirements_failed": [],
        "hidden_conditions": [],
        "conflicting_terms": [],
        "fairness_band": "high",
        "risk_band": "low",
        "negotiation_band": "high",
        "confidence_band": "high",
        "reason": "Meets the brief.",
    }
    answer.update(overrides)
    return json.dumps(answer)


def script(contract, payload):
    contract._consensus_json = lambda task, principle: payload


# --- 1. compatible scores cannot cross a decision threshold ---------------


def test_no_numeric_score_can_sit_next_to_a_threshold(module):
    """Judgement is banded, and every band maps to one fixed score."""
    scores = sorted(module.BAND_SCORE[b] for b in module.BANDS)
    # Bands are far apart: no two agreeing validators can land on values that
    # straddle a threshold, because there are no intermediate values at all.
    gaps = [b - a for a, b in zip(scores, scores[1:])]
    assert min(gaps) >= 20
    assert set(module.BAND_SCORE) == set(module.BANDS)


def test_thresholds_sit_on_band_boundaries():
    """Acceptance flips only when the agreed band itself changes."""
    from conftest import new_contract

    def outcome(**overrides):
        contract = new_contract()
        setup_deal(contract)
        script(contract, validator_answer(**overrides))
        return json.loads(contract.submit_proposal("deal1", "p1", PROPOSAL))["accepted"]

    assert outcome() is True  # fairness "high" + risk "low"
    # one band lower on fairness -> rejected, no in-between outcome exists
    assert outcome(fairness_band="medium") is False
    assert outcome(risk_band="medium") is False


def test_free_numeric_scores_are_ignored_and_bands_are_required(contract, errors):
    """A response using the old free-integer format cannot be persisted."""
    setup_deal(contract)
    legacy = json.dumps(
        {
            "proposal_status": "valid",
            "accepted": True,
            "price": 90,
            "deadline": 3,
            "requirements_satisfied": [],
            "requirements_failed": [],
            "hidden_conditions": [],
            "conflicting_terms": [],
            "fairness_score": 56,
            "risk_score": 44,
            "negotiation_score": 70,
            "confidence": 80,
            "final_terms": "whatever the validator felt like",
        }
    )
    script(contract, legacy)
    with pytest.raises(errors):
        contract.submit_proposal("deal1", "p1", PROPOSAL)
    assert contract.evaluations.get("p1") is None


def test_model_supplied_accepted_flag_cannot_override_the_rule(contract):
    """accepted is derived by the contract, not taken from the model."""
    setup_deal(contract)
    script(
        contract,
        validator_answer(
            accepted=True,
            fairness_band="very_low",
            risk_band="very_high",
            requirements_failed=["deadline missed"],
        ),
    )
    result = json.loads(contract.submit_proposal("deal1", "p1", PROPOSAL))
    assert result["accepted"] is False
    assert json.loads(contract.deals["deal1"])["status"] == "negotiating"


# --- 2. validators cannot disagree on final terms -------------------------


def test_final_terms_are_rebuilt_from_consensus_bound_values(contract):
    """Two validators whose prose differs still persist identical final terms."""
    setup_deal(contract)
    script(contract, validator_answer(reason="Validator A phrasing", final_terms="A's terms"))
    first = json.loads(contract.submit_proposal("deal1", "p1", PROPOSAL))

    other = contract.__class__.__new__(contract.__class__)
    from conftest import new_contract

    second_contract = new_contract()
    setup_deal(second_contract)
    script(
        second_contract,
        validator_answer(reason="Validator B phrasing", final_terms="B's totally different terms"),
    )
    second = json.loads(second_contract.submit_proposal("deal1", "p1", PROPOSAL))

    assert first["final_terms"] == second["final_terms"]
    assert first["final_terms"] == "90 GEN | 3 days | mobile responsive"
    assert json.loads(contract.deals["deal1"])["final_terms"] == first["final_terms"]
    assert other is not None


def test_rejected_proposal_never_writes_final_terms(contract):
    setup_deal(contract)
    script(contract, validator_answer(risk_band="very_high", final_terms="sneaky terms"))
    result = json.loads(contract.submit_proposal("deal1", "p1", PROPOSAL))
    assert result["final_terms"] == ""
    assert "final_terms" not in json.loads(contract.deals["deal1"])


# --- 3. verification and challenge outcomes are bound ---------------------


def agree(contract):
    setup_deal(contract)
    script(contract, validator_answer())
    contract.submit_proposal("deal1", "p1", PROPOSAL)


def verification_answer(**overrides):
    answer = {
        "verification_status": "VERIFIED",
        "contradictions": [],
        "risk_band": "low",
        "confidence_band": "high",
        "reason": "Consistent.",
    }
    answer.update(overrides)
    return json.dumps(answer)


def test_verification_status_must_be_a_known_enum(contract, errors):
    agree(contract)
    script(contract, verification_answer(verification_status="probably fine"))
    with pytest.raises(errors):
        contract.verify_agreement("deal1")
    assert contract.verifications.get("deal1") is None
    assert json.loads(contract.deals["deal1"])["status"] == "agreed"


def test_verified_with_contradictions_is_downgraded_deterministically(contract):
    agree(contract)
    script(contract, verification_answer(contradictions=["penalty clause reverses the SLA"]))
    result = json.loads(contract.verify_agreement("deal1"))
    assert result["verification_status"] == "NEEDS REVIEW"
    assert json.loads(contract.deals["deal1"])["status"] == "needs_review"


def test_verification_confidence_is_banded(contract):
    agree(contract)
    script(contract, verification_answer(confidence_band="medium"))
    result = json.loads(contract.verify_agreement("deal1"))
    assert result["confidence"] == 50
    assert result["confidence_band"] == "medium"


def test_challenge_decision_must_be_a_known_enum(contract, errors):
    agree(contract)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    script(contract, json.dumps({"final_decision": "maybe", "confidence_band": "high"}))
    with pytest.raises(errors):
        contract.challenge_agreement("deal1", "terms were altered")
    assert contract.challenges.get("deal1") is None
    assert json.loads(contract.deals["deal1"])["status"] == "verified"


def test_challenge_uses_contract_history_not_caller_history(contract):
    """The caller cannot supply the history validators judge."""
    import inspect

    signature = inspect.signature(contract.__class__.challenge_agreement)
    assert "history_json" not in signature.parameters

    agree(contract)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    history = json.loads(contract.get_history("deal1"))
    kinds = [entry["type"] for entry in history]
    assert kinds == ["proposal", "verification"]
    assert history[0]["evaluation"]["price"] == 90


def test_overturned_challenge_reopens_the_deal_once(contract, errors):
    agree(contract)
    script(contract, verification_answer())
    contract.verify_agreement("deal1")
    script(
        contract,
        json.dumps(
            {
                "final_decision": "OVERTURNED",
                "grounds": ["round 1 proposal"],
                "confidence_band": "high",
                "reason": "Scope changed silently.",
            }
        ),
    )
    result = json.loads(contract.challenge_agreement("deal1", "scope was altered"))
    assert result["final_decision"] == "OVERTURNED"
    assert json.loads(contract.deals["deal1"])["status"] == "needs_review"
    with pytest.raises(errors):
        contract.challenge_agreement("deal1", "again")


# --- 4. every consequential field is consensus-bound ----------------------


def test_every_consequential_evaluation_field_is_bound(contract):
    agree(contract)
    evaluation = json.loads(contract.evaluations["p1"])
    for field in (
        "proposal_status",
        "accepted",
        "price",
        "deadline",
        "requirements_satisfied",
        "requirements_failed",
        "hidden_conditions",
        "conflicting_terms",
        "fairness_band",
        "risk_band",
        "negotiation_band",
        "confidence_band",
        "final_terms",
    ):
        assert field in evaluation
    # published numbers are pure functions of agreed bands
    assert evaluation["fairness_score"] == 70
    assert evaluation["risk_score"] == 30
    assert evaluation["negotiation_score"] == 70
    assert evaluation["confidence"] == 70


def test_ranking_is_band_bound_and_deterministic(contract):
    setup_deal(contract)
    contract.post_deal(
        "deal2", json.dumps({"buyer_agent_id": "buyer1", "title": "Support", "budget": 300})
    )
    script(
        contract,
        json.dumps(
            {
                "matches": [
                    {"deal_id": "deal2", "compatibility_band": "high", "gaps": []},
                    {"deal_id": "deal1", "compatibility_band": "high", "gaps": []},
                    {"deal_id": "not-a-real-deal", "compatibility_band": "very_high"},
                    {"deal_id": "deal1", "compatibility_band": "very_low"},
                ]
            }
        ),
    )
    matches = json.loads(contract.find_deals("landing page", "[]"))["matches"]
    ids = [m["deal_id"] for m in matches]
    assert ids == ["deal1", "deal2"]  # fabricated id dropped, duplicate ignored
    assert all(m["compatibility"] == 70 for m in matches)


# --- 5. disagreement prevents inconsistent persistence --------------------


def test_a_malformed_consensus_result_writes_nothing(contract, errors):
    setup_deal(contract)
    script(contract, "not json at all")
    with pytest.raises(errors):
        contract.submit_proposal("deal1", "p1", PROPOSAL)
    assert contract.proposals.get("p1") is None
    assert contract.evaluations.get("p1") is None
    assert json.loads(contract.deals["deal1"])["status"] == "open"
    assert json.loads(contract.get_history("deal1")) == []


def test_an_out_of_range_band_writes_nothing(contract, errors):
    setup_deal(contract)
    script(contract, validator_answer(fairness_band="excellent"))
    with pytest.raises(errors):
        contract.submit_proposal("deal1", "p1", PROPOSAL)
    assert contract.evaluations.get("p1") is None
    assert json.loads(contract.deals["deal1"])["status"] == "open"


# --- 6. the same consensus result always produces the same state ----------


def test_same_consensus_result_produces_identical_stored_state():
    from conftest import new_contract

    states = []
    for _ in range(3):
        contract = new_contract()
        setup_deal(contract)
        script(contract, validator_answer())
        contract.submit_proposal("deal1", "p1", PROPOSAL)
        script(contract, verification_answer())
        contract.verify_agreement("deal1")
        states.append(
            (
                contract.deals["deal1"],
                contract.evaluations["p1"],
                contract.verifications["deal1"],
                contract.histories["deal1"],
            )
        )
    assert states[0] == states[1] == states[2]
