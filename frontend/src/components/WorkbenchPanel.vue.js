import { computed } from "vue";
const props = defineProps();
const emit = defineEmits();
const groupedTasks = computed(() => {
    const groups = {};
    for (const t of props.tasks) {
        if (!groups[t.group])
            groups[t.group] = [];
        groups[t.group].push(t);
    }
    return groups;
});
const timelineTasks = computed(() => {
    return [...props.tasks].sort((a, b) => {
        const aRank = a.status === "completed" ? 2 : a.status === "in_progress" ? 1 : 0;
        const bRank = b.status === "completed" ? 2 : b.status === "in_progress" ? 1 : 0;
        if (aRank !== bRank)
            return bRank - aRank;
        return a.name.localeCompare(b.name);
    });
});
const stageDurations = computed(() => {
    return Object.entries(groupedTasks.value).map(([group, tasks]) => {
        const starts = tasks.map((t) => t.startedAt).filter((x) => typeof x === "number");
        const ends = tasks.map((t) => t.endedAt).filter((x) => typeof x === "number");
        const start = starts.length ? Math.min(...starts) : undefined;
        const end = ends.length ? Math.max(...ends) : undefined;
        const inProgress = tasks.some((t) => t.status === "in_progress");
        const effectiveEnd = end ?? (inProgress ? props.nowTs : undefined);
        const durationMs = start && effectiveEnd ? Math.max(0, effectiveEnd - start) : 0;
        return { group, durationMs };
    });
});
function formatDuration(ms) {
    if (!ms)
        return "--";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0)
        return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0)
        return `${m}m ${s % 60}s`;
    return `${s}s`;
}
function taskDuration(t) {
    if (!t.startedAt)
        return "--";
    const end = t.endedAt ?? (t.status === "in_progress" ? props.nowTs : undefined);
    if (!end)
        return "--";
    return formatDuration(Math.max(0, end - t.startedAt));
}
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['workbench-header']} */ ;
/** @type {__VLS_StyleScopedClasses['run-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
/** @type {__VLS_StyleScopedClasses['stage-row']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['task-status']} */ ;
/** @type {__VLS_StyleScopedClasses['task-status']} */ ;
/** @type {__VLS_StyleScopedClasses['in_progress']} */ ;
/** @type {__VLS_StyleScopedClasses['task-status']} */ ;
/** @type {__VLS_StyleScopedClasses['completed']} */ ;
/** @type {__VLS_StyleScopedClasses['log-fold']} */ ;
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
/** @type {__VLS_StyleScopedClasses['event-item']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench-header']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-title']} */ ;
/** @type {__VLS_StyleScopedClasses['run-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "workbench" },
});
/** @type {__VLS_StyleScopedClasses['workbench']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "workbench-header" },
});
/** @type {__VLS_StyleScopedClasses['workbench-header']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-card" },
});
/** @type {__VLS_StyleScopedClasses['progress-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-title" },
});
/** @type {__VLS_StyleScopedClasses['progress-title']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.completedCount);
(__VLS_ctx.tasks.length);
(__VLS_ctx.progressPercent);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-track" },
});
/** @type {__VLS_StyleScopedClasses['progress-track']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "progress-fill" },
    ...{ style: ({ width: `${__VLS_ctx.progressPercent}%` }) },
});
/** @type {__VLS_StyleScopedClasses['progress-fill']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.emit('run');
            // @ts-ignore
            [completedCount, tasks, progressPercent, progressPercent, emit,];
        } },
    ...{ class: "run-pill" },
    disabled: (!__VLS_ctx.canRun),
});
/** @type {__VLS_StyleScopedClasses['run-pill']} */ ;
(__VLS_ctx.running ? "分析中..." : "开始分析");
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "stage-card" },
});
/** @type {__VLS_StyleScopedClasses['stage-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
for (const [s] of __VLS_vFor((__VLS_ctx.stageDurations))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "stage-row" },
        key: (s.group),
    });
    /** @type {__VLS_StyleScopedClasses['stage-row']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (s.group);
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatDuration(s.durationMs));
    // @ts-ignore
    [canRun, running, stageDurations, formatDuration,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "timeline-card" },
});
/** @type {__VLS_StyleScopedClasses['timeline-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
for (const [task] of __VLS_vFor((__VLS_ctx.timelineTasks))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "timeline-item" },
        key: (task.key),
    });
    /** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "dot" },
        ...{ class: (task.status) },
    });
    /** @type {__VLS_StyleScopedClasses['dot']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "timeline-main" },
    });
    /** @type {__VLS_StyleScopedClasses['timeline-main']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "timeline-top" },
    });
    /** @type {__VLS_StyleScopedClasses['timeline-top']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                typeof task.lastMessageIndex === 'number' && __VLS_ctx.emit('replay', task.lastMessageIndex);
                // @ts-ignore
                [emit, timelineTasks,];
            } },
        ...{ class: "task-name replay-btn" },
        disabled: (typeof task.lastMessageIndex !== 'number'),
    });
    /** @type {__VLS_StyleScopedClasses['task-name']} */ ;
    /** @type {__VLS_StyleScopedClasses['replay-btn']} */ ;
    (task.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "task-status" },
        ...{ class: (task.status) },
    });
    /** @type {__VLS_StyleScopedClasses['task-status']} */ ;
    (task.status);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "timeline-meta" },
    });
    /** @type {__VLS_StyleScopedClasses['timeline-meta']} */ ;
    (task.group);
    (__VLS_ctx.taskDuration(task));
    if (task.logs.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.details, __VLS_intrinsics.details)({
            ...{ class: "log-fold" },
        });
        /** @type {__VLS_StyleScopedClasses['log-fold']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.summary, __VLS_intrinsics.summary)({});
        (task.logs.length);
        for (const [log, idx] of __VLS_vFor((task.logs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "log-item" },
                key: (idx),
            });
            /** @type {__VLS_StyleScopedClasses['log-item']} */ ;
            (log);
            // @ts-ignore
            [taskDuration,];
        }
    }
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "event-card" },
});
/** @type {__VLS_StyleScopedClasses['event-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
for (const [ev, i] of __VLS_vFor((__VLS_ctx.eventLog))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "event-item" },
        key: (i),
    });
    /** @type {__VLS_StyleScopedClasses['event-item']} */ ;
    (ev);
    // @ts-ignore
    [eventLog,];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
