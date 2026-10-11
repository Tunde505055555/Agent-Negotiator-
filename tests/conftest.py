"""Test harness for the AgentNegotiator Intelligent Contract.

GenLayer's runtime is not available outside the node, so we install a small
stub of the `genlayer` module before importing the contract. The stub keeps the
contract's DETERMINISTIC logic intact — validation, canonicalisation, band
handling, threshold decisions and state transitions — which is exactly the
surface these tests need to exercise.
"""

import importlib.util
import sys
import types
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


class UserError(Exception):
    pass


class _TreeMap(dict):
    def get(self, key, default=None):  # noqa: D102
        return dict.get(self, key, default)


def _install_genlayer_stub() -> None:
    module = types.ModuleType("genlayer")

    gl = types.SimpleNamespace()
    gl.vm = types.SimpleNamespace(UserError=UserError)

    def _identity(fn):
        return fn

    gl.public = types.SimpleNamespace(write=_identity, view=_identity)
    gl.message = types.SimpleNamespace(sender_address="0xowner")
    gl.nondet = types.SimpleNamespace(
        exec_prompt=lambda *_a, **_k: "{}",
        web=types.SimpleNamespace(render=lambda *_a, **_k: ""),
    )
    gl.eq_principle = types.SimpleNamespace(
        prompt_comparative=lambda fn, principle: fn()
    )

    class Contract:
        pass

    gl.Contract = Contract

    module.gl = gl
    module.Address = str
    module.DynArray = dict  # only used as a type annotation
    module.TreeMap = dict  # only used as a type annotation
    module.u256 = int
    sys.modules["genlayer"] = module


_install_genlayer_stub()

spec = importlib.util.spec_from_file_location(
    "agent_negotiator", ROOT / "contracts" / "agent_negotiator.py"
)
agent_negotiator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent_negotiator)


def new_contract():
    """A contract instance with in-memory storage."""
    contract = object.__new__(agent_negotiator.AgentNegotiator)
    contract.owner = "0xowner"
    contract.agent_ids = []
    contract.agents = _TreeMap()
    contract.deal_ids = []
    contract.deals = _TreeMap()
    contract.proposals = _TreeMap()
    contract.evaluations = _TreeMap()
    contract.histories = _TreeMap()
    contract.verifications = _TreeMap()
    contract.challenges = _TreeMap()
    contract.evidence = _TreeMap()
    contract.deal_count = 0
    return contract


@pytest.fixture
def contract():
    return new_contract()


@pytest.fixture
def module():
    return agent_negotiator


@pytest.fixture
def errors():
    return UserError
