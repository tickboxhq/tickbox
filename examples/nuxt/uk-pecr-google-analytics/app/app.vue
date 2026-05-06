<template>
  <main style="font-family: system-ui; max-width: 640px; margin: 4rem auto; padding: 0 1rem">
    <h1>Tickbox Nuxt — UK PECR + Google Analytics</h1>
    <p>Open DevTools → Network. <strong>No requests to <code>googletagmanager.com</code> or <code>google-analytics.com</code> until you click Accept.</strong></p>
    <p>Analytics: <strong>{{ analytics.granted.value ? 'granted' : 'denied' }}</strong></p>
    <button type="button" @click="reset">Reset consent</button>

    <ConsentBanner v-slot="{ grantAll, denyAll }">
      <div class="banner" role="dialog" aria-label="Cookie preferences">
        <p style="margin: 0">
          We use Google Analytics. Reject if you'd rather not be tracked.
        </p>
        <div class="row">
          <button type="button" @click="denyAll">Reject all</button>
          <button type="button" class="accept" @click="grantAll">Accept all</button>
        </div>
      </div>
    </ConsentBanner>
  </main>
</template>

<script setup lang="ts">
const analytics = useConsent('analytics')

function reset() {
  if (typeof document === 'undefined') return
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
.row { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.75rem; }
.row button.accept { background: #0ea5e9; color: white; border: 0; padding: 0.4rem 0.8rem; border-radius: 0.25rem; }
</style>
