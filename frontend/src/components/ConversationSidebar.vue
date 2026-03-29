<script setup lang="ts">
import type { ConversationSummary } from "../types";

defineProps<{
  conversations: ConversationSummary[];
  activeConversationId: string;
}>();

const emit = defineEmits<{
  create: [];
  open: [id: string];
}>();
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-dot"></div>
      <div>
        <div class="brand-title">Trade For Me</div>
        <div class="brand-subtitle">Conversation</div>
      </div>
    </div>

    <button class="new-chat" @click="emit('create')">+ 新建工作会话</button>
    <div class="section-label">历史对话</div>
    <div
      v-for="item in conversations"
      :key="item.conversation_id"
      class="conversation-card"
      :class="{ active: item.conversation_id === activeConversationId }"
      @click="emit('open', item.conversation_id)"
    >
      <div class="title">{{ item.title || "New Session" }}</div>
      <div class="time">{{ item.updated_at }}</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  background: #fbfdff;
  border: 1px solid #d8e2ff;
  border-radius: 18px;
  padding: 14px;
  box-shadow: 0 8px 30px rgba(83, 113, 255, 0.08);
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.brand { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.brand-dot { width: 12px; height: 12px; border-radius: 999px; background: linear-gradient(135deg, #4f7cff, #8ea8ff); }
.brand-title { font-size: 16px; font-weight: 700; color: #1e3a8a; }
.brand-subtitle { font-size: 12px; color: #64748b; }
.new-chat { width: 100%; margin-bottom: 10px; border: 0; border-radius: 12px; background: linear-gradient(135deg, #3f6dff, #6f8bff); color: #fff; padding: 10px 12px; cursor: pointer; font-weight: 600; }
.section-label { font-size: 12px; color: #64748b; margin: 8px 0; }
.conversation-card { border: 1px solid #dde6ff; padding: 10px; border-radius: 12px; margin-bottom: 10px; cursor: pointer; background: #fff; transition: 0.2s ease; }
.conversation-card:hover { transform: translateY(-1px); }
.conversation-card.active { border-color: #5b7eff; box-shadow: 0 6px 20px rgba(91, 126, 255, 0.15); }
.title { font-size: 13px; font-weight: 600; color: #1f3b8a; margin-bottom: 4px; }
.time { font-size: 11px; color: #7c8aa5; }

.sidebar::-webkit-scrollbar {
  width: 8px;
}
.sidebar::-webkit-scrollbar-thumb {
  background: #c8d5ff;
  border-radius: 999px;
}
.sidebar::-webkit-scrollbar-track {
  background: transparent;
}

@media (max-width: 900px) {
  .sidebar {
    border-radius: 14px;
    padding: 10px;
    max-height: 220px;
  }
  .conversation-card {
    margin-bottom: 8px;
    padding: 8px;
  }
}
</style>
