<script setup lang="ts">
import { computed } from 'vue';
import { useRuntimeConfig } from 'nuxt/app';
import AbnxtAdmin from '../components/AbnxtAdmin.vue';

// 모듈이 runtimeConfig.public.abnxt.admin로 내려준 엔드포인트/타이틀을 props로 전달.
const rc = useRuntimeConfig();
const admin = computed(
  () =>
    (
      rc.public.abnxt as
        | {
            admin?: {
              configEndpoint?: string;
              authEndpoint?: string;
              title?: string;
            };
          }
        | undefined
    )?.admin ?? {},
);
</script>

<template>
  <AbnxtAdmin
    :config-endpoint="admin.configEndpoint"
    :auth-endpoint="admin.authEndpoint"
    :title="admin.title"
  />
</template>
