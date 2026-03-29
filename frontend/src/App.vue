<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { createConversation, getMessages, getWorkflow, listConversations, streamRun, submitStep } from "./api";
import type { ConversationSummary, Message, WorkflowStep } from "./types";
import type { AgentStatus, AgentTask } from "./workbenchTypes";
import ConversationSidebar from "./components/ConversationSidebar.vue";
import ChatMessageList from "./components/ChatMessageList.vue";
import StepWorkflowPanel from "./components/StepWorkflowPanel.vue";
import WorkbenchPanel from "./components/WorkbenchPanel.vue";

const conversations = ref<ConversationSummary[]>([]);
const activeConversationId = ref("");
const workflowSteps = ref<WorkflowStep[]>([]);
const nextStepKey = ref<string | null>(null);
const state = ref<Record<string, unknown>>({});
const messages = ref<Message[]>([]);
const running = ref(false);
const errorMessage = ref("");
const eventLog = ref<string[]>([]);
const nowTs = ref(Date.now());
const highlightedMessageIndex = ref<number | null>(null);
const taskBoard = ref<AgentTask[]>([]);
let timer: number | undefined;

const analystMapping: Record<string, string> = { market: "Market Analyst", social: "Social Analyst", news: "News Analyst", fundamentals: "Fundamentals Analyst" };
const fixedAgents: AgentTask[] = [
  { key: "bull", name: "Bull Researcher", group: "Research Team", status: "pending", logs: [] },
  { key: "bear", name: "Bear Researcher", group: "Research Team", status: "pending", logs: [] },
  { key: "research_manager", name: "Research Manager", group: "Research Team", status: "pending", logs: [] },
  { key: "trader", name: "Trader", group: "Trading Team", status: "pending", logs: [] },
  { key: "aggressive", name: "Aggressive Analyst", group: "Risk Team", status: "pending", logs: [] },
  { key: "neutral", name: "Neutral Analyst", group: "Risk Team", status: "pending", logs: [] },
  { key: "conservative", name: "Conservative Analyst", group: "Risk Team", status: "pending", logs: [] },
  { key: "portfolio", name: "Portfolio Manager", group: "Portfolio", status: "pending", logs: [] },
];

const activeStep = computed(() => workflowSteps.value.find((s) => s.key === nextStepKey.value) || null);
const canRun = computed(() => !!activeConversationId.value && nextStepKey.value === null && !running.value);
const selectedAnalysts = computed(() => (Array.isArray(state.value.analysts) ? (state.value.analysts as string[]) : []));
const completedCount = computed(() => taskBoard.value.filter((x) => x.status === "completed").length);
const progressPercent = computed(() => (taskBoard.value.length ? Math.round((completedCount.value / taskBoard.value.length) * 100) : 0));

function updateState(key: string, value: unknown) {
  state.value = { ...state.value, [key]: value };
}

async function loadConversations() {
  conversations.value = await listConversations();
}

async function openConversation(id: string) {
  activeConversationId.value = id;
  messages.value = await getMessages(id);
  const wf = await getWorkflow(id);
  workflowSteps.value = wf.workflow_steps;
  nextStepKey.value = wf.next_step_key;
  state.value = wf.state;
}

async function createNewConversation() {
  const created = await createConversation();
  await loadConversations();
  await openConversation(created.conversation_id);
}

async function submitValue(stepKey: string, value: unknown) {
  if (!activeConversationId.value) return;
  errorMessage.value = "";
  try {
    const wf = await submitStep(activeConversationId.value, stepKey, value);
    workflowSteps.value = wf.workflow_steps;
    nextStepKey.value = wf.next_step_key;
    state.value = wf.state;
    messages.value = await getMessages(activeConversationId.value);
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : "步骤提交失败";
  }
}

function initializeTaskBoard() {
  const analysts = selectedAnalysts.value.map((x) => ({ key: x, name: analystMapping[x] || x, group: "Analyst Team", status: "pending" as AgentStatus, logs: [] as string[] }));
  taskBoard.value = [...analysts, ...fixedAgents.map((x) => ({ ...x }))];
  if (taskBoard.value[0]) {
    taskBoard.value[0].status = "in_progress";
    taskBoard.value[0].startedAt = Date.now();
  }
}

function markTask(name: string, status: AgentStatus, log: string | null, messageIndex: number | null) {
  const task = taskBoard.value.find((x) => x.name === name);
  if (!task) return;
  if (task.status !== "completed") {
    if (status === "in_progress" && !task.startedAt) task.startedAt = Date.now();
    if (status === "completed") {
      if (!task.startedAt) task.startedAt = Date.now();
      task.endedAt = Date.now();
    }
    if (!(task.status === "in_progress" && status === "pending")) task.status = status;
  }
  if (messageIndex !== null) task.lastMessageIndex = messageIndex;
  if (log) {
    const last = task.logs[task.logs.length - 1];
    if (last !== log) task.logs = [...task.logs, log].slice(-20);
  }
}

function updateTaskBoardFromChunk(raw: Record<string, unknown>, messageIndex: number | null) {
  if (raw.market_report) markTask("Market Analyst", "completed", "Market report generated", messageIndex);
  if (raw.sentiment_report) markTask("Social Analyst", "completed", "Sentiment report generated", messageIndex);
  if (raw.news_report) markTask("News Analyst", "completed", "News report generated", messageIndex);
  if (raw.fundamentals_report) markTask("Fundamentals Analyst", "completed", "Fundamental report generated", messageIndex);
  const invest = raw.investment_debate_state as Record<string, string> | undefined;
  if (invest?.bull_history) markTask("Bull Researcher", "in_progress", "Bull argument updated", messageIndex);
  if (invest?.bear_history) markTask("Bear Researcher", "in_progress", "Bear argument updated", messageIndex);
  if (invest?.judge_decision) {
    markTask("Bull Researcher", "completed", null, messageIndex);
    markTask("Bear Researcher", "completed", null, messageIndex);
    markTask("Research Manager", "completed", "Research manager decision finished", messageIndex);
    markTask("Trader", "in_progress", null, messageIndex);
  }
  if (raw.trader_investment_plan) {
    markTask("Trader", "completed", "Trader investment plan generated", messageIndex);
    markTask("Aggressive Analyst", "in_progress", null, messageIndex);
    markTask("Neutral Analyst", "in_progress", null, messageIndex);
    markTask("Conservative Analyst", "in_progress", null, messageIndex);
  }
  const risk = raw.risk_debate_state as Record<string, string> | undefined;
  if (risk?.aggressive_history) markTask("Aggressive Analyst", "in_progress", "Aggressive risk view updated", messageIndex);
  if (risk?.neutral_history) markTask("Neutral Analyst", "in_progress", "Neutral risk view updated", messageIndex);
  if (risk?.conservative_history) markTask("Conservative Analyst", "in_progress", "Conservative risk view updated", messageIndex);
  if (risk?.judge_decision) {
    markTask("Aggressive Analyst", "completed", null, messageIndex);
    markTask("Neutral Analyst", "completed", null, messageIndex);
    markTask("Conservative Analyst", "completed", null, messageIndex);
    markTask("Portfolio Manager", "in_progress", "Risk debate judged, portfolio manager started", messageIndex);
  }
  if (raw.final_trade_decision) markTask("Portfolio Manager", "completed", "Final trade decision completed", messageIndex);
}

function formatEventText(payload: Record<string, unknown>) {
  if (payload.type === "chunk" && payload.content) return `LLM: ${String(payload.content).slice(0, 80)}`;
  return `事件: ${JSON.stringify(payload).slice(0, 90)}`;
}

async function runAnalysis() {
  if (!activeConversationId.value) return;
  running.value = true;
  errorMessage.value = "";
  eventLog.value = [];
  initializeTaskBoard();
  try {
    const response = await streamRun(activeConversationId.value, (state.value.supplemental_prompt as string) || null);
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";
      for (const event of events) {
        if (!event.includes("data:")) continue;
        const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
        if (!dataLine) continue;
        const payload = JSON.parse(dataLine.replace("data:", "").trim());
        let messageIndex: number | null = null;
        if (payload.content) {
          messages.value.push({ role: "assistant", content: payload.content, created_at: new Date().toISOString() });
          messageIndex = messages.value.length - 1;
        }
        if (payload.raw) updateTaskBoardFromChunk(payload.raw, messageIndex);
        eventLog.value.unshift(formatEventText(payload));
        if (eventLog.value.length > 24) eventLog.value = eventLog.value.slice(0, 24);
      }
    }
    messages.value = await getMessages(activeConversationId.value);
    await loadConversations();
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : "运行分析失败";
  } finally {
    running.value = false;
  }
}

function handleReplay(messageIndex: number) {
  highlightedMessageIndex.value = messageIndex;
}

onMounted(async () => {
  await loadConversations();
  if (conversations.value.length > 0) await openConversation(conversations.value[0].conversation_id);
  else await createNewConversation();
  initializeTaskBoard();
  timer = window.setInterval(() => (nowTs.value = Date.now()), 1000);
});

onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div class="workspace">
    <section class="chat-panel">
      <ConversationSidebar
        :conversations="conversations"
        :active-conversation-id="activeConversationId"
        @create="createNewConversation"
        @open="openConversation"
      />

      <main class="dialog-pane">
        <header class="topbar">
          <div>
            <h1>对话区域</h1>
            <p>您今天想查看关于什么东西的资讯?</p>
          </div>
        </header>

        <ChatMessageList :messages="messages" :highlight-index="highlightedMessageIndex" />

        <StepWorkflowPanel
          :active-step="activeStep"
          :state="state"
          :error-message="errorMessage"
          @submit="submitValue"
          @update-state="updateState"
        />
      </main>
    </section>

    <WorkbenchPanel
      :tasks="taskBoard"
      :running="running"
      :can-run="canRun"
      :progress-percent="progressPercent"
      :completed-count="completedCount"
      :event-log="eventLog"
      :now-ts="nowTs"
      @run="runAnalysis"
      @replay="handleReplay"
    />
  </div>
</template>
