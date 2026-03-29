import type { ConversationSummary, Message, WorkflowResponse } from "./types";

const API_BASE = "http://localhost:8000/api";
const API_KEY = "dev-demo-key";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }
  return (await res.json()) as T;
}

export function createConversation() {
  return request<{ conversation_id: string; assistant_message: string; created_at: string }>("/conversations", {
    method: "POST",
  });
}

export function listConversations() {
  return request<ConversationSummary[]>("/conversations");
}

export function getMessages(conversationId: string) {
  return request<Message[]>(`/conversations/${conversationId}/messages`);
}

export function getWorkflow(conversationId: string) {
  return request<WorkflowResponse>(`/conversations/${conversationId}/workflow`);
}

export function submitStep(conversationId: string, step_key: string, value: unknown) {
  return request<WorkflowResponse>(`/conversations/${conversationId}/workflow`, {
    method: "POST",
    body: JSON.stringify({ step_key, value }),
  });
}

export function streamRun(conversationId: string, supplementalPrompt?: string | null) {
  const url = new URL(`${API_BASE}/conversations/${conversationId}/run`);
  const body = JSON.stringify({ supplemental_prompt: supplementalPrompt ?? null });
  return fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body,
  });
}
