const API_BASE = "http://localhost:8000/api";
const API_KEY = "dev-demo-key";
async function request(path, init) {
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
    return (await res.json());
}
export function createConversation() {
    return request("/conversations", {
        method: "POST",
    });
}
export function listConversations() {
    return request("/conversations");
}
export function getMessages(conversationId) {
    return request(`/conversations/${conversationId}/messages`);
}
export function getWorkflow(conversationId) {
    return request(`/conversations/${conversationId}/workflow`);
}
export function submitStep(conversationId, step_key, value) {
    return request(`/conversations/${conversationId}/workflow`, {
        method: "POST",
        body: JSON.stringify({ step_key, value }),
    });
}
export function streamRun(conversationId, supplementalPrompt) {
    const url = new URL(`${API_BASE}/conversations/${conversationId}/run`);
    const body = JSON.stringify({ supplemental_prompt: supplementalPrompt ?? null });
    return fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
        body,
    });
}
