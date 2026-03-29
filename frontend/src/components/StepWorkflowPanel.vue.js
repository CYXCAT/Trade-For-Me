import { computed, ref, watch } from "vue";
const props = defineProps();
const emit = defineEmits();
const customInput = ref("");
const customTickerMode = ref(false);
const selectedAnalysts = computed(() => Array.isArray(props.state.analysts) ? props.state.analysts : []);
watch(() => props.activeStep?.key, () => {
    customInput.value = "";
    customTickerMode.value = false;
});
function chooseTickerPreset(value) {
    emit("updateState", "ticker", value);
    emit("submit", "ticker", value);
}
function submit(stepKey, value) {
    emit("submit", stepKey, value);
}
function toggleAnalyst(value) {
    const current = new Set(selectedAnalysts.value);
    if (current.has(value))
        current.delete(value);
    else
        current.add(value);
    emit("updateState", "analysts", Array.from(current));
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
/** @type {__VLS_StyleScopedClasses['step-header']} */ ;
/** @type {__VLS_StyleScopedClasses['option-card']} */ ;
/** @type {__VLS_StyleScopedClasses['option-card']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['step-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['step-header']} */ ;
/** @type {__VLS_StyleScopedClasses['option-card']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
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
                    __VLS_ctx.customTickerMode = true;
                    // @ts-ignore
                    [customTickerMode,];
                } },
            ...{ class: "option-card" },
        });
        /** @type {__VLS_StyleScopedClasses['option-card']} */ ;
        if (__VLS_ctx.customTickerMode) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ onInput: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!(__VLS_ctx.customTickerMode))
                            return;
                        __VLS_ctx.emit('updateState', 'ticker', $event.target.value);
                        // @ts-ignore
                        [customTickerMode, emit,];
                    } },
                value: (String(__VLS_ctx.state.ticker || '')),
                placeholder: "输入代码，例如 AAPL / TSLA / 0700.HK",
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeStep))
                            return;
                        if (!(__VLS_ctx.activeStep.kind === 'choice_or_input'))
                            return;
                        if (!(__VLS_ctx.customTickerMode))
                            return;
                        __VLS_ctx.submit(__VLS_ctx.activeStep.key, __VLS_ctx.state.ticker);
                        // @ts-ignore
                        [activeStep, state, state, submit,];
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
                        __VLS_ctx.submit(__VLS_ctx.activeStep.key, op.value);
                        // @ts-ignore
                        [activeStep, activeStep, activeStep, activeStep, state, submit,];
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
                        __VLS_ctx.submit(__VLS_ctx.activeStep.key, __VLS_ctx.customInput);
                        // @ts-ignore
                        [activeStep, activeStep, submit, customInput, customInput,];
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
                    __VLS_ctx.submit(__VLS_ctx.activeStep.key, __VLS_ctx.selectedAnalysts);
                    // @ts-ignore
                    [activeStep, submit, selectedAnalysts,];
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
                    __VLS_ctx.submit(__VLS_ctx.activeStep.key, __VLS_ctx.customInput);
                    // @ts-ignore
                    [activeStep, activeStep, activeStep, activeStep, activeStep, submit, customInput, customInput, selectedAnalysts,];
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
                        __VLS_ctx.submit(__VLS_ctx.activeStep.key, null);
                        // @ts-ignore
                        [activeStep, activeStep, activeStep, submit, customInput,];
                    } },
                ...{ class: "ghost-btn" },
            });
            /** @type {__VLS_StyleScopedClasses['ghost-btn']} */ ;
        }
    }
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
    __typeProps: {},
});
export default {};
