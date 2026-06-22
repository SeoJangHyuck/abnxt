<script setup lang="ts">
import { computed, useSlots, inject, onMounted } from 'vue';
import { useExperiment } from '../composables/useExperiment';
import { AB_INJECTION_KEY } from '../shared';

const props = defineProps<{ name: string }>();
const runtime = inject(AB_INJECTION_KEY)!; // useExperiment가 미주입 시 throw하므로 안전
const { variant } = useExperiment(props.name);
const slots = useSlots();

const chosen = computed<string | undefined>(() => {
  if (slots[variant.value]) return variant.value;
  const control = runtime.controlKey(props.name);
  return control && slots[control] ? control : undefined;
});

// 배정 변이 slot도 control slot도 없으면 dev 경고(react <Experiment> 대칭).
onMounted(() => {
  const isDev = (import.meta as { dev?: boolean }).dev;
  if (!chosen.value && isDev) {
    console.warn(
      `abnxt: <Experiment name="${props.name}"> has no slot for "${variant.value}" and no control fallback`,
    );
  }
});
</script>

<template>
  <slot
    v-if="chosen"
    :name="chosen"
  />
</template>
