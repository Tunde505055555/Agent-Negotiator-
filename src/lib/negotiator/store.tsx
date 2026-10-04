/**
 * Contract-backed application state.
 *
 * Every agent, deal, proposal, evaluation, verification and challenge in this
 * provider is read from the deployed Intelligent Contract. Mutations are real
 * GenLayer transactions; after each one the affected state is re-read from the
 * chain. There is no local evaluation and no cached demo data.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { readJson, readJsonOrNull, signerAddress, writeContract } from "./client";
import type {
  Agent,
  AgentRole,
  ChainAgent,
  Deal,
  DealMatch,
  EvidenceReview,
  HistoryEntry,
  ProposalTerms,
  Strategy,
  Verification,
  Challenge,
} from "./types";
import { proposalRounds } from "./types";

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

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
}

export interface NewProposalInput {
  dealId: string;
  agentId: string;
  price: number;
  deadlineDays: number;
  deliverables: string[];
  quality: string;
  penalties: string;
  paymentTerms: string;
  note: string;
}

interface Ctx {
  agents: Agent[];
  deals: Deal[];
  loading: boolean;
  error: string | null;
  /** Label of the transaction currently awaiting consensus, if any. */
  pending: string | null;
  signer: string | null;
  refresh: () => void;
  agentById: (id: string) => Agent | undefined;
  dealById: (id: string) => Deal | undefined;
  registerAgent: (input: NewAgentInput) => Promise<string>;
  postDeal: (input: NewDealInput) => Promise<string>;
  submitProposal: (input: NewProposalInput) => Promise<void>;
  generateCounteroffer: (dealId: string, proposalId: string, agentId: string) => Promise<void>;
  verifyAgreement: (dealId: string) => Promise<void>;
  challengeAgreement: (dealId: string, claim: string) => Promise<void>;
  attachEvidence: (dealId: string, url: string) => Promise<EvidenceReview | null>;
  findDeals: (description: string) => Promise<DealMatch[]>;
  finding: boolean;
}

const NegotiatorContext = createContext<Ctx | null>(null);

async function loadAgents(): Promise<ChainAgent[]> {
  const ids = await readJson<string[]>("list_agents");
  return Promise.all(ids.map((id) => readJson<ChainAgent>("get_agent", [id])));
}

async function loadDeals(): Promise<Deal[]> {
  const ids = await readJson<string[]>("list_deals");
  return Promise.all(
    ids.map(async (id) => {
      const [deal, history, verification, challenge] = await Promise.all([
        readJson<Record<string, unknown>>("get_deal", [id]),
        readJson<HistoryEntry[]>("get_history", [id]),
        readJsonOrNull<Verification>("get_verification", [id]),
        readJsonOrNull<Challenge>("get_challenge", [id]),
      ]);
      return {
        ...({ requirements: [] } as Partial<Deal>),
        ...(deal as unknown as Deal),
        history,
        verification,
        challenge,
      } as Deal;
    }),
  );
}

/** Derives agent statistics from the contract's own recorded history. */
function withStats(agents: ChainAgent[], deals: Deal[]): Agent[] {
  const base = new Map<string, Agent>(
    agents.map((a) => [
      a.id,
      {
        ...a,
        stats: {
          proposalsMade: 0,
          proposalsAccepted: 0,
          dealsWon: 0,
          totalScore: 0,
          scoredDeals: 0,
          savings: 0,
        },
      },
    ]),
  );

  for (const deal of deals) {
    for (const round of proposalRounds(deal)) {
      const agent = base.get(round.agent_id);
      if (!agent) continue;
      agent.stats.proposalsMade += 1;
      agent.stats.totalScore += round.evaluation.negotiation_score;
      agent.stats.scoredDeals += 1;
      if (round.evaluation.accepted) {
        agent.stats.proposalsAccepted += 1;
        agent.stats.dealsWon += 1;
        const buyer = base.get(deal.buyer_agent_id);
        if (buyer) buyer.stats.savings += Math.max(0, deal.budget - round.evaluation.price);
      }
    }
  }
  return [...base.values()];
}

export function NegotiatorProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);
  const [finding, setFinding] = useState(false);

  const agentsQuery = useQuery({
    queryKey: ["genlayer", "agents"],
    queryFn: loadAgents,
    retry: 1,
  });
  const dealsQuery = useQuery({
    queryKey: ["genlayer", "deals"],
    queryFn: loadDeals,
    retry: 1,
  });

  const deals = useMemo(() => dealsQuery.data ?? [], [dealsQuery.data]);
  const agents = useMemo(
    () => withStats(agentsQuery.data ?? [], deals),
    [agentsQuery.data, deals],
  );

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["genlayer"] });
  }, [queryClient]);

  const send = useMutation({
    mutationFn: async ({
      label,
      functionName,
      args,
    }: {
      label: string;
      functionName: string;
      args: unknown[];
    }) => {
      setPending(label);
      try {
        return await writeContract(functionName, args);
      } finally {
        setPending(null);
      }
    },
    onSuccess: () => refresh(),
  });

  const registerAgent = useCallback(
    async (input: NewAgentInput) => {
      const id = uid("ag");
      await send.mutateAsync({
        label: "Registering agent on GenLayer",
        functionName: "register_agent",
        args: [
          id,
          JSON.stringify({
            id,
            name: input.name,
            role: input.role,
            identity: input.identity,
            wallet: input.wallet,
            objective: input.objective,
            budget: input.budget,
            preferences: input.preferences,
            constraints: input.constraints,
            strategy: input.strategy,
          }),
        ],
      });
      return id;
    },
    [send],
  );

  const postDeal = useCallback(
    async (input: NewDealInput) => {
      const id = uid("dl");
      await send.mutateAsync({
        label: "Posting deal on GenLayer",
        functionName: "post_deal",
        args: [
          id,
          JSON.stringify({
            id,
            title: input.title,
            request: input.request,
            buyer_agent_id: input.buyerAgentId,
            budget: input.budget,
            deadline_days: input.deadlineDays,
            requirements: input.requirements,
          }),
        ],
      });
      return id;
    },
    [send],
  );

  const submitProposal = useCallback(
    async (input: NewProposalInput) => {
      const proposalId = uid("p");
      const proposal: ProposalTerms = {
        agent_id: input.agentId,
        price: input.price,
        deadline: input.deadlineDays,
        deliverables: input.deliverables,
        quality: input.quality,
        penalties: input.penalties,
        payment_terms: input.paymentTerms,
        note: input.note,
      };
      await send.mutateAsync({
        label: "Validators are evaluating the proposal",
        functionName: "submit_proposal",
        args: [input.dealId, proposalId, JSON.stringify(proposal)],
      });
    },
    [send],
  );

  const generateCounteroffer = useCallback(
    async (dealId: string, proposalId: string, agentId: string) => {
      await send.mutateAsync({
        label: "Agent is building a counteroffer",
        functionName: "generate_counteroffer",
        args: [dealId, proposalId, agentId],
      });
    },
    [send],
  );

  const verifyAgreement = useCallback(
    async (dealId: string) => {
      await send.mutateAsync({
        label: "Validators are reviewing the final agreement",
        functionName: "verify_agreement",
        args: [dealId],
      });
    },
    [send],
  );

  const challengeAgreement = useCallback(
    async (dealId: string, claim: string) => {
      await send.mutateAsync({
        label: "Validators are re-reading the recorded history",
        functionName: "challenge_agreement",
        args: [dealId, claim],
      });
    },
    [send],
  );

  const attachEvidence = useCallback(
    async (dealId: string, url: string) => {
      await send.mutateAsync({
        label: "Fetching and judging the delivered evidence",
        functionName: "attach_evidence",
        args: [dealId, url],
      });
      return readJsonOrNull<EvidenceReview>("get_evidence", [dealId]);
    },
    [send],
  );

  const findDeals = useCallback(
    async (description: string) => {
      setFinding(true);
      try {
        // find_deals is a write method: the ranking is produced by validator
        // consensus over the contract's own catalog of open deals. The catalog
        // argument is ignored by the contract, which builds it from state.
        const tx = await writeContract("find_deals", [description, ""]);
        if (!tx.returned) return [];
        const parsed = JSON.parse(tx.returned) as { matches?: DealMatch[] };
        return parsed.matches ?? [];

      } finally {
        setFinding(false);
      }
    },
    [],
  );

  const agentById = useCallback((id: string) => agents.find((a) => a.id === id), [agents]);
  const dealById = useCallback((id: string) => deals.find((d) => d.id === id), [deals]);

  const error =
    (agentsQuery.error as Error | null)?.message ?? (dealsQuery.error as Error | null)?.message ?? null;

  const value = useMemo<Ctx>(
    () => ({
      agents,
      deals,
      loading: agentsQuery.isLoading || dealsQuery.isLoading,
      error,
      pending,
      signer: signerAddress(),
      refresh,
      agentById,
      dealById,
      registerAgent,
      postDeal,
      submitProposal,
      generateCounteroffer,
      verifyAgreement,
      challengeAgreement,
      attachEvidence,
      findDeals,
      finding,
    }),
    [
      agents,
      deals,
      agentsQuery.isLoading,
      dealsQuery.isLoading,
      error,
      pending,
      refresh,
      agentById,
      dealById,
      registerAgent,
      postDeal,
      submitProposal,
      generateCounteroffer,
      verifyAgreement,
      challengeAgreement,
      attachEvidence,
      findDeals,
      finding,
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
