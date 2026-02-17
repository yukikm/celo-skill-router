export type Agent = {
  id: string;
  name: string;
  skills: string[];
  // For demo, each agent has an EVM address we can pay.
  address: `0x${string}`;
};

export type TaskStatus =
  | "OPEN"
  | "ROUTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED";

export type Task = {
  id: string;
  title: string;
  description: string;
  skill: string;
  budgetUsd: string; // keep as string for display
  status: TaskStatus;
  buyerAddress?: `0x${string}`;
  workerAgentId?: string;
  escrowAddress?: `0x${string}`;
  payoutTxHash?: `0x${string}`;
  createdAt: number;
};
