<template>
  <main style="font-family: system-ui; max-width: 640px; margin: 4rem auto; padding: 0 1rem">
    <h1>Tickbox Vue example</h1>
    <p>Marketing consent: <strong>{{ marketing.granted.value ? 'granted' : 'denied' }}</strong></p>
    <p v-if="marketing.granted.value">Imagine a Meta Pixel firing here.</p>
    <p v-else style="color: #666">Marketing scripts won't load until you accept.</p>
    <button type="button" @click="reset">Reset consent</button>

    <ConsentBanner v-slot="{ grantAll, denyAll }">
      <div class="banner" role="dialog" aria-label="Cookie preferences">
        <p style="margin: 0">We use analytics and marketing cookies.</p>
        <div class="row">
          <button type="button" @click="denyAll">Reject all</button>
          <button type="button" class="accept" @click="grantAll">Accept all</button>
        </div>
      </div>
    </ConsentBanner>
  </main>
</template>

<script setup lang="ts">
import { ConsentBanner, useConsent } from '@tickboxhq/vue'

const marketing = useConsent('marketing')

function reset() {
  document.cookie = '__tb_consent=; Path=/; Max-Age=0'
  location.reload()
}
</script>

<style scoped>
.banner {
  position: fixed;
  inset-inline: 1rem;
  bottom: 1rem;
  max-width: 32rem;
  margin: 0 auto;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  padding: 1rem 1.25rem;
}
.row {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}
.row button.accept {
  background: #0ea5e9;
  color: white;
  border: 0;
  padding: 0.4rem 0.8rem;
  border-radius: 0.25rem;
}
</style>
