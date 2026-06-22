<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';

const { variant, source } = useExperiment('homepage-hero');
const exposures = ref<string[]>([]);
let onExposure: (e: Event) => void;

onMounted(() => {
  onExposure = (e) => {
    const d = (e as CustomEvent).detail as {
      experiment: string;
      variant: string;
    };
    exposures.value.push(`${d.experiment}=${d.variant}`);
  };
  window.addEventListener('abnxt:exposure', onExposure);
});
onBeforeUnmount(() => window.removeEventListener('abnxt:exposure', onExposure));
</script>

<template>
  <section>
    <Experiment name="homepage-hero">
      <template #A><div class="hero-a">Hero A</div></template>
      <template #B><div class="hero-b">Hero B</div></template>
    </Experiment>
    <p>variant: {{ variant }} (source: {{ source }})</p>
    <p>exposures: {{ exposures.join(', ') || '(none yet)' }}</p>
    <NuxtLink to="/abnxt-admin">admin</NuxtLink>
  </section>
</template>
