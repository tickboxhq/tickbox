<template>
  <main style="font-family: system-ui; max-width: 640px; margin: 4rem auto; padding: 0 1rem">
    <h1>Tickbox Nuxt — AI training opt-out</h1>
    <p>
      Visit <a href="/ai.txt"><code>/ai.txt</code></a> — the file is generated
      from <code>consent.config.ts</code> by the
      <code>@tickboxhq/nuxt</code> Nitro route.
    </p>
    <p>
      Flip <code>ai_training.default</code> in the config and reload the
      <code>/ai.txt</code> tab. The output changes between
      <code>Disallow: /</code> and <code>Allow: /</code> on next request,
      no rebuild needed.
    </p>
  </main>
</template>
