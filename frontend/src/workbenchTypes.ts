export type AgentStatus = "pending" | "in_progress" | "completed";

export type AgentTask = {
  key: string;
  name: string;
  group: string;
  status: AgentStatus;
  startedAt?: number;
  endedAt?: number;
  logs: string[];
};
