<script setup lang="ts">
import { computed } from "vue";
import type { AgentTask } from "../workbenchTypes";

const props = defineProps<{
  tasks: AgentTask[];
  running: boolean;
  canRun: boolean;
  progressPercent: number;
  completedCount: number;
  eventLog: string[];
  nowTs: number;
}>();

const emit = defineEmits<{
  run: [];
}>();

const groupedTasks = computed(() => {
  const groups: Record<string, AgentTask[]> = {};
  for (const t of props.tasks) {
    if (!groups[t.group]) groups[t.group] = [];
    groups[t.group].push(t);
  }
  return groups;
});

const timelineTasks = computed(() => {
  return [...props.tasks].sort((a, b) => {
    const aRank = a.status === "completed" ? 2 : a.status === "in_progress" ? 1 : 0;
    const bRank = b.status === "completed" ? 2 : b.status === "in_progress" ? 1 : 0;
    if (aRank !== bRank) return bRank - aRank;
    return a.name.localeCompare(b.name);
  });
});

const stageDurations = computed(() => {
  return Object.entries(groupedTasks.value).map(([group, tasks]) => {
    const starts = tasks.map((t) => t.startedAt).filter((x): x is number => typeof x === "number");
    const ends = tasks.map((t) => t.endedAt).filter((x): x is number => typeof x === "number");
    const start = starts.length ? Math.min(...starts) : undefined;
    const end = ends.length ? Math.max(...ends) : undefined;
    const inProgress = tasks.some((t) => t.status === "in_progress");
    const effectiveEnd = end ?? (inProgress ? props.nowTs : undefined);
    const durationMs = start && effectiveEnd ? Math.max(0, effectiveEnd - start) : 0;
    return { group, durationMs };
  });
});

function formatDuration(ms: number): string {
  if (!ms) return "--";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function taskDuration(t: AgentTask): string {
  if (!t.startedAt) return "--";
  const end = t.endedAt ?? (t.status === "in_progress" ? props.nowTs : undefined);
  if (!end) return "--";
  return formatDuration(Math.max(0, end - t.startedAt));
}
</script>

<template>
  <section class="workbench">
    <div class="workbench-header">
      <h2>工作台</h2>
      <p>任务时间线 / 阶段耗时 / Agent日志</p>
    </div>

    <div class="progress-card">
      <div class="progress-title">
        <span>总体进度</span>
        <strong>{{ completedCount }}/{{ tasks.length }} · {{ progressPercent }}%</strong>
      </div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
      </div>
      <button class="run-pill" :disabled="!canRun" @click="emit('run')">{{ running ? "分析中..." : "开始分析" }}</button>
    </div>

    <div class="stage-card">
      <h3>阶段耗时</h3>
      <div class="stage-row" v-for="s in stageDurations" :key="s.group">
        <span>{{ s.group }}</span>
        <strong>{{ formatDuration(s.durationMs) }}</strong>
      </div>
    </div>

    <div class="timeline-card">
      <h3>任务时间线</h3>
      <div class="timeline-item" v-for="task in timelineTasks" :key="task.key">
        <span class="dot" :class="task.status"></span>
        <div class="timeline-main">
          <div class="timeline-top">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-status" :class="task.status">{{ task.status }}</span>
          </div>
          <div class="timeline-meta">{{ task.group }} · {{ taskDuration(task) }}</div>
          <details class="log-fold" v-if="task.logs.length">
            <summary>查看日志（{{ task.logs.length }}）</summary>
            <div class="log-item" v-for="(log, idx) in task.logs" :key="idx">{{ log }}</div>
          </details>
        </div>
      </div>
    </div>

    <div class="event-card">
      <h3>事件流</h3>
      <div class="event-item" v-for="(ev, i) in eventLog" :key="i">{{ ev }}</div>
    </div>
  </section>
</template>

<style scoped>
.workbench {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 12px;
  min-width: 0;
  background: #fbfdff;
  border: 1px solid #d8e2ff;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 8px 30px rgba(83, 113, 255, 0.08);
  overflow: hidden;
}
.workbench-header h2 { margin: 0; font-size: 20px; color: #20408f; }
.workbench-header p { margin: 4px 0 0; font-size: 13px; color: #6e81ae; }
.progress-card,.stage-card,.timeline-card,.event-card{
  border: 1px solid #dfe7ff; border-radius: 12px; background:#fff; padding:10px;
}
.progress-title{display:flex;justify-content:space-between;font-size:13px;color:#425a92}
.progress-track{margin-top:8px;height:8px;border-radius:999px;background:#e8eeff;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,#3f6dff,#7f99ff);transition:width .25s ease}
.run-pill{margin-top:10px;border:0;border-radius:999px;background:linear-gradient(135deg,#3f6dff,#7a95ff);color:#fff;padding:10px 16px;cursor:pointer;font-weight:600}
.run-pill:disabled{opacity:.45;cursor:not-allowed}
.stage-card h3,.timeline-card h3,.event-card h3{margin:0 0 8px;font-size:13px;color:#35529e}
.stage-row{display:flex;justify-content:space-between;padding:5px 0;border-top:1px dashed #edf1ff}
.stage-row:first-of-type{border-top:0}
.timeline-card{max-height:300px;overflow:auto}
.timeline-item{display:flex;gap:8px;padding:8px 0;border-top:1px dashed #edf1ff}
.timeline-item:first-of-type{border-top:0}
.dot{width:10px;height:10px;border-radius:999px;margin-top:4px;background:#94a3b8;flex-shrink:0}
.dot.in_progress{background:#2563eb}
.dot.completed{background:#059669}
.timeline-main{min-width:0;flex:1}
.timeline-top{display:flex;justify-content:space-between;gap:8px}
.task-name{font-size:13px;color:#1f3b8a;font-weight:600}
.task-status{font-size:11px;border-radius:999px;padding:2px 8px;text-transform:uppercase}
.task-status.pending{background:#eef2f7;color:#64748b}
.task-status.in_progress{background:#e7efff;color:#1d4ed8}
.task-status.completed{background:#dff8ef;color:#047857}
.timeline-meta{font-size:12px;color:#64748b;margin-top:2px}
.log-fold{margin-top:6px}
.log-fold summary{font-size:12px;color:#315efb;cursor:pointer}
.log-item{font-size:12px;color:#5f7098;border-left:2px solid #e6edff;padding-left:6px;margin-top:4px}
.event-card{max-height:160px;overflow:auto}
.event-item{font-size:12px;color:#5f7098;padding:4px 0;border-top:1px dashed #edf1ff}
.event-item:first-of-type{border-top:0}
</style>
