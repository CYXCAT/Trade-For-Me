import { computed, onMounted, onUnmounted, ref } from "vue";
import { createConversation, getMessages, getWorkflow, listConversations, streamRun, submitStep } from "./api";
import WorkbenchPanel from "./components/WorkbenchPanel.vue";
const conversations = ref([]);
const activeConversationId = ref("");
const workflowSteps = ref([]);
const nextStepKey = ref(null);
const state = ref({});
const messages = ref([]);
const running = ref(false);
const customInput = ref("");
const errorMessage = ref("");
const eventLog = ref([]);
const nowTs = ref(Date.now());
let ticker;
const taskBoard = ref([]);
const analystMapping = {
    market: "Market Analyst",
    social: "Social Analyst",
    news: "News Analyst",
    fundamentals: "Fundamentals Analyst",
};
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
const selectedAnalysts = computed(() => Array.isArray(state.value.analysts) ? state.value.analysts : []);
const completedCount = computed(() => taskBoard.value.filter((x) => x.status === "completed").length);
const progressPercent = computed(() => {
    if (!taskBoard.value.length)
        return 0;
    return Math.round((completedCount.value / taskBoard.value.length) * 100);
});
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
        customInput.value = "";
    }
    catch (e) {
        errorMessage.value = e instanceof Error ? e.message : "步骤提交失败";
    }
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
        if (!response.body) {
            running.value = false;
            return;
        }
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
function messageText(content) {
    if (typeof content === "string")
        return content;
    try {
        return JSON.stringify(content, null, 2);
    }
    catch {
        return String(content);
    }
}
function chooseTickerPreset(value) {
    state.value.ticker = value;
    submitValue("ticker", value);
}
function toggleAnalyst(value) {
    const current = new Set(selectedAnalysts.value);
    if (current.has(value))
        current.delete(value);
    else
        current.add(value);
    state.value.analysts = Array.from(current);
}
function initializeTaskBoard() {
    const analystTasks = selectedAnalysts.value.map((x) => ({
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
function setStatusByName(name, status) {
    const task = taskBoard.value.find((x) => x.name === name);
    if (!task)
        return;
    if (task.status === "completed")
        return;
    if (task.status === "in_progress" && status === "pending")
        return;
    if (status === "in_progress" && !task.startedAt)
        task.startedAt = Date.now();
    if (status === "completed") {
        if (!task.startedAt)
            task.startedAt = Date.now();
        task.endedAt = Date.now();
    }
    task.status = status;
}
function appendTaskLog(name, log) {
    const task = taskBoard.value.find((x) => x.name === name);
    if (!task)
        return;
    const last = task.logs[task.logs.length - 1];
    if (last === log)
        return;
    task.logs.push(log);
    if (task.logs.length > 20) {
        task.logs = task.logs.slice(task.logs.length - 20);
    }
}
function formatEventText(payload) {
    if (payload.type === "chunk" && payload.content) {
        return `LLM: ${String(payload.content).slice(0, 80)}`;
    }
    return `事件: ${JSON.stringify(payload).slice(0, 90)}`;
}
function updateTaskBoardFromChunk(raw) {
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
    const invest = raw.investment_debate_state;
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
    const risk = raw.risk_debate_state;
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
    }
    else {
        await createNewConversation();
    }
    initializeTaskBoard();
    ticker = window.setInterval(() => {
        nowTs.value = Date.now();
    }, 1000);
});
onUnmounted(() => {
    if (ticker)
        window.clearInterval(ticker);
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
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
    ...{ class: "sidebar" },
});
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand" },
});
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-dot" },
});
/** @type {__VLS_StyleScopedClasses['brand-dot']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-title" },
});
/** @type {__VLS_StyleScopedClasses['brand-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-subtitle" },
});
/** @type {__VLS_StyleScopedClasses['brand-subtitle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (__VLS_ctx.createNewConversation) },
    ...{ class: "new-chat" },
});
/** @type {__VLS_StyleScopedClasses['new-chat']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "section-label" },
});
/** @type {__VLS_StyleScopedClasses['section-label']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.conversations))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openConversation(item.conversation_id);
                // @ts-ignore
                [createNewConversation, conversations, openConversation,];
            } },
        key: (item.conversation_id),
        ...{ class: "conversation-card" },
        ...{ class: ({ active: item.conversation_id === __VLS_ctx.activeConversationId }) },
    });
    /** @type {__VLS_StyleScopedClasses['conversation-card']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "title" },
    });
    /** @type {__VLS_StyleScopedClasses['title']} */ ;
    (item.title || "New Session");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "time" },
    });
    /** @type {__VLS_StyleScopedClasses['time']} */ ;
    (item.updated_at);
    // @ts-ignore
    [activeConversationId,];
}
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "messages" },
});
/** @type {__VLS_StyleScopedClasses['messages']} */ ;
for (const [msg, idx] of __VLS_vFor((__VLS_ctx.messages))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        key: (idx),
        ...{ class: "message-row" },
        ...{ class: (msg.role) },
    });
    /** @type {__VLS_StyleScopedClasses['message-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "avatar" },
    });
    /** @type {__VLS_StyleScopedClasses['avatar']} */ ;
    (msg.role === "assistant" ? "AI" : msg.role === "user" ? "U" : "SYS");
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "bubble" },
    });
    /** @type {__VLS_StyleScopedClasses['bubble']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "role" },
    });
    /** @type {__VLS_StyleScopedClasses['role']} */ ;
    (msg.role);
    __VLS_asFunctionalElement1(__VLS_intrinsics.pre, __VLS_intrinsics.pre)({
        ...{ class: "content" },
    });
    /** @type {__VLS_StyleScopedClasses['content']} */ ;
    (__VLS_ctx.messageText(msg.content));
    // @ts-ignore
    [messages, messageText,];
}
if (__VLS_ctx.activeStep) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
        ...{ class: "step-panel" },
    });
    /** @type {__VLS_StyleScopedClasses['step-panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "step-header" },
    });
    /** @type {__VLS_StyleScopedClasses['step-header']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    (__VLS_ctx.activeStep.title);
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.activeStep.prompt);
    if (__VLS_ctx.errorMessage) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "error" },
        });
        /** @type {__VLS_StyleScopedClasses['error']} */ ;
        (__VLS_ctx.errorMessage);
    }
    if (__VLS_ctx.activeStep.kind === 'choice_or_input') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "option-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['option-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeStep))
                        return;
                    if (!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                        return;
                    __VLS_ctx.chooseTickerPreset('SPY');
                    // @ts-ignore
                    [activeStep, activeStep, activeStep, activeStep, errorMessage, errorMessage, chooseTickerPreset,];
                } },
            ...{ class: "option-card" },
        });
        /** @type {__VLS_StyleScopedClasses['option-card']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeStep))
                        return;
                    if (!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                        return;
                    __VLS_ctx.customInput = '__custom__';
                    // @ts-ignore
                    [customInput,];
                } },
            ...{ class: "option-card" },
        });
        /** @type {__VLS_StyleScopedClasses['option-card']} */ ;
        if (__VLS_ctx.customInput === '__custom__') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                placeholder: "输入代码，例如 AAPL / TSLA / 0700.HK",
            });
            (__VLS_ctx.state.ticker);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!(__VLS_ctx.customInput === '__custom__'))
                            return;
                        __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, __VLS_ctx.state.ticker);
                        // @ts-ignore
                        [activeStep, customInput, state, state, submitValue,];
                    } },
                ...{ class: "submit-btn" },
                disabled: (!String(__VLS_ctx.state.ticker || '').trim()),
            });
            /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
        }
    }
    else if (__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "option-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['option-grid']} */ ;
        for (const [op] of __VLS_vFor((__VLS_ctx.activeStep.options))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                            return;
                        __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, op.value);
                        // @ts-ignore
                        [activeStep, activeStep, activeStep, activeStep, state, submitValue,];
                    } },
                ...{ class: "option-card" },
                key: (String(op.value)),
            });
            /** @type {__VLS_StyleScopedClasses['option-card']} */ ;
            (op.label);
            // @ts-ignore
            [];
        }
        if (__VLS_ctx.activeStep.kind === 'single_select_or_custom') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "custom-block" },
            });
            /** @type {__VLS_StyleScopedClasses['custom-block']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                placeholder: "或输入自定义 model id",
            });
            (__VLS_ctx.customInput);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                            return;
                        __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, __VLS_ctx.customInput);
                        // @ts-ignore
                        [activeStep, activeStep, customInput, customInput, submitValue,];
                    } },
                ...{ class: "submit-btn" },
                disabled: (!__VLS_ctx.customInput.trim()),
            });
            /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
        }
    }
    else if (__VLS_ctx.activeStep.kind === 'multi_select') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "option-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['option-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "multi" },
        });
        /** @type {__VLS_StyleScopedClasses['multi']} */ ;
        for (const [op] of __VLS_vFor((__VLS_ctx.activeStep.options))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'multi_select'))
                            return;
                        __VLS_ctx.toggleAnalyst(String(op.value));
                        // @ts-ignore
                        [activeStep, activeStep, customInput, toggleAnalyst,];
                    } },
                type: "button",
                ...{ class: "option-card" },
                ...{ class: ({ selected: __VLS_ctx.selectedAnalysts.includes(String(op.value)) }) },
                key: (String(op.value)),
            });
            /** @type {__VLS_StyleScopedClasses['option-card']} */ ;
            /** @type {__VLS_StyleScopedClasses['selected']} */ ;
            (op.label);
            // @ts-ignore
            [selectedAnalysts,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeStep))
                        return;
                    if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                        return;
                    if (!!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                        return;
                    if (!(__VLS_ctx.activeStep.kind === 'multi_select'))
                        return;
                    __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, __VLS_ctx.selectedAnalysts);
                    // @ts-ignore
                    [activeStep, submitValue, selectedAnalysts,];
                } },
            ...{ class: "submit-btn" },
            disabled: (__VLS_ctx.selectedAnalysts.length === 0),
        });
        /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
    }
    else if (__VLS_ctx.activeStep.kind === 'date_input' || __VLS_ctx.activeStep.kind === 'optional_text') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "option-grid" },
        });
        /** @type {__VLS_StyleScopedClasses['option-grid']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: (__VLS_ctx.activeStep.kind === 'date_input' ? 'date' : 'text'),
            placeholder: (__VLS_ctx.activeStep.kind === 'optional_text' ? '可留空后点跳过' : '选择日期'),
        });
        (__VLS_ctx.customInput);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "actions" },
        });
        /** @type {__VLS_StyleScopedClasses['actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeStep))
                        return;
                    if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                        return;
                    if (!!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                        return;
                    if (!!(__VLS_ctx.activeStep.kind === 'multi_select'))
                        return;
                    if (!(__VLS_ctx.activeStep.kind === 'date_input' || __VLS_ctx.activeStep.kind === 'optional_text'))
                        return;
                    __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, __VLS_ctx.customInput);
                    // @ts-ignore
                    [activeStep, activeStep, activeStep, activeStep, activeStep, customInput, customInput, submitValue, selectedAnalysts,];
                } },
            ...{ class: "submit-btn" },
            disabled: (__VLS_ctx.activeStep.kind === 'date_input' && !__VLS_ctx.customInput.trim()),
        });
        /** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
        if (__VLS_ctx.activeStep.kind === 'optional_text') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'single_select' || __VLS_ctx.activeStep.kind === 'single_select_or_custom'))
                            return;
                        if (!!(__VLS_ctx.activeStep.kind === 'multi_select'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'date_input' || __VLS_ctx.activeStep.kind === 'optional_text'))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'optional_text'))
                            return;
                        __VLS_ctx.submitValue(__VLS_ctx.activeStep.key, null);
                        // @ts-ignore
                        [activeStep, activeStep, activeStep, customInput, submitValue,];
                    } },
                ...{ class: "ghost-btn" },
            });
            /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
        }
    }
}
const __VLS_0 = WorkbenchPanel;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    ...{ 'onRun': {} },
    tasks: (__VLS_ctx.taskBoard),
    running: (__VLS_ctx.running),
    canRun: (__VLS_ctx.canRun),
    progressPercent: (__VLS_ctx.progressPercent),
    completedCount: (__VLS_ctx.completedCount),
    eventLog: (__VLS_ctx.eventLog),
    nowTs: (__VLS_ctx.nowTs),
}));
const __VLS_2 = __VLS_1({
    ...{ 'onRun': {} },
    tasks: (__VLS_ctx.taskBoard),
    running: (__VLS_ctx.running),
    canRun: (__VLS_ctx.canRun),
    progressPercent: (__VLS_ctx.progressPercent),
    completedCount: (__VLS_ctx.completedCount),
    eventLog: (__VLS_ctx.eventLog),
    nowTs: (__VLS_ctx.nowTs),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = ({ run: {} },
    { onRun: (__VLS_ctx.runAnalysis) });
var __VLS_3;
var __VLS_4;
// @ts-ignore
[taskBoard, running, canRun, progressPercent, completedCount, eventLog, nowTs, runAnalysis,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
