export type AgentRole = "buyer" | "seller";

export type Strategy = "aggressive" | "balanced" | "cooperative" | "best_value";

export const STRATEGIES: { id: Strategy; label: string; blurb: string }[] = [
  { id: "aggressive", label: "Aggressive", blurb: "Pushes hard on price, concedes late." },
  { id: "balanced", label: "Balanced", blurb: "Trades price against deadline evenly." },
  { id: "cooperative", label: "Cooperative", blurb: "Concedes early to close fast." },
  { id: "best_value", label: "Best Value", blurb: "Optimises value per dollar, not price." },
];

export interface AgentStats {
  dealsCompleted: number;
  negotiationsWon: number;
  failed: number;
  totalScore: number;
  scoredDeals: number;
  proposalsMade: number;
  proposalsAccepted: number;
  savings: number;
  streak: number;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  identity: string;
  wallet: string;
  objective: string;
  budget: number;
  preferences: string[];
  constraints: string[];
  strategy: Strategy;
  createdAt: number;
  stats: AgentStats;
}

export type ProposalAction = "offer" | "counter" | "accept" | "reject" | "withdraw";

export interface ProposalTerms {
  price: number;
  deadlineDays: number;
  deliverables: string[];
  quality: string;
  penalties: string;
  paymentTerms: string;
}

export interface ValidatorVote {
  validator: string;
  vote: "agree" | "disagree";
  note: string;
}

/** Structured result returned by the GenLayer Intelligent Contract. */
export interface GenLayerEvaluation {
  proposal_status: "valid" | "conflicting" | "invalid";
  accepted: boolean;
  price: number;
  deadline: number;
  requirements_satisfied: string[];
  requirements_failed: string[];
  fairness_score: number;
  risk_score: number;
  negotiation_score: number;
  confidence: number;
  reason: string;
  final_terms: string;
  hidden_conditions: string[];
  validators: ValidatorVote[];
}

export interface Proposal {
  id: string;
  dealId: string;
  agentId: string;
  round: number;
  action: ProposalAction;
  terms: ProposalTerms;
  note: string;
  createdAt: number;
  evaluation?: GenLayerEvaluation;
}

export type DealStatus =
  | "open"
  | "negotiating"
  | "agreed"
  | "verified"
  | "needs_review"
  | "rejected"
  | "failed";

export interface Verification {
  status: "VERIFIED" | "NEEDS REVIEW" | "REJECTED";
  reason: string;
  confidence: number;
  validators: ValidatorVote[];
}

export interface Challenge {
  challenge_status: "reviewed";
  original_decision: string;
  final_decision: "UPHELD" | "OVERTURNED";
  reason: string;
  confidence: number;
  claim: string;
  createdAt: number;
}

export interface Deal {
  id: string;
  title: string;
  request: string;
  buyerAgentId: string;
  sellerAgentIds: string[];
  budget: number;
  deadlineDays: number;
  requirements: string[];
  status: DealStatus;
  createdAt: number;
  proposals: Proposal[];
  agreement?: { terms: ProposalTerms; evaluation: GenLayerEvaluation; agreedAt: number };
  verification?: Verification;
  challenge?: Challenge;
}
