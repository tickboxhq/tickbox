<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  type JurisdictionChoice,
  type VendorGroup,
  highlightConfig,
  renderConfig,
} from '../lib/render-config'

// -- Form state ---------------------------------------------------------------

const jurisdictions: { value: JurisdictionChoice; label: string; hint: string }[] = [
  { value: 'UK_DUAA', label: 'UK', hint: 'DUAA · statistical-purposes exemption' },
  { value: 'EU_GDPR', label: 'EU', hint: 'GDPR · consent for all tracking' },
  { value: 'auto', label: 'Both', hint: 'detect by visitor country' },
  { value: 'custom', label: 'Custom', hint: 'write your own jurisdiction' },
]

const vendorGroups: {
  value: VendorGroup
  label: string
  hint: string
}[] = [
  {
    value: 'privacy_analytics',
    label: 'Privacy analytics',
    hint: 'Plausible, Fathom, GoatCounter…',
  },
  { value: 'ad_pixels', label: 'Ad pixels & GA / GTM', hint: 'GA4, Meta, TikTok, LinkedIn…' },
  { value: 'session_replay', label: 'Session replay', hint: 'Hotjar, FullStory, Clarity…' },
  { value: 'product_analytics', label: 'Product analytics / CDP', hint: 'Mixpanel, Amplitude…' },
  { value: 'marketing_automation', label: 'Marketing automation', hint: 'HubSpot, Klaviyo…' },
  { value: 'chat', label: 'Chat widgets', hint: 'Intercom, Drift, Crisp…' },
  { value: 'ai_training', label: 'AI training opt-out', hint: 'GPTBot, ClaudeBot, etc.' },
]

const jurisdiction = ref<JurisdictionChoice>('UK_DUAA')
const picked = ref<Set<VendorGroup>>(new Set(['privacy_analytics']))
const policyUrl = ref('/privacy')

const today = new Date().toISOString().slice(0, 10)

function toggle(group: VendorGroup) {
  const next = new Set(picked.value)
  if (next.has(group)) next.delete(group)
  else next.add(group)
  picked.value = next
}

// -- Derived ------------------------------------------------------------------

const generated = computed(() =>
  renderConfig({
    jurisdiction: jurisdiction.value,
    vendorGroups: Array.from(picked.value),
    policyUrl: policyUrl.value.trim() || undefined,
    policyVersion: today,
  }),
)

const generatedHtml = computed(() => highlightConfig(generated.value))
const generatedLineCount = computed(() => generated.value.split('\n').length - 1)

// -- Banner-preview helpers ---------------------------------------------------

const previewCategories = computed(() => {
  const cats: { id: string; label: string; required: boolean; granted: boolean }[] = [
    { id: 'necessary', label: 'Necessary', required: true, granted: true },
  ]
  if (picked.value.has('privacy_analytics')) {
    cats.push({
      id: 'analytics',
      label: 'Analytics',
      required: false,
      granted: jurisdiction.value === 'UK_DUAA',
    })
  }
  if (
    picked.value.has('ad_pixels') ||
    picked.value.has('session_replay') ||
    picked.value.has('product_analytics') ||
    picked.value.has('marketing_automation') ||
    picked.value.has('chat')
  ) {
    cats.push({ id: 'marketing', label: 'Marketing', required: false, granted: false })
  }
  if (picked.value.has('ai_training')) {
    cats.push({ id: 'ai_training', label: 'AI training', required: false, granted: false })
  }
  return cats
})

const noticeOnly = computed(
  () =>
    jurisdiction.value === 'UK_DUAA' &&
    picked.value.size > 0 &&
    Array.from(picked.value).every((g) => g === 'privacy_analytics'),
)

// -- Copy + download ----------------------------------------------------------

const copyState = ref<'idle' | 'copied' | 'error'>('idle')

async function copy() {
  try {
    await navigator.clipboard.writeText(generated.value)
    copyState.value = 'copied'
    setTimeout(() => {
      copyState.value = 'idle'
    }, 1600)
  } catch {
    copyState.value = 'error'
    setTimeout(() => {
      copyState.value = 'idle'
    }, 2400)
  }
}

function download() {
  const blob = new Blob([generated.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'consent.config.ts'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="builder">
    <!-- ┌─────────────────────────────────────┐ -->
    <!-- │  CONTROLS  +  CODE OUTPUT           │ -->
    <!-- │  ─────────                          │ -->
    <!-- │  LIVE PREVIEW                       │ -->
    <!-- └─────────────────────────────────────┘ -->

    <div class="builder-grid">
      <!-- LEFT: form controls -->
      <section class="panel panel--paper">
        <!-- 01 jurisdiction -->
        <div class="step">
          <div class="step-head">
            <span class="step-n">01</span>
            <h3 class="step-title">Jurisdiction</h3>
          </div>
          <fieldset class="control-grid">
            <legend class="sr-only">Pick a jurisdiction</legend>
            <label v-for="j in jurisdictions" :key="j.value" class="radio">
              <input
                type="radio"
                name="jurisdiction"
                :value="j.value"
                v-model="jurisdiction"
              />
              <span class="radio-mark" aria-hidden="true"></span>
              <span class="radio-body">
                <span class="radio-label">{{ j.label }}</span>
                <span class="radio-hint">{{ j.hint }}</span>
              </span>
            </label>
          </fieldset>
        </div>

        <!-- 02 vendor groups -->
        <div class="step">
          <div class="step-head">
            <span class="step-n">02</span>
            <h3 class="step-title">Vendor groups</h3>
            <span class="step-meta">{{ picked.size }} selected</span>
          </div>
          <div class="control-list">
            <button
              v-for="v in vendorGroups"
              :key="v.value"
              type="button"
              class="check"
              :class="{ 'is-checked': picked.has(v.value) }"
              :aria-pressed="picked.has(v.value)"
              @click="toggle(v.value)"
            >
              <span class="check-mark" aria-hidden="true">
                <svg viewBox="0 0 12 12" v-if="picked.has(v.value)">
                  <path
                    d="M2 6.5 L5 9.5 L10 3"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="square"
                  />
                </svg>
              </span>
              <span class="check-body">
                <span class="check-label">{{ v.label }}</span>
                <span class="check-hint">{{ v.hint }}</span>
              </span>
            </button>
          </div>
        </div>

        <!-- 03 policy url -->
        <div class="step">
          <div class="step-head">
            <span class="step-n">03</span>
            <h3 class="step-title">Privacy policy URL</h3>
            <span class="step-meta">optional</span>
          </div>
          <input
            v-model="policyUrl"
            type="text"
            placeholder="/privacy"
            class="text-input"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
      </section>

      <!-- RIGHT: code output -->
      <section class="panel panel--ink">
        <div class="code-header">
          <div class="code-tag">
            <span class="tick tick-filled" aria-hidden="true"></span>
            <span>consent.config.ts</span>
          </div>
          <div class="code-meta">
            <span>{{ generatedLineCount }} lines</span>
            <span class="dot">·</span>
            <span>generated · {{ today }}</span>
          </div>
        </div>
        <pre class="code-out"><code v-html="generatedHtml"></code></pre>
        <div class="code-actions">
          <button type="button" class="action-btn primary" @click="copy">
            <span v-if="copyState === 'copied'">Copied ✓</span>
            <span v-else-if="copyState === 'error'">Copy failed</span>
            <span v-else>Copy config →</span>
          </button>
          <button type="button" class="action-btn" @click="download">
            Download .ts
          </button>
          <a href="https://app.tickbox.dev" class="action-btn ghost" rel="noopener">
            Save to dashboard ↗
          </a>
        </div>
      </section>
    </div>

    <!-- BOTTOM: live banner preview -->
    <section class="preview-frame">
      <div class="preview-head">
        <span class="eyebrow"><strong>Live preview</strong> · how it renders on your site</span>
        <span class="eyebrow">
          mode · <strong>{{ noticeOnly ? 'notice' : 'consent' }}</strong>
        </span>
      </div>

      <div class="preview-stage">
        <!-- A faux browser window showing the banner -->
        <div class="browser">
          <div class="browser-bar">
            <span class="dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
            <span class="url-bar">your-site.example</span>
          </div>
          <div class="browser-body">
            <div class="page-fade"></div>

            <!-- the banner -->
            <div class="bnr" v-if="noticeOnly">
              <p class="bnr-title">Just so you know</p>
              <p class="bnr-body">
                We use privacy-friendly analytics to understand how the site
                is used. No personal data, no advertising.
                <a v-if="policyUrl" :href="policyUrl">Privacy policy</a>
              </p>
              <div class="bnr-actions">
                <button class="bnr-btn ghost">Manage</button>
                <button class="bnr-btn primary">Got it</button>
              </div>
            </div>

            <div class="bnr" v-else-if="previewCategories.length > 1">
              <p class="bnr-title">Cookie preferences</p>
              <p class="bnr-body">
                We use cookies for the categories below. Necessary ones stay
                on; the rest are your call.
                <a v-if="policyUrl" :href="policyUrl">Privacy policy</a>
              </p>
              <ul class="bnr-cats">
                <li v-for="c in previewCategories" :key="c.id">
                  <span
                    class="bnr-pill"
                    :class="{ 'is-required': c.required, 'is-on': c.granted && !c.required }"
                  >
                    {{ c.label }}<span v-if="c.required" class="bnr-pill-tag">required</span>
                  </span>
                </li>
              </ul>
              <div class="bnr-actions">
                <button class="bnr-btn ghost">Customise</button>
                <button class="bnr-btn">Reject all</button>
                <button class="bnr-btn primary">Accept all</button>
              </div>
            </div>

            <div class="bnr bnr--empty" v-else>
              <p class="bnr-title">No banner needed</p>
              <p class="bnr-body">
                With no non-necessary categories, there's nothing to ask
                about. Pick a vendor group above to see the banner.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.builder {
  display: grid;
  gap: 1.5rem;
}

.builder-grid {
  display: grid;
  gap: 0;
  border: 1px solid var(--color-ink);
}

@media (min-width: 960px) {
  .builder-grid {
    grid-template-columns: 1fr 1.05fr;
  }
}

.panel {
  padding: 1.75rem;
}

@media (min-width: 960px) {
  .panel {
    padding: 2.25rem;
  }
  .panel--paper {
    border-right: 1px solid var(--color-ink);
  }
}

@media (max-width: 959.98px) {
  .panel--paper {
    border-bottom: 1px solid var(--color-ink);
  }
}

.panel--paper {
  background: var(--color-paper);
  color: var(--color-ink);
}
.panel--ink {
  background: var(--color-ink);
  color: var(--color-paper);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Step block ----------------------------------------------------------- */

.step {
  padding-block: 1.5rem;
  border-bottom: 1px solid var(--color-rule-soft);
}
.step:first-child {
  padding-top: 0;
}
.step:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.step-head {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.step-n {
  font-family: var(--font-mono);
  font-size: 1.5rem;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}
.step-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  line-height: 1;
  font-weight: 400;
  letter-spacing: -0.01em;
}
.step-meta {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-muted);
}

/* Radios -------------------------------------------------------------- */

.control-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  gap: 0;
  border: 1px solid var(--color-rule-soft);
}
.radio {
  position: relative;
  display: flex;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
  border-right: 1px solid var(--color-rule-soft);
  border-bottom: 1px solid var(--color-rule-soft);
  background: var(--color-paper);
  transition: background 0.12s ease;
}
.radio:hover {
  background: var(--color-paper-2);
}
.radio input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.radio-mark {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--color-ink);
  border-radius: 999px;
  margin-top: 2px;
  flex-shrink: 0;
  position: relative;
  background: var(--color-paper);
}
.radio input:checked + .radio-mark {
  background: var(--color-ink);
  box-shadow: inset 0 0 0 3px var(--color-accent);
}
.radio input:focus-visible + .radio-mark {
  outline: 2px solid var(--color-ink);
  outline-offset: 2px;
}
.radio-body {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.radio-label {
  font-weight: 500;
  font-size: 0.95rem;
}
.radio-hint {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-top: 0.2rem;
}

/* Checkboxes ---------------------------------------------------------- */

.control-list {
  display: grid;
  border: 1px solid var(--color-rule-soft);
}
.check {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  text-align: left;
  width: 100%;
  background: var(--color-paper);
  border: 0;
  border-bottom: 1px solid var(--color-rule-soft);
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition:
    background 0.12s ease,
    color 0.12s ease;
}
.check:last-child {
  border-bottom: 0;
}
.check:hover {
  background: var(--color-paper-2);
}
.check.is-checked {
  background: var(--color-ink);
  color: var(--color-paper);
}
.check.is-checked:hover {
  background: var(--color-ink-soft);
}
.check.is-checked .check-hint {
  color: rgba(250, 250, 245, 0.6);
}
.check-mark {
  width: 18px;
  height: 18px;
  border: 1.5px solid currentColor;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.check.is-checked .check-mark {
  background: var(--color-accent);
  color: var(--color-accent-ink);
  border-color: var(--color-accent);
}
.check.is-checked .check-mark svg {
  width: 100%;
  height: 100%;
}
.check-body {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  min-width: 0;
}
.check-label {
  font-weight: 500;
  font-size: 0.95rem;
}
.check-hint {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-muted);
  margin-top: 0.2rem;
}

/* Text input ---------------------------------------------------------- */

.text-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-paper);
  border: 1px solid var(--color-rule-soft);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--color-ink);
  transition: border-color 0.12s ease;
}
.text-input:hover {
  border-color: var(--color-ink);
}
.text-input:focus {
  outline: none;
  border-color: var(--color-ink);
  box-shadow: 0 0 0 2px var(--color-accent);
}

/* Code output --------------------------------------------------------- */

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid rgba(250, 250, 245, 0.15);
  margin-bottom: 1rem;
}
.code-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-paper);
}
.code-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(250, 250, 245, 0.5);
}
.code-meta .dot {
  color: rgba(250, 250, 245, 0.3);
}

.code-out {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
  padding: 0;
  color: var(--color-paper);
  min-height: 16rem;
}
.code-out :deep(.c-key) {
  color: var(--color-accent);
}
.code-out :deep(.c-str) {
  color: #f5e6a8;
}
.code-out :deep(.c-com) {
  color: #6b6961;
  font-style: italic;
}
.code-out :deep(.c-fn) {
  color: #c5e6ff;
}

.code-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(250, 250, 245, 0.15);
}
.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.6rem 0.95rem;
  background: transparent;
  color: var(--color-paper);
  font-family: var(--font-sans);
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid rgba(250, 250, 245, 0.3);
  cursor: pointer;
  text-decoration: none;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}
.action-btn:hover {
  border-color: var(--color-paper);
}
.action-btn.primary {
  background: var(--color-accent);
  color: var(--color-accent-ink);
  border-color: var(--color-accent);
}
.action-btn.primary:hover {
  background: var(--color-paper);
  border-color: var(--color-paper);
}
.action-btn.ghost {
  margin-left: auto;
  color: rgba(250, 250, 245, 0.7);
}

/* Live preview frame -------------------------------------------------- */

.preview-frame {
  border: 1px solid var(--color-ink);
  background: var(--color-paper-2);
}
.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--color-ink);
  background: var(--color-paper);
}
.preview-stage {
  padding: 2.5rem;
}

.browser {
  max-width: 52rem;
  margin: 0 auto;
  background: var(--color-paper);
  border: 1px solid var(--color-ink);
  box-shadow: 8px 8px 0 var(--color-ink);
}
.browser-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--color-ink);
  background: var(--color-paper-2);
}
.dots {
  display: inline-flex;
  gap: 0.3rem;
}
.dots span {
  width: 10px;
  height: 10px;
  border: 1.5px solid var(--color-ink);
  border-radius: 999px;
}
.url-bar {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  color: var(--color-muted);
  padding: 0.2rem 0.55rem;
  background: var(--color-paper);
  border: 1px solid var(--color-rule-soft);
}
.browser-body {
  position: relative;
  min-height: 14rem;
  padding: 1.25rem;
}
.page-fade {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      to bottom,
      transparent 0 14px,
      rgba(11, 11, 11, 0.04) 14px 16px
    ),
    var(--color-paper);
  pointer-events: none;
}

/* The banner inside the browser frame ---------------------------------- */

.bnr {
  position: absolute;
  left: 1.25rem;
  right: 1.25rem;
  bottom: 1.25rem;
  background: var(--color-paper);
  border: 1px solid var(--color-ink);
  box-shadow: 4px 4px 0 var(--color-ink);
  padding: 1.1rem 1.25rem;
}
.bnr--empty {
  background: var(--color-paper);
  box-shadow: none;
  color: var(--color-muted);
}
.bnr-title {
  font-family: var(--font-display);
  font-size: 1.25rem;
  line-height: 1;
  margin-bottom: 0.5rem;
}
.bnr-body {
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--color-ink-soft);
  max-width: 38rem;
}
.bnr-body a {
  color: var(--color-ink);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
.bnr-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.8rem 0;
  list-style: none;
  padding: 0;
}
.bnr-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.2rem 0.55rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--color-paper-2);
  border: 1px solid var(--color-rule-soft);
  color: var(--color-ink-soft);
}
.bnr-pill.is-required {
  background: var(--color-ink);
  color: var(--color-paper);
  border-color: var(--color-ink);
}
.bnr-pill.is-on {
  background: var(--color-accent);
  color: var(--color-accent-ink);
  border-color: var(--color-accent);
}
.bnr-pill-tag {
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  opacity: 0.7;
}
.bnr-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}
.bnr-btn {
  padding: 0.45rem 0.85rem;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid var(--color-ink);
  background: var(--color-paper);
  color: var(--color-ink);
  cursor: pointer;
}
.bnr-btn.ghost {
  background: transparent;
  border-color: var(--color-rule-soft);
  color: var(--color-ink-soft);
}
.bnr-btn.primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: var(--color-accent-ink);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
