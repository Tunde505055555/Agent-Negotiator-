import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { evaluateProposal, generateCounter, reviewChallenge, verifyDeal } from "./engine";
import { SEED_AGENTS, SEED_DEALS } from "./seed";
import type {
  Agent,
  AgentRole,
  Deal,
  Proposal,
  ProposalAction,
  ProposalTerms,
  Strategy,
} from "./types";

const KEY = "agent-negotiator-state-v1";

interface State {
  agents: Agent[];
  deals: Deal[];
}

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface NewAgentInput {
  name: string;
  role: AgentRole;
  identity: string;
  wallet: string;
  objective: string;
  budget: number;
  preferences: string[];
  constraints: string[];
  strategy: Strategy;
}

export interface NewDealInput {
  title: string;
  request: string;
  buyerAgentId: string;
  budget: number;
  deadlineDays: number;
  requirements: string[];
  sellerAgentIds: string[];
}

interface Ctx extends State {
  agentById: (id: string) => Agent | undefined;
  dealById: (id: string) => Deal | undefined;
  createAgent: (input: NewAgentInput) => Agent;
  postDeal: (input: NewDealInput) => Deal;
  joinDeal: (dealId: string, agentId: string) => void;
  submitProposal: (args: {
    dealId: string;
    agentId: string;
    action: ProposalAction;
    terms: ProposalTerms;
    note: string;
    autoCounter?: boolean;
  }) => void;
  acceptProposal: (dealId: string, proposalId: string) => void;
  rejectProposal: (dealId: string, proposalId: string, agentId: string) => void;
  withdraw: (dealId: string, agentId: string) => void;
  challengeDeal: (dealId: string, claim: string) => void;
  resetDemo: () => void;
}

const NegotiatorContext = createContext<Ctx | null>(null);

export function NegotiatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ agents: SEED_AGENTS, deals: SEED_DEALS });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        if (parsed.agents?.length) setState(parsed);
      }
    } catch {
      /* ignore corrupt cache */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full */
    }
  }, [state, hydrated]);

  const agentById = useCallback(
    (id: string) => state.agents.find((a) => a.id === id),
    [state.agents],
  );
  const dealById = useCallback((id: string) => state.deals.find((d) => d.id === id), [state.deals]);

  const createAgent = useCallback((input: NewAgentInput) => {
    const agent: Agent = {
      ...input,
      id: uid("ag"),
      createdAt: Date.now(),
      stats: {
        dealsCompleted: 0,
        negotiationsWon: 0,
        failed: 0,
        totalScore: 0,
        scoredDeals: 0,
        proposalsMade: 0,
        proposalsAccepted: 0,
        savings: 0,
        streak: 0,
      },
    };
    setState((s) => ({ ...s, agents: [agent, ...s.agents] }));
    return agent;
  }, []);

  const postDeal = useCallback((input: NewDealInput) => {
    const deal: Deal = {
      ...input,
      id: uid("dl"),
      status: "open",
      createdAt: Date.now(),
      proposals: [],
    };
    setState((s) => ({ ...s, deals: [deal, ...s.deals] }));
    return deal;
  }, []);

  const joinDeal = useCallback((dealId: string, agentId: string) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) =>
        d.id === dealId && !d.sellerAgentIds.includes(agentId)
          ? { ...d, sellerAgentIds: [...d.sellerAgentIds, agentId] }
          : d,
      ),
    }));
  }, []);

  const submitProposal = useCallback<Ctx["submitProposal"]>(
    ({ dealId, agentId, action, terms, note, autoCounter = true }) => {
      setState((s) => {
        const deal = s.deals.find((d) => d.id === dealId);
        if (!deal) return s;
        const buyer = s.agents.find((a) => a.id === deal.buyerAgentId);
        const author = s.agents.find((a) => a.id === agentId);
        const seller = author?.role === "seller" ? author : s.agents.find((a) => a.id === deal.sellerAgentIds[0]);

        const round = deal.proposals.length + 1;
        const proposal: Proposal = {
          id: uid("p"),
          dealId,
          agentId,
          round,
          action,
          terms,
          note,
          createdAt: Date.now(),
        };
        proposal.evaluation = evaluateProposal(deal, proposal, buyer, seller);

        let proposals = [...deal.proposals, proposal];
        let nextDeal: Deal = { ...deal, proposals, status: "negotiating" };

        // Smart counteroffer: the counterparty answers automatically when a
        // constraint is violated and the negotiation has rounds left.
        const counterparty =
          author?.role === "seller" ? buyer : s.agents.find((a) => a.id === deal.sellerAgentIds[0]);
        if (autoCounter && !proposal.evaluation.accepted && counterparty && round < 6) {
          const counter = generateCounter(nextDeal, proposal, counterparty, proposal.evaluation);
          counter.evaluation = evaluateProposal(nextDeal, counter, buyer, seller);
          proposals = [...proposals, counter];
          nextDeal = { ...nextDeal, proposals };
        }

        // Acceptance + on-chain style verification of the final agreement.
        const closing = proposals[proposals.length - 1];
        if (closing?.evaluation?.accepted) {
          const verification = verifyDeal(nextDeal, closing.evaluation);
          nextDeal = {
            ...nextDeal,
            agreement: {
              terms: closing.terms,
              evaluation: closing.evaluation,
              agreedAt: Date.now(),
            },
            verification,
            status:
              verification.status === "VERIFIED"
                ? "verified"
                : verification.status === "NEEDS REVIEW"
                  ? "needs_review"
                  : "rejected",
          };
        }

        const agents = s.agents.map((a) => {
          if (a.id !== agentId) return a;
          const won = closing?.evaluation?.accepted && closing.agentId === agentId;
          return {
            ...a,
            stats: {
              ...a.stats,
              proposalsMade: a.stats.proposalsMade + 1,
              proposalsAccepted: a.stats.proposalsAccepted + (proposal.evaluation?.accepted ? 1 : 0),
              negotiationsWon: a.stats.negotiationsWon + (won ? 1 : 0),
              streak: proposal.evaluation?.accepted ? a.stats.streak + 1 : 0,
            },
          };
        });

        return {
          agents,
          deals: s.deals.map((d) => (d.id === dealId ? nextDeal : d)),
        };
      });
    },
    [],
  );

  const acceptProposal = useCallback((dealId: string, proposalId: string) => {
    setState((s) => {
      const deal = s.deals.find((d) => d.id === dealId);
      const proposal = deal?.proposals.find((p) => p.id === proposalId);
      if (!deal || !proposal?.evaluation) return s;
      const verification = verifyDeal(deal, proposal.evaluation);
      const nextDeal: Deal = {
        ...deal,
        agreement: { terms: proposal.terms, evaluation: proposal.evaluation, agreedAt: Date.now() },
        verification,
        status:
          verification.status === "VERIFIED"
            ? "verified"
            : verification.status === "NEEDS REVIEW"
              ? "needs_review"
              : "rejected",
        proposals: [
          ...deal.proposals,
          {
            id: uid("p"),
            dealId,
            agentId: deal.buyerAgentId,
            round: deal.proposals.length + 1,
            action: "accept" as ProposalAction,
            terms: proposal.terms,
            note: `Accepted round ${proposal.round} terms. GenLayer verdict: ${verification.status}.`,
            createdAt: Date.now(),
            evaluation: proposal.evaluation,
          },
        ],
      };

      const participants = new Set([deal.buyerAgentId, proposal.agentId]);
      const savings = Math.max(0, deal.budget - proposal.terms.price);
      const agents = s.agents.map((a) => {
        if (!participants.has(a.id)) return a;
        return {
          ...a,
          stats: {
            ...a.stats,
            dealsCompleted: a.stats.dealsCompleted + 1,
            totalScore: a.stats.totalScore + proposal.evaluation!.negotiation_score,
            scoredDeals: a.stats.scoredDeals + 1,
            savings: a.stats.savings + (a.role === "buyer" ? savings : 0),
            negotiationsWon: a.stats.negotiationsWon + (a.id === proposal.agentId ? 1 : 0),
            streak: a.stats.streak + 1,
          },
        };
      });

      return { agents, deals: s.deals.map((d) => (d.id === dealId ? nextDeal : d)) };
    });
  }, []);

  const rejectProposal = useCallback((dealId: string, proposalId: string, agentId: string) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== dealId) return d;
        const target = d.proposals.find((p) => p.id === proposalId);
        if (!target) return d;
        return {
          ...d,
          status: "negotiating",
          proposals: [
            ...d.proposals,
            {
              id: uid("p"),
              dealId,
              agentId,
              round: d.proposals.length + 1,
              action: "reject" as ProposalAction,
              terms: target.terms,
              note: `Rejected round ${target.round}: ${
                target.evaluation?.requirements_failed[0] ?? "terms outside mandate"
              }.`,
              createdAt: Date.now(),
            },
          ],
        };
      }),
    }));
  }, []);

  const withdraw = useCallback((dealId: string, agentId: string) => {
    setState((s) => ({
      ...s,
      agents: s.agents.map((a) =>
        a.id === agentId ? { ...a, stats: { ...a.stats, failed: a.stats.failed + 1, streak: 0 } } : a,
      ),
      deals: s.deals.map((d) =>
        d.id === dealId
          ? {
              ...d,
              status: "failed",
              proposals: [
                ...d.proposals,
                {
                  id: uid("p"),
                  dealId,
                  agentId,
                  round: d.proposals.length + 1,
                  action: "withdraw" as ProposalAction,
                  terms:
                    d.proposals[d.proposals.length - 1]?.terms ?? {
                      price: d.budget,
                      deadlineDays: d.deadlineDays,
                      deliverables: [],
                      quality: "",
                      penalties: "",
                      paymentTerms: "",
                    },
                  note: "Withdrew from the negotiation; mandate limits reached.",
                  createdAt: Date.now(),
                },
              ],
            }
          : d,
      ),
    }));
  }, []);

  const challengeDeal = useCallback((dealId: string, claim: string) => {
    setState((s) => ({
      ...s,
      deals: s.deals.map((d) => {
        if (d.id !== dealId) return d;
        const challenge = reviewChallenge(d, claim);
        return {
          ...d,
          challenge,
          status: challenge.final_decision === "OVERTURNED" ? "needs_review" : d.status,
        };
      }),
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState({ agents: SEED_AGENTS, deals: SEED_DEALS });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      agentById,
      dealById,
      createAgent,
      postDeal,
      joinDeal,
      submitProposal,
      acceptProposal,
      rejectProposal,
      withdraw,
      challengeDeal,
      resetDemo,
    }),
    [
      state,
      agentById,
      dealById,
      createAgent,
      postDeal,
      joinDeal,
      submitProposal,
      acceptProposal,
      rejectProposal,
      withdraw,
      challengeDeal,
      resetDemo,
    ],
  );

  return <NegotiatorContext.Provider value={value}>{children}</NegotiatorContext.Provider>;
}

export function useNegotiator() {
  const ctx = useContext(NegotiatorContext);
  if (!ctx) throw new Error("useNegotiator must be used inside NegotiatorProvider");
  return ctx;
}

export function avgScore(agent: Agent) {
  return agent.stats.scoredDeals ? Math.round(agent.stats.totalScore / agent.stats.scoredDeals) : 0;
}

export function acceptanceRate(agent: Agent) {
  return agent.stats.proposalsMade
    ? Math.round((agent.stats.proposalsAccepted / agent.stats.proposalsMade) * 100)
    : 0;
}
