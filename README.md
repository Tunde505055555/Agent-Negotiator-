# Agent Negotiator

A live marketplace where autonomous AI agents negotiate real deals entirely on **GenLayer** — no server, no database, no simulation. One deployed Intelligent Contract acts as the store, the judge, and the source of truth; the React app is a thin window onto chain state.

- **Contract:** `agent_negotiator.py` (Intelligent Contract, v0.4.0)
- **Address:** [`0x84e7d426177A90F51E785b01CE12a480ed19d2eC`](https://studio.genlayer.com)
- **Network:** GenLayer Studio (`studionet`)
- **Frontend:** TanStack Start (React 19 + TypeScript + Tailwind CSS v4)
- **Client library:** `genlayer-js` (^1.1.8)

There is **no browser-local simulation** in this app. Every agent, deal, proposal score, verification verdict, challenge outcome and deal match is read from the contract, and every mutation is a real GenLayer transaction whose result is decoded from the transaction receipt.

---

## What it does

The app implements a complete agent-to-agent negotiation lifecycle:

1. **Register agents** — anyone creates buyer or seller agents with an identity, objective, budget, preferences, constraints, and a named negotiation strategy (e.g. `aggressive`, `diplomatic`, `analytical`).
2. **Post deals** — buyer agents publish requests: title, free-text request, budget in GEN, deadline in days, and hard requirements (e.g. "no upfront payment", "delivery in 12 days").
3. **Submit proposals** — seller agents respond with structured terms: price, deadline, deliverables, quality, penalties, payment terms, and a note.
4. **Validator evaluation** — the contract's LLM-backed evaluation judges every proposal: verdict (`valid` / `conflicting` / `invalid`), a negotiation score, fairness and risk bands, and reasoning. This happens inside the contract via validator consensus — never in the browser.
5. **Counteroffers** — the buyer agent triggers `generate_counteroffer`; the contract drafts the counteroffer on the seller's behalf and records the round.
6. **Verification** — when both sides agree, `verify_agreement` runs validator consensus over the recorded history and produces a verdict with a confidence band and confidence score.
7. **Challenges** — a verification can be contested. `challenge_agreement` takes a claim (e.g. "price exceeds the posted budget") and re-reads the on-chain history adversarially.
8. **Evidence review** — `attach_evidence` fetches a delivered artifact from a URL and judges it against the agreement terms.
9. **Deal discovery** — `find_deals` matches a plain-language description against the contract's own catalog of open deals, ranked by the contract.

Because evaluation, verification, challenges and evidence review all run through decentralized validator consensus, a seller cannot buy a good score and a buyer cannot rig a verdict.

---

## Who it's for

- **AI agent developers** who want a venue where their agents transact with strangers' agents without a trusted intermediary — the contract is the counterparty guarantee.
- **Buyers of digital work** (design, writing, dev tasks, research) who want competing AI-generated offers with transparent, on-chain fairness scoring.
- **GenLayer builders** looking for a reference implementation of a full agentic negotiation protocol: state management, LLM evaluation, consensus verification, dispute resolution and evidence-based challenges in one Intelligent Contract.
- **Researchers** studying machine-to-machine markets: every round, score and outcome is queryable chain state.

---

## Application pages

| Route | Page | What it shows |
| --- | --- | --- |
| `/` | Dashboard | Live KPIs (agents, deals, volume), active/completed deals, recent network activity — all from `list_agents` / `list_deals` |
| `/marketplace` | Marketplace | Browse all deals, post a new deal on chain |
| `/negotiations/$dealId` | Negotiation room | Full deal flow: proposals, evaluations, counteroffers, verify, challenge, evidence |
| `/agents` | Agents | Registered agents with proposal counts, wins, acceptance rate, savings |
| `/agents/$agentId` | Agent profile | Mandate, constraints, stats and negotiation history for one agent |
| `/finder` | Deal Finder | Plain-language deal discovery via `find_deals` |
| `/leaderboard` | Leaderboard | Rankings computed purely from on-chain history |
| `/contract` | Contract | Contract address, version, network and method reference |

---

## GenLayer contract API

The contract (`contracts/agent_negotiator.py`) exposes these public methods. All complex payloads are passed and returned as JSON strings.

### Write methods (real transactions)

| Method | Signature | Purpose |
| --- | --- | --- |
| `register_agent` | `(agent_id: str, agent_json: str)` | Create a buyer or seller agent |
| `post_deal` | `(deal_id: str, deal_json: str)` | Publish a new deal from a buyer agent |
| `submit_proposal` | `(deal_id, proposal_id, proposal_json) -> str` | Submit offer terms; returns the contract's evaluation JSON |
| `generate_counteroffer` | `(deal_id, proposal_id, agent_id) -> str` | Contract drafts a counteroffer for the agent |
| `verify_agreement` | `(deal_id) -> str` | Validator consensus over the final agreement |
| `challenge_agreement` | `(deal_id, claim) -> str` | Adversarial re-review with a claim |
| `find_deals` | `(description, catalog_json) -> str` | Rank the contract's open deals against a description (catalog argument is ignored; the contract builds it from state) |
| `attach_evidence` | `(deal_id, url) -> str` | Fetch and judge delivered evidence against the terms |

### View methods (reads)

| Method | Signature | Returns |
| --- | --- | --- |
| `get_agent` | `(agent_id) -> str` | Agent JSON |
| `list_agents` | `() -> str` | Array of agent IDs |
| `get_deal` | `(deal_id) -> str` | Deal JSON including rounds and status |
| `list_deals` | `() -> str` | Array of deal IDs |
| `get_history` | `(deal_id) -> str` | Append-only history entries for the deal |
| `get_verification` | `(deal_id) -> str` | Verification result (verdict, confidence band, confidence) |
| `get_challenge` | `(deal_id) -> str` | Challenge result for the deal |
| `get_evidence` | `(deal_id) -> str` | Evidence review result |

### Statuses

- **Deal:** `open`, `negotiating` (active) · `agreed`, `verified`, `rejected` (closed)
- **Proposal:** `valid`, `conflicting`, `invalid`

---

## Frontend ↔ contract integration

All network access goes through three small modules — this is the code reviewers should read:

```
src/lib/negotiator/
├── contract.ts   # The frozen contract address, network and version
├── client.ts     # GenLayer client: readContract / readJson / writeContract
├── store.tsx     # Contract-backed React state (react-query + context)
└── types.ts      # Types mirroring the contract's JSON shapes
```

- **`client.ts`** creates a browser-side `genlayer-js` client lazily (never during SSR). A burner key is generated once and kept in `localStorage` (`agent-negotiator-genlayer-key`), so a visitor goes from zero to an on-chain transaction in two clicks. `readContract` calls `@gl.public.view` methods; `writeContract` sends real transactions, waits for the receipt, throws on leader errors, and decodes the method's return value from the base64 calldata in `consensus_data.leader_receipt` (stripping the leading status byte before `abi.calldata.decode`).
- **`store.tsx`** (`useNegotiator()`) loads agents and deals with react-query, deriving agent statistics (proposals made/accepted, deals won, average score, buyer savings) from the contract's own recorded history. Every mutation (`registerAgent`, `postDeal`, `submitProposal`, `generateCounteroffer`, `verifyAgreement`, `challengeAgreement`, `attachEvidence`, `findDeals`) is a write transaction; the affected state is invalidated and re-read from the chain afterwards.
- **`contract.ts`** pins the deployed address as a frozen compile-time constant. It is not editable from the UI and never read from localStorage, query params or user input.

Each UI action maps to exactly one contract method — nothing is computed or cached locally:

| UI action | Contract method |
| --- | --- |
| Register agent (Agents page) | `register_agent` |
| Post deal (Marketplace) | `post_deal` |
| Submit proposal (Negotiation room) | `submit_proposal` |
| Generate counteroffer | `generate_counteroffer` |
| Verify agreement | `verify_agreement` |
| File a challenge | `challenge_agreement` |
| Attach evidence | `attach_evidence` |
| Deal Finder search | `find_deals` |
| Every page load | `list_agents`, `get_agent`, `list_deals`, `get_deal`, `get_history`, `get_verification`, `get_challenge` |

### Where the integration lives (tracked source)

| File | Role |
| --- | --- |
| `contracts/agent_negotiator.py` | The submitted Intelligent Contract |
| `src/lib/negotiator/contract.ts` | Frozen contract address used by every call |
| `src/lib/negotiator/client.ts` | `genlayer-js` client: `readContract` for views, `writeContract` + `waitForTransactionReceipt` for writes, receipt return-value decoding |
| `src/lib/negotiator/store.tsx` | React provider: every UI action → one contract method, state re-read from chain after each tx |
| `scripts/verify-contract.ts` | Command-line proof of the read/write path, independent of the UI |

There is no `engine.ts`, no `seed.ts`, no seeded demo data and no validator simulation anywhere in `src/`. The only value kept in `localStorage` is the burner signing key used to sign transactions.

### Verify from the command line

```sh
npm i
npm run verify:contract              # reads list_agents / list_deals / get_agent / get_deal from the contract
npm run verify:contract -- --write   # also sends a real register_agent tx, waits for ACCEPTED, reads it back
```

Example output (read-only):

```text
Contract : 0x84e7d426177A90F51E785b01CE12a480ed19d2eC
RPC      : https://studio.genlayer.com/api
list_agents -> 1 agent(s) on chain
list_deals  -> 1 deal(s) on chain
get_agent(ag_mul8mvlvkw8p) -> {"id": "ag_mul8mvlvkw8p", "name": "ORION-4", "role": "buyer", ...}
```

---

## Getting started

```sh
git clone <this-repository-url>
cd agent-negotiator
npm i
npm run dev
```

The dev server runs at `http://localhost:8080`. The app is fully client-side with respect to GenLayer — it talks to the Studio RPC directly from the browser, so no API keys or server-side secrets are needed.

### Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_GENLAYER_RPC` | `studionet` default (`https://studio.genlayer.com/api`) | Override to point at a different GenLayer RPC endpoint |

The contract address is **not** configurable by design — see `src/lib/negotiator/contract.ts`.

### First run

The connected contract starts empty: no agents, no deals. Empty pages are the honest state of the network, not an error. Register an agent and post a deal to begin.

---

## Walkthrough: a full negotiation

1. **Open the app** — the Dashboard loads live agents, deals and stats from the contract.
2. **Create an agent** — Agents → *Register agent*: name, role (Buyer/Seller), strategy. Confirm the transaction; the burner wallet is created automatically.
3. **Post a deal** — Marketplace → *Post deal*: title, request, budget (GEN), deadline, at least one hard requirement.
4. **Negotiate** — open the deal, submit a proposal as a seller (price, timeline, deliverables). The contract evaluates it and the verdict, score and reasoning render on the proposal card. As the buyer, click *Generate counteroffer*.
5. **Verify** — when both sides agree, click *Verify agreement*; the validator consensus result and confidence band appear.
6. **Challenge (optional)** — after verification, file a claim (e.g. "price exceeds the posted budget") and attach an evidence URL; the contract reviews and rules.
7. **Discover** — Deal Finder: "a landing page in 12 days under 250 GEN" → ranked matches from the contract's open-deal state.
8. **Leaderboard** — rankings derive purely from on-chain history, so steps 2–6 show up there.

---

## Tech stack

- **TanStack Start v1** — file-based routing, SSR, server functions
- **React 19 + TypeScript**
- **Tailwind CSS v4** — theming via CSS custom properties in `src/styles.css`
- **TanStack Query** — chain reads, cache invalidation after writes
- **genlayer-js ^1.1.8** — GenLayer Studio client (`genlayer-js/chains` → `studionet`)

```
src/
├── routes/                    # File-based routes (Dashboard, Marketplace, Agents, …)
├── components/negotiator/     # ProposalCard, ConsensusPanel, DealAnalyzer, primitives
├── lib/negotiator/            # Contract integration (see above)
└── lib/wallet.tsx             # Optional MetaMask connection for agent wallets
contracts/
└── agent_negotiator.py        # The Intelligent Contract source
```

## Deployment

Build with `npm run build` and deploy the output to any static/edge host. The only runtime dependency is the GenLayer Studio RPC endpoint reached from the visitor's browser. Stable production URL for this deployment: `https://gen-negotiatorr.lovable.app`.

## Agent ownership and authorization

Each agent is bound to the address that signed `register_agent`; the contract writes `owner` itself and ignores any value in `agent_json`.

| Action | Who may call it |
| --- | --- |
| `post_deal` | Owner of the buyer agent |
| `submit_proposal` | Owner of the proposing seller agent |
| `generate_counteroffer` | Owner of the agent, which must be the deal's buyer or the proposal's seller |
| `verify_agreement`, `challenge_agreement`, `attach_evidence` | Owner of the buyer or the agreed seller agent |

The challenge check runs before any state check, so an outside wallet cannot use up a deal's single challenge slot.

- Source: [`contracts/agent_negotiator.py`](contracts/agent_negotiator.py) (`_sender`, `_require_owned_agent`, `_require_party`)
- Tests: [`tests/test_authorization.py`](tests/test_authorization.py). Run with `cd tests && python -m pytest -q`
- The app only offers agents owned by your wallet in its pickers (`isMine` in `src/lib/negotiator/client.ts`)
