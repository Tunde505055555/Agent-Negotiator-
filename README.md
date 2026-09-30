# AGENT NEGOTIATOR

Autonomous AI agents that negotiate real-world deals, with GenLayer validator consensus judging every offer, agreement and dispute.

- **Deployed Intelligent Contract:** `0xE2D7988Fb0558a1D7c19374E7006925974BBC62d`
- **Network:** GenLayer Studio
- **Contract source:** `contracts/agent_negotiator.py` (GenLayer v0.3.0)
- **Frontend:** TanStack Start + React 19 + TypeScript + Tailwind CSS v4

The address is hard-coded in `src/lib/negotiator/contract.ts` as a frozen constant. It has no setter, is never read from user input, query params or local storage, and cannot be edited anywhere in the interface.

---

## One-line description (180 words max)

AGENT NEGOTIATOR is a Web3 negotiation network where autonomous buyer and seller agents haggle over real tasks — price, deadline, deliverables, penalties, payment terms — and a GenLayer Intelligent Contract uses validator consensus to judge, in natural language, whether each proposal satisfies both sides' stated constraints, whether the final agreement is internally consistent and free of hidden conditions, and how a challenged verdict should be resolved.

---

## What the project does, who it is for, and why it is useful (1000 words max)

### The problem

Almost every commercial relationship starts with a negotiation, and almost none of it is machine-readable. A buyer writes "I need a landing page in under two weeks, mobile-first, and I can't go past $4,000, and I want a penalty clause if you miss the date." A seller replies with a price, a delivery estimate, and a paragraph of caveats. Whether that reply actually satisfies the buyer's conditions is a judgement call about language, not a numeric comparison. Traditional smart contracts cannot make that call. They can compare two integers and move tokens; they cannot read a sentence and decide whether "best-effort delivery, subject to client feedback cycles" is compatible with a hard two-week deadline.

The result is that the interesting part of commerce — the reasoning, the trade-offs, the fairness of the deal — stays off-chain in inboxes, chat threads and PDFs. Marketplaces paper over this with rigid forms and fixed price fields, which is why so much real work still gets negotiated by hand.

### What AGENT NEGOTIATOR does

AGENT NEGOTIATOR moves that reasoning on-chain using GenLayer's Intelligent Contracts, where validators reach consensus over the output of language models rather than over arithmetic alone.

**1. Agents with mandates.** A user registers an agent — buyer or seller — with an identity, an objective, a budget, ranked preferences, hard constraints ("never accept payment on delivery only", "quality bar must be production-grade") and a negotiation strategy: Aggressive, Balanced, Cooperative or Best Value. The mandate is what the agent is allowed to do; nobody has to sit and watch the haggling.

**2. Deals posted in plain language.** A buyer agent posts a request the way a human would write it, plus a budget, a deadline and a list of requirements. There is no fixed schema to fight with.

**3. Consensus-judged proposals.** When a seller agent submits a proposal, the contract does not simply check `price <= budget`. It asks the validator quorum a comparative question: does this proposal satisfy the buyer's requirements, which ones fail, is it fair, how risky is it, and what is the negotiation score? Every non-deterministic block returns structured JSON — status, accepted flag, price, deadline, requirements satisfied and failed, fairness score, risk score, negotiation score, confidence, reason, final terms, hidden conditions and each validator's vote — so contract state stays machine-readable while the reasoning behind it remains inspectable.

**4. Counteroffers generated from strategy.** Instead of a single take-it-or-leave-it round, the contract reads the full negotiation history and produces the next offer consistent with the agent's strategy: an Aggressive agent holds price and concedes late, a Cooperative agent concedes early to close, a Best Value agent optimises value per dollar rather than headline price. Negotiations play out over rounds and can be replayed round by round in the interface.

**5. Verification of the final agreement.** Once both sides agree, the terms are re-reviewed by a fresh quorum for internal consistency and buried conditions, returning VERIFIED, NEEDS REVIEW or REJECTED with a reason and confidence.

**6. Challenges.** Any decision can be challenged. A new quorum re-reviews the claim against the record and either upholds or overturns the original verdict — an appeal path that does not depend on a single privileged operator.

**7. Reputation that comes from behaviour.** Deals completed, negotiations won, average consensus score, acceptance rate, savings delivered and current streak are tracked per agent and ranked on a leaderboard, so a good negotiator is identifiable from its record rather than its marketing.

**8. Semantic deal discovery.** The Deal Finder takes a plain-language brief ("I need a Solidity audit under $5k this month") and returns matching open deals with the reason each one matched.

### Who it is for

- **Freelancers, studios and agencies** who lose hours per week to repetitive scoping and price haggling and want an agent to carry a mandate on their behalf.
- **Buyers of services** — startups, small teams, procurement — who need offers judged against their real conditions, not just their maximum price.
- **Marketplace and platform builders** who want negotiation, verification and dispute resolution as infrastructure instead of a support queue.
- **AI agent developers** who need an economic venue where agents can transact with a neutral, auditable judge, rather than trusting the counterparty's own model.
- **GenLayer and Web3 developers** looking for a concrete, non-toy example of comparative-consensus prompting, structured non-deterministic outputs and appealable on-chain judgement.

### What makes it useful

- **It judges language, not just numbers.** The core primitive — consensus over a natural-language evaluation — is exactly what ordinary contracts cannot do, and exactly what commerce runs on.
- **Every verdict is auditable.** Reasons, per-validator votes, satisfied and failed requirements, fairness and risk scores are all recorded. You can see why a deal passed or failed.
- **Nobody has to be the referee.** Judgement comes from a validator quorum with a defined appeal route, not from a platform that also profits from the outcome.
- **Reputation is earned on-record.** Scores derive from actual negotiated outcomes, which is far harder to fake than a star rating.
- **It scales past human attention.** Agents negotiate many deals in parallel under mandates their owners set once.
- **It is inspectable end to end.** The full contract source is readable and copyable from the in-app Contract page, alongside the deployed address.

---

## Expected verification outcome to prove the path works (500-character limit)

> Open /marketplace, pick the open deal, submit a proposal inside the buyer's budget and deadline that satisfies every listed requirement. The contract's validator quorum returns a structured verdict: proposal_status "valid", accepted true, requirements_failed empty, fairness and negotiation scores with a written reason and per-validator votes. Accept it and the deal moves to VERIFIED with no hidden conditions. Then challenge that verdict and the fresh quorum returns UPHELD.

(477 characters)

---

## Exactly what the visitor should do

1. **Open the Dashboard (`/`).** Read the live network stats: active agents, open deals, average consensus score, acceptance rate.
2. **Open Contract (`/contract`).** Confirm the deployed address `0xE2D7988Fb0558a1D7c19374E7006925974BBC62d` shown as locked, and read or copy the full Intelligent Contract source.
3. **Open Agents (`/agents`) and create an agent.** Give it a name, pick buyer or seller, write its objective, set a budget, add at least one preference and one hard constraint, choose a strategy, then save.
4. **Open Marketplace (`/marketplace`).** Either post a new request in plain language with a budget, deadline and requirements, or pick an existing open deal.
5. **Enter the negotiation room.** Submit a proposal as your agent: price, deadline, deliverables, quality bar, penalties, payment terms. Watch the consensus panel return the structured verdict — satisfied and failed requirements, fairness, risk and negotiation scores, reason, and each validator's vote.
6. **Run a counteroffer round.** Let the opposing agent generate the next offer from its strategy, then use the round replay to step through the negotiation from round one.
7. **Accept the deal** and read the verification result: VERIFIED, NEEDS REVIEW or REJECTED, with the reason and any hidden conditions found.
8. **Challenge the verdict.** Write a claim, submit it, and see whether the fresh quorum upholds or overturns the original decision.
9. **Open Deal Finder (`/finder`).** Type a brief in plain English and see semantically matched deals with the reason each matched.
10. **Open Leaderboard (`/leaderboard`)** and click through to an agent profile to see its full negotiation record.
11. *(Optional)* **Connect a wallet** with the header button to attach an on-chain identity to your agents.

---

## Project structure

```
contracts/
  agent_negotiator.py          GenLayer Intelligent Contract (v0.3.0)
src/
  lib/negotiator/
    contract.ts                Frozen deployed contract address (not editable)
    types.ts                   Agent, Deal, Proposal, GenLayerEvaluation types
    engine.ts                  evaluateProposal, generateCounter, verifyDeal, findDeals
    store.tsx                  App state + persistence, useNegotiator()
    seed.ts                    Demo agents and deals
  lib/wallet.tsx               Wallet connection
  components/negotiator/       ProposalCard, ConsensusPanel, DealAnalyzer, primitives
  routes/
    __root.tsx                 App shell, navigation, footer
    index.tsx                  Dashboard
    marketplace.tsx            Post requests, browse open deals
    agents.index.tsx           Create and list agents
    agents.$agentId.tsx        Agent performance profile
    negotiations.$dealId.tsx   Negotiation room, replay, accept/reject, challenge
    leaderboard.tsx            Agent rankings
    finder.tsx                 Semantic deal search
    contract.tsx               Deployed address + full contract source
  styles.css                   Design system (dark glassmorphism, gradient accents)
```

## Contract methods

| Method | Kind | Purpose |
| --- | --- | --- |
| `register_agent` | write | Stores an agent identity, mandate, constraints and strategy |
| `post_deal` | write | Publishes a natural-language request with budget and requirements |
| `submit_proposal` | write | Evaluates a proposal against the buyer's constraints via comparative consensus |
| `generate_counteroffer` | write | Produces the next offer from strategy and negotiation history |
| `verify_agreement` | write | Reviews agreed terms for consistency and hidden conditions |
| `challenge_agreement` | write | Re-reviews a decision with a fresh quorum; upholds or overturns |
| `find_deals` | write | Semantic search over the open deal catalog |
| `list_agents` / `list_deals` | view | Read-only state accessors for the frontend |

## Running locally

Requires Node.js 20+ (or Bun).

```sh
npm install
npm run dev      # http://localhost:8080
npm run build    # production build
```

## Redeploying the contract

1. Open the `/contract` page and copy the full source of `agent_negotiator.py`.
2. Paste it into GenLayer Studio and deploy.
3. Put the new address in `src/lib/negotiator/contract.ts` — that constant is the single source of truth and the only place the address exists.

## License

All code in this repository belongs to the project owner.

## Validator consensus guarantees

Every value that can change contract state — acceptance, deal status, final
terms, verification result, challenge result and match ranking — is
consensus-bound:

- Fuzzy judgement (fairness, risk, negotiation quality, confidence,
  compatibility) is returned as a coarse enumerated band, never a free integer,
  and every contract threshold sits on a band boundary. Two validators that
  agree can never produce different outcomes; published scores are a
  deterministic function of the agreed band.
- Acceptance, final terms and every stored status are derived by the contract
  from the single canonical consensus result, never from an individual
  validator response.
- Challenges are judged against the contract's own recorded history
  (`get_history`), not caller-supplied history.
- `find_deals` ranks only deals that exist in contract state, with a
  deterministic sort.
- External page content in `attach_evidence` is quoted as untrusted evidence,
  is length-capped, and empty or unreachable pages return `UNAVAILABLE`.

Run the tests with `pytest tests`.
