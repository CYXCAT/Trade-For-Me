import { computed, onMounted, onUnmounted, ref } from "vue";
import { createConversation, getMessages, getWorkflow, listConversations, streamRun, submitStep } from "./api";
import ConversationSidebar from "./components/ConversationSidebar.vue";
import ChatMessageList from "./components/ChatMessageList.vue";
import StepWorkflowPanel from "./components/StepWorkflowPanel.vue";
import WorkbenchPanel from "./components/WorkbenchPanel.vue";
const conversations = ref([]);
const activeConversationId = ref("");
const workflowSteps = ref([]);
const nextStepKey = ref(null);
const state = ref({});
const messages = ref([]);
const running = ref(false);
const errorMessage = ref("");
const eventLog = ref([]);
const nowTs = ref(Date.now());
const highlightedMessageIndex = ref(null);
const taskBoard = ref([]);
let timer;
const analystMapping = { market: "Market Analyst", social: "Social Analyst", news: "News Analyst", fundamentals: "Fundamentals Analyst" };
const fixedAgents = [
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
const selectedAnalysts = computed(() => (Array.isArray(state.value.analysts) ? state.value.analysts : []));
const completedCount = computed(() => taskBoard.value.filter((x) => x.status === "completed").length);
const progressPercent = computed(() => (taskBoard.value.length ? Math.round((completedCount.value / taskBoard.value.length) * 100) : 0));
function updateState(key, value) {
    state.value = { ...state.value, [key]: value };
}
async function loadConversations() {
    conversations.value = await listConversations();
}
async function openConversation(id) {
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
async function submitValue(stepKey, value) {
    if (!activeConversationId.value)
        return;
    errorMessage.value = "";
    try {
        const wf = await submitStep(activeConversationId.value, stepKey, value);
        workflowSteps.value = wf.workflow_steps;
        nextStepKey.value = wf.next_step_key;
        state.value = wf.state;
        messages.value = await getMessages(activeConversationId.value);
    }
    catch (e) {
        errorMessage.value = e instanceof Error ? e.message : "步骤提交失败";
    }
}
function initializeTaskBoard() {
    const analysts = selectedAnalysts.value.map((x) => ({ key: x, name: analystMapping[x] || x, group: "Analyst Team", status: "pending", logs: [] }));
    taskBoard.value = [...analysts, ...fixedAgents.map((x) => ({ ...x }))];
    if (taskBoard.value[0]) {
        taskBoard.value[0].status = "in_progress";
        taskBoard.value[0].startedAt = Date.now();
    }
}
function markTask(name, status, log, messageIndex) {
    const task = taskBoard.value.find((x) => x.name === name);
    if (!task)
        return;
    if (task.status !== "completed") {
        if (status === "in_progress" && !task.startedAt)
            task.startedAt = Date.now();
        if (status === "completed") {
            if (!task.startedAt)
                task.startedAt = Date.now();
            task.endedAt = Date.now();
        }
        if (!(task.status === "in_progress" && status === "pending"))
            task.status = status;
    }
    if (messageIndex !== null)
        task.lastMessageIndex = messageIndex;
    if (log) {
        const last = task.logs[task.logs.length - 1];
        if (last !== log)
            task.logs = [...task.logs, log].slice(-20);
    }
}
function updateTaskBoardFromChunk(raw, messageIndex) {
    if (raw.market_report)
        markTask("Market Analyst", "completed", "Market report generated", messageIndex);
    if (raw.sentiment_report)
        markTask("Social Analyst", "completed", "Sentiment report generated", messageIndex);
    if (raw.news_report)
        markTask("News Analyst", "completed", "News report generated", messageIndex);
    if (raw.fundamentals_report)
        markTask("Fundamentals Analyst", "completed", "Fundamental report generated", messageIndex);
    const invest = raw.investment_debate_state;
    if (invest?.bull_history)
        markTask("Bull Researcher", "in_progress", "Bull argument updated", messageIndex);
    if (invest?.bear_history)
        markTask("Bear Researcher", "in_progress", "Bear argument updated", messageIndex);
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
    const risk = raw.risk_debate_state;
    if (risk?.aggressive_history)
        markTask("Aggressive Analyst", "in_progress", "Aggressive risk view updated", messageIndex);
    if (risk?.neutral_history)
        markTask("Neutral Analyst", "in_progress", "Neutral risk view updated", messageIndex);
    if (risk?.conservative_history)
        markTask("Conservative Analyst", "in_progress", "Conservative risk view updated", messageIndex);
    if (risk?.judge_decision) {
        markTask("Aggressive Analyst", "completed", null, messageIndex);
        markTask("Neutral Analyst", "completed", null, messageIndex);
        markTask("Conservative Analyst", "completed", null, messageIndex);
        markTask("Portfolio Manager", "in_progress", "Risk debate judged, portfolio manager started", messageIndex);
    }
    if (raw.final_trade_decision)
        markTask("Portfolio Manager", "completed", "Final trade decision completed", messageIndex);
}
function formatEventText(payload) {
    if (payload.type === "chunk" && payload.content)
        return `LLM: ${String(payload.content).slice(0, 80)}`;
    return `事件: ${JSON.stringify(payload).slice(0, 90)}`;
}
async function runAnalysis() {
    if (!activeConversationId.value)
        return;
    running.value = true;
    errorMessage.value = "";
    eventLog.value = [];
    initializeTaskBoard();
    try {
        const response = await streamRun(activeConversationId.value, state.value.supplemental_prompt || null);
        if (!response.body)
            return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            for (const event of events) {
                if (!event.includes("data:"))
                    continue;
                const dataLine = event.split("\n").find((line) => line.startsWith("data:"));
                if (!dataLine)
                    continue;
                const payload = JSON.parse(dataLine.replace("data:", "").trim());
                let messageIndex = null;
                if (payload.content) {
                    messages.value.push({ role: "assistant", content: payload.content, created_at: new Date().toISOString() });
                    messageIndex = messages.value.length - 1;
                }
                if (payload.raw)
                    updateTaskBoardFromChunk(payload.raw, messageIndex);
                eventLog.value.unshift(formatEventText(payload));
                if (eventLog.value.length > 24)
                    eventLog.value = eventLog.value.slice(0, 24);
            }
        }
        messages.value = await getMessages(activeConversationId.value);
        await loadConversations();
    }
    catch (e) {
        errorMessage.value = e instanceof Error ? e.message : "运行分析失败";
    }
    finally {
        running.value = false;
    }
}
function handleReplay(messageIndex) {
    highlightedMessageIndex.value = messageIndex;
}
onMounted(async () => {
    await loadConversations();
    if (conversations.value.length > 0)
        await openConversation(conversations.value[0].conversation_id);
    else
        await createNewConversation();
    initializeTaskBoard();
    timer = window.setInterval(() => (nowTs.value = Date.now()), 1000);
});
onUnmounted(() => {
    if (timer)
        window.clearInterval(timer);
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "workspace" },
});
/** @type {__VLS_StyleScopedClasses['workspace']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "chat-panel" },
});
/** @type {__VLS_StyleScopedClasses['chat-panel']} */ ;
const __VLS_0 = ConversationSidebar;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onCreate': {} },
    ...{ 'onOpen': {} },
    conversations: (__VLS_ctx.conversations),
    activeConversationId: (__VLS_ctx.activeConversationId),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onCreate': {} },
    ...{ 'onOpen': {} },
    conversations: (__VLS_ctx.conversations),
    activeConversationId: (__VLS_ctx.activeConversationId),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ create: {} },
    { onCreate: (__VLS_ctx.createNewConversation) });
const __VLS_7 = ({ open: {} },
    { onOpen: (__VLS_ctx.openConversation) });
var __VLS_3;
var __VLS_4;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "dialog-pane" },
});
/** @type {__VLS_StyleScopedClasses['dialog-pane']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)({
    ...{ class: "topbar" },
});
/** @type {__VLS_StyleScopedClasses['topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
const __VLS_8 = ChatMessageList;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
    messages: (__VLS_ctx.messages),
    highlightIndex: (__VLS_ctx.highlightedMessageIndex),
}));
const __VLS_10 = __VLS_9({
    messages: (__VLS_ctx.messages),
    highlightIndex: (__VLS_ctx.highlightedMessageIndex),
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
const __VLS_13 = StepWorkflowPanel;
// @ts-ignore
const __VLS_14 = __VLS_asFunctionalComponent1(__VLS_13, new __VLS_13({
    ...{ 'onSubmit': {} },
    ...{ 'onUpdateState': {} },
    activeStep: (__VLS_ctx.activeStep),
    state: (__VLS_ctx.state),
    errorMessage: (__VLS_ctx.errorMessage),
}));
const __VLS_15 = __VLS_14({
    ...{ 'onSubmit': {} },
    ...{ 'onUpdateState': {} },
    activeStep: (__VLS_ctx.activeStep),
    state: (__VLS_ctx.state),
    errorMessage: (__VLS_ctx.errorMessage),
}, ...__VLS_functionalComponentArgsRest(__VLS_14));
let __VLS_18;
const __VLS_19 = ({ submit: {} },
    { onSubmit: (__VLS_ctx.submitValue) });
const __VLS_20 = ({ updateState: {} },
    { onUpdateState: (__VLS_ctx.updateState) });
var __VLS_16;
var __VLS_17;
const __VLS_21 = WorkbenchPanel;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21({
    ...{ 'onRun': {} },
    ...{ 'onReplay': {} },
    tasks: (__VLS_ctx.taskBoard),
    running: (__VLS_ctx.running),
    canRun: (__VLS_ctx.canRun),
    progressPercent: (__VLS_ctx.progressPercent),
    completedCount: (__VLS_ctx.completedCount),
    eventLog: (__VLS_ctx.eventLog),
    nowTs: (__VLS_ctx.nowTs),
}));
const __VLS_23 = __VLS_22({
    ...{ 'onRun': {} },
    ...{ 'onReplay': {} },
    tasks: (__VLS_ctx.taskBoard),
    running: (__VLS_ctx.running),
    canRun: (__VLS_ctx.canRun),
    progressPercent: (__VLS_ctx.progressPercent),
    completedCount: (__VLS_ctx.completedCount),
    eventLog: (__VLS_ctx.eventLog),
    nowTs: (__VLS_ctx.nowTs),
}, ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_26;
const __VLS_27 = ({ run: {} },
    { onRun: (__VLS_ctx.runAnalysis) });
const __VLS_28 = ({ replay: {} },
    { onReplay: (__VLS_ctx.handleReplay) });
var __VLS_24;
var __VLS_25;
// @ts-ignore
[conversations, activeConversationId, createNewConversation, openConversation, messages, highlightedMessageIndex, activeStep, state, errorMessage, submitValue, updateState, taskBoard, running, canRun, progressPercent, completedCount, eventLog, nowTs, runAnalysis, handleReplay,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
