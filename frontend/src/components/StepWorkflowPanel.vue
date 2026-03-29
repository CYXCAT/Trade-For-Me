<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { WorkflowStep } from "../types";

const props = defineProps<{
  activeStep: WorkflowStep | null;
  state: Record<string, unknown>;
  errorMessage: string;
}>();

const emit = defineEmits<{
  submit: [stepKey: string, value: unknown];
  updateState: [key: string, value: unknown];
}>();

const customInput = ref("");
const customTickerMode = ref(false);

const selectedAnalysts = computed(() =>
  Array.isArray(props.state.analysts) ? (props.state.analysts as string[]) : [],
);

watch(
  () => props.activeStep?.key,
  () => {
    customInput.value = "";
    customTickerMode.value = false;
  },
);

function chooseTickerPreset(value: string) {
  emit("updateState", "ticker", value);
  emit("submit", "ticker", value);
}

function submit(stepKey: string, value: unknown) {
  emit("submit", stepKey, value);
}

function toggleAnalyst(value: string) {
  const current = new Set(selectedAnalysts.value);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  emit("updateState", "analysts", Array.from(current));
}
</script>

<template>
  <section class="step-panel" v-if="activeStep">
    <div class="step-header">
      <h3>{{ activeStep.title }}</h3>
      <p>{{ activeStep.prompt }}</p>
    </div>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="option-grid" v-if="activeStep.kind === 'choice_or_input'">
      <button class="option-card" @click="chooseTickerPreset('SPY')">SPY（默认）</button>
      <button class="option-card" @click="customTickerMode = true">自定义</button>
      <div v-if="customTickerMode">
        <input
          :value="String(state.ticker || '')"
          @input="emit('updateState', 'ticker', ($event.target as HTMLInputElement).value)"
          placeholder="输入代码，例如 AAPL / TSLA / 0700.HK"
        />
        <button
          class="submit-btn"
          :disabled="!String(state.ticker || '').trim()"
          @click="submit(activeStep.key, state.ticker)"
        >提交代码</button>
      </div>
    </div>

    <div class="option-grid" v-else-if="activeStep.kind === 'single_select' || activeStep.kind === 'single_select_or_custom'">
      <button class="option-card" v-for="op in activeStep.options" :key="String(op.value)" @click="submit(activeStep.key, op.value)">
        {{ op.label }}
      </button>
      <div class="custom-block" v-if="activeStep.kind === 'single_select_or_custom'">
        <input v-model="customInput" placeholder="或输入自定义 model id" />
        <button class="submit-btn" :disabled="!customInput.trim()" @click="submit(activeStep.key, customInput)">提交自定义模型</button>
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
      <button class="submit-btn" :disabled="selectedAnalysts.length === 0" @click="submit(activeStep.key, selectedAnalysts)">提交分析师选择</button>
    </div>

    <div class="option-grid" v-else-if="activeStep.kind === 'date_input' || activeStep.kind === 'optional_text'">
      <input
        :type="activeStep.kind === 'date_input' ? 'date' : 'text'"
        v-model="customInput"
        :placeholder="activeStep.kind === 'optional_text' ? '可留空后点跳过' : '选择日期'"
      />
      <div class="actions">
        <button
          class="submit-btn"
          :disabled="activeStep.kind === 'date_input' && !customInput.trim()"
          @click="submit(activeStep.key, customInput)"
        >提交</button>
        <button class="ghost-btn" v-if="activeStep.kind === 'optional_text'" @click="submit(activeStep.key, null)">跳过</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.step-panel { border: 1px solid #dfe7ff; border-radius: 14px; padding: 12px; background: linear-gradient(180deg, #ffffff, #f8faff); }
.step-header h3 { margin: 0; color: #20408f; }
.step-header p { margin: 4px 0 0; color: #6e81ae; font-size: 13px; }
.option-grid { margin-top: 10px; }
.option-card { border: 1px solid #d8e3ff; background: #fff; color: #1f3b8a; border-radius: 12px; padding: 10px 12px; margin-right: 8px; margin-bottom: 8px; cursor: pointer; transition: 0.15s ease; }
.option-card:hover { border-color: #6f8bff; box-shadow: 0 5px 18px rgba(83, 113, 255, 0.18); }
.option-card.selected { border-color: #3f6dff; background: #eef3ff; }
.submit-btn,.ghost-btn { border: 0; border-radius: 10px; padding: 9px 12px; cursor: pointer; margin-right: 8px; font-family: inherit; }
.submit-btn { color: #fff; background: linear-gradient(135deg, #3f6dff, #7a95ff); }
.ghost-btn { color: #315efb; background: #edf2ff; }
.actions { margin-top: 8px; }
input { width: 100%; padding: 10px; border-radius: 10px; border: 1px solid #cfdbff; background: #fff; color: #1f3b8a; margin-bottom: 8px; outline: none; }
input:focus { border-color: #6d8cff; box-shadow: 0 0 0 3px rgba(109, 140, 255, 0.16); }
.error { color: #b91c1c; margin: 6px 0 10px; font-size: 13px; }

@media (max-width: 900px) {
  .step-panel { padding: 10px; }
  .step-header h3 { font-size: 16px; }
  .option-card {
    width: 100%;
    margin-right: 0;
    text-align: left;
  }
  .submit-btn,
  .ghost-btn {
    width: 100%;
    margin: 0 0 8px;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
</style>
