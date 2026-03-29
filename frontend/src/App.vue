<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { createConversation, getMessages, getWorkflow, listConversations, streamRun, submitStep } from "./api";
import type { ConversationSummary, Message, WorkflowStep } from "./types";
import WorkbenchPanel from "./components/WorkbenchPanel.vue";
import type { AgentStatus, AgentTask } from "./workbenchTypes";

const conversations = ref<ConversationSummary[]>([]);
const activeConversationId = ref<string>("");
const workflowSteps = ref<WorkflowStep[]>([]);
const nextStepKey = ref<string | null>(null);
const state = ref<Record<string, unknown>>({});
const messages = ref<Message[]>([]);
const running = ref(false);
const customInput = ref("");
const errorMessage = ref("");
const eventLog = ref<string[]>([]);
const nowTs = ref(Date.now());
let ticker: number | undefined;

const taskBoard = ref<AgentTask[]>([]);

const analystMapping: Record<string, string> = {
  market: "Market Analyst",
  social: "Social Analyst",
  news: "News Analyst",
  fundamentals: "Fundamentals Analyst",
};

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
const selectedAnalysts = computed(() =>
  Array.isArray(state.value.analysts) ? (state.value.analysts as string[]) : [],
);
const completedCount = computed(() => taskBoard.value.filter((x) => x.status === "completed").length);
const progressPercent = computed(() => {
  if (!taskBoard.value.length) return 0;
  return Math.round((completedCount.value / taskBoard.value.length) * 100);
});

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
    customInput.value = "";
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : "步骤提交失败";
  }
}

async function runAnalysis() {
  if (!activeConversationId.value) return;
  running.value = true;
  errorMessage.value = "";
  eventLog.value = [];
  initializeTaskBoard();
  try {
    const response = await streamRun(activeConversationId.value, (state.value.supplemental_prompt as string) || null);
    if (!response.body) {
      running.value = false;
      return;
    }
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
        if (payload.raw) {
          updateTaskBoardFromChunk(payload.raw);
        }
        if (payload.content) {
          messages.value.push({
            role: "assistant",
            content: payload.content,
            created_at: new Date().toISOString(),
          });
        }
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

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

function chooseTickerPreset(value: string) {
  state.value.ticker = value;
  submitValue("ticker", value);
}

function toggleAnalyst(value: string) {
  const current = new Set(selectedAnalysts.value);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  state.value.analysts = Array.from(current);
}

function initializeTaskBoard() {
  const analystTasks: AgentTask[] = selectedAnalysts.value.map((x) => ({
    key: x,
    name: analystMapping[x] || x,
    group: "Analyst Team",
    status: "pending",
    logs: [],
  }));
  taskBoard.value = [...analystTasks, ...fixedAgents.map((x) => ({ ...x }))];
  if (taskBoard.value.length > 0) {
    taskBoard.value[0].status = "in_progress";
    taskBoard.value[0].startedAt = Date.now();
  }
}

function setStatusByName(name: string, status: AgentStatus) {
  const task = taskBoard.value.find((x) => x.name === name);
  if (!task) return;
  if (task.status === "completed") return;
  if (task.status === "in_progress" && status === "pending") return;
  if (status === "in_progress" && !task.startedAt) task.startedAt = Date.now();
  if (status === "completed") {
    if (!task.startedAt) task.startedAt = Date.now();
    task.endedAt = Date.now();
  }
  task.status = status;
}

function appendTaskLog(name: string, log: string) {
  const task = taskBoard.value.find((x) => x.name === name);
  if (!task) return;
  const last = task.logs[task.logs.length - 1];
  if (last === log) return;
  task.logs.push(log);
  if (task.logs.length > 20) {
    task.logs = task.logs.slice(task.logs.length - 20);
  }
}

function formatEventText(payload: Record<string, unknown>): string {
  if (payload.type === "chunk" && payload.content) {
    return `LLM: ${String(payload.content).slice(0, 80)}`;
  }
  return `事件: ${JSON.stringify(payload).slice(0, 90)}`;
}

function updateTaskBoardFromChunk(raw: Record<string, unknown>) {
  if (raw.market_report) {
    setStatusByName("Market Analyst", "completed");
    appendTaskLog("Market Analyst", "Market report generated");
  }
  if (raw.sentiment_report) {
    setStatusByName("Social Analyst", "completed");
    appendTaskLog("Social Analyst", "Sentiment report generated");
  }
  if (raw.news_report) {
    setStatusByName("News Analyst", "completed");
    appendTaskLog("News Analyst", "News report generated");
  }
  if (raw.fundamentals_report) {
    setStatusByName("Fundamentals Analyst", "completed");
    appendTaskLog("Fundamentals Analyst", "Fundamental report generated");
  }

  const invest = raw.investment_debate_state as Record<string, string> | undefined;
  if (invest?.bull_history) {
    setStatusByName("Bull Researcher", "in_progress");
    appendTaskLog("Bull Researcher", "Bull argument updated");
  }
  if (invest?.bear_history) {
    setStatusByName("Bear Researcher", "in_progress");
    appendTaskLog("Bear Researcher", "Bear argument updated");
  }
  if (invest?.judge_decision) {
    setStatusByName("Bull Researcher", "completed");
    setStatusByName("Bear Researcher", "completed");
    setStatusByName("Research Manager", "completed");
    setStatusByName("Trader", "in_progress");
    appendTaskLog("Research Manager", "Research manager decision finished");
  }

  if (raw.trader_investment_plan) {
    setStatusByName("Trader", "completed");
    setStatusByName("Aggressive Analyst", "in_progress");
    setStatusByName("Neutral Analyst", "in_progress");
    setStatusByName("Conservative Analyst", "in_progress");
    appendTaskLog("Trader", "Trader investment plan generated");
  }

  const risk = raw.risk_debate_state as Record<string, string> | undefined;
  if (risk?.aggressive_history) {
    setStatusByName("Aggressive Analyst", "in_progress");
    appendTaskLog("Aggressive Analyst", "Aggressive risk view updated");
  }
  if (risk?.neutral_history) {
    setStatusByName("Neutral Analyst", "in_progress");
    appendTaskLog("Neutral Analyst", "Neutral risk view updated");
  }
  if (risk?.conservative_history) {
    setStatusByName("Conservative Analyst", "in_progress");
    appendTaskLog("Conservative Analyst", "Conservative risk view updated");
  }
  if (risk?.judge_decision) {
    setStatusByName("Aggressive Analyst", "completed");
    setStatusByName("Neutral Analyst", "completed");
    setStatusByName("Conservative Analyst", "completed");
    setStatusByName("Portfolio Manager", "in_progress");
    appendTaskLog("Portfolio Manager", "Risk debate judged, portfolio manager started");
  }

  if (raw.final_trade_decision) {
    setStatusByName("Portfolio Manager", "completed");
    appendTaskLog("Portfolio Manager", "Final trade decision completed");
  }
}

onMounted(async () => {
  await loadConversations();
  if (conversations.value.length > 0) {
    await openConversation(conversations.value[0].conversation_id);
  } else {
    await createNewConversation();
  }
  initializeTaskBoard();
  ticker = window.setInterval(() => {
    nowTs.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (ticker) window.clearInterval(ticker);
});
</script>

<template>
  <div class="workspace">
    <section class="chat-panel">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-dot"></div>
          <div>
            <div class="brand-title">Trade For Me</div>
            <div class="brand-subtitle">Conversation</div>
          </div>
        </div>

        <button class="new-chat" @click="createNewConversation">+ 新建工作会话</button>
        <div class="section-label">历史对话</div>
        <div
          v-for="item in conversations"
          :key="item.conversation_id"
          class="conversation-card"
          :class="{ active: item.conversation_id === activeConversationId }"
          @click="openConversation(item.conversation_id)"
        >
          <div class="title">{{ item.title || "New Session" }}</div>
          <div class="time">{{ item.updated_at }}</div>
        </div>
      </aside>

      <main class="dialog-pane">
        <header class="topbar">
          <div>
            <h1>对话区域</h1>
            <p>您今天想查看关于什么东西的资讯?</p>
          </div>
        </header>

        <section class="messages">
          <div v-for="(msg, idx) in messages" :key="idx" class="message-row" :class="msg.role">
            <div class="avatar">{{ msg.role === "assistant" ? "AI" : msg.role === "user" ? "U" : "SYS" }}</div>
            <div class="bubble">
              <div class="role">{{ msg.role }}</div>
              <pre class="content">{{ messageText(msg.content) }}</pre>
            </div>
          </div>
        </section>

        <section class="step-panel" v-if="activeStep">
          <div class="step-header">
            <h3>{{ activeStep.title }}</h3>
            <p>{{ activeStep.prompt }}</p>
          </div>
          <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

          <div class="option-grid" v-if="activeStep.kind === 'choice_or_input'">
            <button class="option-card" @click="chooseTickerPreset('SPY')">SPY（默认）</button>
            <button class="option-card" @click="customInput = '__custom__'">自定义</button>
            <div v-if="customInput === '__custom__'">
              <input v-model="state.ticker" placeholder="输入代码，例如 AAPL / TSLA / 0700.HK" />
              <button class="submit-btn" :disabled="!String(state.ticker || '').trim()" @click="submitValue(activeStep.key, state.ticker)">提交代码</button>
            </div>
          </div>

          <div class="option-grid" v-else-if="activeStep.kind === 'single_select' || activeStep.kind === 'single_select_or_custom'">
            <button class="option-card" v-for="op in activeStep.options" :key="String(op.value)" @click="submitValue(activeStep.key, op.value)">
              {{ op.label }}
            </button>
            <div class="custom-block" v-if="activeStep.kind === 'single_select_or_custom'">
              <input v-model="customInput" placeholder="或输入自定义 model id" />
              <button class="submit-btn" :disabled="!customInput.trim()" @click="submitValue(activeStep.key, customInput)">提交自定义模型</button>
            </div>
          </div>

          <div class="option-grid" v-else-if="activeStep.kind === 'multi_select'">
            <div class="multi">
              <button
                type="button"
                class="option-card"
                :class="{ selected: selectedAnalysts.includes(String(op.value)) }"
                v-for="op in activeStep.options"
                :key="String(op.value)"
                @click="toggleAnalyst(String(op.value))"
              >{{ op.label }}</button>
            </div>
            <button class="submit-btn" :disabled="selectedAnalysts.length === 0" @click="submitValue(activeStep.key, selectedAnalysts)">提交分析师选择</button>
          </div>

          <div class="option-grid" v-else-if="activeStep.kind === 'date_input' || activeStep.kind === 'optional_text'">
            <input
              :type="activeStep.kind === 'date_input' ? 'date' : 'text'"
              v-model="customInput"
              :placeholder="activeStep.kind === 'optional_text' ? '可留空后点跳过' : '选择日期'"
            />
            <div class="actions">
              <button class="submit-btn" :disabled="activeStep.kind === 'date_input' && !customInput.trim()" @click="submitValue(activeStep.key, customInput)">提交</button>
              <button class="ghost-btn" v-if="activeStep.kind === 'optional_text'" @click="submitValue(activeStep.key, null)">跳过</button>
            </div>
          </div>
        </section>
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
    />
  </div>
</template>
