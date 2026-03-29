<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { Message } from "../types";

const props = defineProps<{
  messages: Message[];
  highlightIndex: number | null;
}>();

const containerRef = ref<HTMLElement | null>(null);

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}

watch(
  () => props.highlightIndex,
  async (idx) => {
    if (idx === null || idx < 0) return;
    await nextTick();
    const root = containerRef.value;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(`[data-message-index="${idx}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    window.setTimeout(() => el.classList.remove("flash"), 900);
  },
);
</script>

<template>
  <section class="messages" ref="containerRef">
    <div
      v-for="(msg, idx) in messages"
      :key="idx"
      class="message-row"
      :class="msg.role"
      :data-message-index="idx"
    >
      <div class="avatar">{{ msg.role === "assistant" ? "AI" : msg.role === "user" ? "U" : "SYS" }}</div>
      <div class="bubble">
        <div class="role">{{ msg.role }}</div>
        <pre class="content">{{ messageText(msg.content) }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.messages {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid #e1e8ff;
  border-radius: 14px;
  padding: 12px;
  background: #ffffff;
}
.message-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; border-radius: 10px; transition: background-color .2s ease; }
.message-row.flash { background: rgba(121, 155, 255, 0.12); }
.avatar { width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; flex-shrink: 0; }
.message-row.assistant .avatar { background: linear-gradient(135deg, #315efb, #7fa1ff); }
.message-row.user .avatar { background: linear-gradient(135deg, #16a34a, #34d399); }
.message-row.system .avatar, .message-row.tool .avatar { background: linear-gradient(135deg, #64748b, #94a3b8); }
.bubble { border: 1px solid #e2e8ff; border-radius: 12px; background: #f8faff; padding: 8px 10px; min-width: 0; max-width: min(900px, 100%); }
.message-row.user .bubble { background: #f0fff4; border-color: #c8f0d6; }
.role { font-size: 11px; font-weight: 700; color: #5b6f9a; text-transform: uppercase; letter-spacing: 0.04em; }
.content { margin: 4px 0 0; white-space: pre-wrap; word-break: break-word; color: #1d2b4f; font-size: 13px; line-height: 1.45; }

.messages::-webkit-scrollbar {
  width: 10px;
}
.messages::-webkit-scrollbar-thumb {
  background: #c8d5ff;
  border-radius: 999px;
}
.messages::-webkit-scrollbar-track {
  background: transparent;
}

@media (max-width: 900px) {
  .messages { padding: 8px; }
  .avatar { width: 26px; height: 26px; border-radius: 8px; }
  .bubble { padding: 8px; }
  .content { font-size: 12px; }
}
</style>
