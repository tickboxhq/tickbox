<template>
  <ConsentProvider :config="config">
    <Content />
  </ConsentProvider>
</template>

<script setup lang="ts">
import { ConsentProvider } from '@tickboxhq/vue'
import Content from './Content.vue'
import config from './consent.config'
</script>
