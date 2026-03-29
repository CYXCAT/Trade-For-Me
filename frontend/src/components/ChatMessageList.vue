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
  if (content && typeof content === "object" && !Array.isArray(content)) {
    const rec = content as Record<string, unknown>;
    if ("step_key" in rec && "value" in rec) {
      const v = rec.value;
      const valStr =
        v !== null && typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      return `【${String(rec.step_key)}】${valStr}`;
    }
    if (typeof rec.final_prompt === "string") {
      return `分析请求：\n${rec.final_prompt}`;
    }
  }
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
      <div class="bubble">
        <div class="content">{{ messageText(msg.content) }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.messages {
  overflow-x: hidden;
  border: 0;
  border-radius: 0;
  padding: 4px 0;
  background: transparent;
}
.message-row { display: flex; margin-bottom: 10px; border-radius: 10px; transition: background-color .2s ease; }
.message-row.flash { background: rgba(121, 155, 255, 0.12); }
.message-row .bubble { min-width: 0; max-width: min(900px, 100%); border-radius: 12px; padding: 8px 10px; }
.message-row.assistant,
.message-row.system,
.message-row.tool {
  justify-content: flex-start;
}
.message-row.assistant .bubble,
.message-row.system .bubble,
.message-row.tool .bubble {
  border: 0;
  background: transparent;
  padding-left: 0;
}
.message-row.user {
  justify-content: flex-end;
}
.message-row.user .bubble {
  border: 1px solid #c8d8ff;
  background: linear-gradient(180deg, #f7faff, #eef3ff);
}
/* 用户气泡：略紧凑 */
.content {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1d2b4f;
  font-size: 13px;
  line-height: 1.45;
}

/* 模型/助手：参考 ChatGPT 网页——ui-sans-serif 栈、略大字号、舒适行高 */
.message-row.assistant .content,
.message-row.system .content,
.message-row.tool .content {
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    "Helvetica Neue",
    Arial,
    "Noto Sans",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    sans-serif;
  font-size: 15px;
  line-height: 1.58;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: #353740;
}

@media (max-width: 900px) {
  .messages { padding: 4px 0; }
  .bubble { padding: 8px; }
  .content { font-size: 12px; }
  .message-row.assistant .content,
  .message-row.system .content,
  .message-row.tool .content {
    font-size: 14px;
    line-height: 1.55;
  }
}
</style>
