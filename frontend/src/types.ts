export interface StepOption {
  label: string;
  value: string | number;
}

export interface WorkflowStep {
  key: string;
  order: number;
  title: string;
  prompt: string;
  kind: string;
  required: boolean;
  options: StepOption[];
}

export interface ConversationSummary {
  conversation_id: string;
  title: string;
  updated_at: string;
}

export interface Message {
  role: string;
  content: unknown;
  token_count?: number | null;
  model?: string | null;
  created_at: string;
}

export interface WorkflowResponse {
  conversation_id: string;
  next_step_key: string | null;
  completed: boolean;
  workflow_steps: WorkflowStep[];
  state: Record<string, unknown>;
}
