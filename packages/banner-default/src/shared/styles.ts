/**
 * Inline CSS for the default banner / notice / modal components.
 *
 * Uses CSS custom properties so users can re-theme without forking. Light
 * and dark themes are wired through `prefers-color-scheme` and the
 * `[data-tb-theme]` attribute.
 *
 * Visual style: GitHub-ish — system font, 6px corners, subtle border + soft
 * shadow, equal-prominence accept/reject buttons.
 */
export const TICKBOX_STYLES = `
:where(.tb-root) {
  --tb-bg: #ffffff;
  --tb-fg: #1f2328;
  --tb-fg-muted: #59636e;
  --tb-border: #d1d9e0;
  --tb-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
  --tb-primary-bg: #1f2328;
  --tb-primary-fg: #ffffff;
  --tb-primary-bg-hover: #000000;
  --tb-secondary-bg: #ffffff;
  --tb-secondary-fg: #1f2328;
  --tb-secondary-bg-hover: #f6f8fa;
  --tb-link: #0969da;
  --tb-radius: 6px;
  --tb-z: 2147483000;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
  color: var(--tb-fg);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  :where(.tb-root:not([data-tb-theme="light"])) {
    --tb-bg: #0d1117;
    --tb-fg: #f0f6fc;
    --tb-fg-muted: #9198a1;
    --tb-border: #30363d;
    --tb-shadow: 0 8px 24px rgba(1, 4, 9, 0.85);
    --tb-primary-bg: #f0f6fc;
    --tb-primary-fg: #0d1117;
    --tb-primary-bg-hover: #ffffff;
    --tb-secondary-bg: #15191f;
    --tb-secondary-fg: #f0f6fc;
    --tb-secondary-bg-hover: #1f2328;
    --tb-link: #4493f8;
  }
}
:where(.tb-root[data-tb-theme="dark"]) {
  --tb-bg: #0d1117;
  --tb-fg: #f0f6fc;
  --tb-fg-muted: #9198a1;
  --tb-border: #30363d;
  --tb-shadow: 0 8px 24px rgba(1, 4, 9, 0.85);
  --tb-primary-bg: #f0f6fc;
  --tb-primary-fg: #0d1117;
  --tb-primary-bg-hover: #ffffff;
  --tb-secondary-bg: #15191f;
  --tb-secondary-fg: #f0f6fc;
  --tb-secondary-bg-hover: #1f2328;
  --tb-link: #4493f8;
}

.tb-banner {
  position: fixed;
  left: 16px;
  right: 16px;
  bottom: 16px;
  z-index: var(--tb-z);
  background: var(--tb-bg);
  color: var(--tb-fg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius);
  box-shadow: var(--tb-shadow);
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  animation: tb-fade-in 160ms ease-out;
}
.tb-banner-text {
  flex: 1 1 320px;
  min-width: 0;
}
.tb-banner-title {
  font-weight: 600;
  margin: 0 0 2px;
  font-size: 14px;
}
.tb-banner-desc {
  margin: 0;
  color: var(--tb-fg-muted);
}
.tb-banner-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tb-notice {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: var(--tb-z);
  background: var(--tb-bg);
  color: var(--tb-fg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius);
  box-shadow: var(--tb-shadow);
  padding: 14px 16px;
  max-width: 360px;
  animation: tb-fade-in 160ms ease-out;
}
.tb-notice-title {
  font-weight: 600;
  margin: 0 0 4px;
  font-size: 14px;
}
.tb-notice-desc {
  margin: 0 0 10px;
  color: var(--tb-fg-muted);
  font-size: 13px;
}
.tb-notice-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.tb-link {
  color: var(--tb-link);
  text-decoration: none;
  font-size: 13px;
  margin-right: auto;
}
.tb-link:hover { text-decoration: underline; }

.tb-btn {
  appearance: none;
  border: 1px solid transparent;
  border-radius: var(--tb-radius);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  line-height: 1.5;
  transition: background-color 80ms ease;
  white-space: nowrap;
}
.tb-btn:focus-visible {
  outline: 2px solid var(--tb-link);
  outline-offset: 2px;
}
.tb-btn-primary {
  background: var(--tb-primary-bg);
  color: var(--tb-primary-fg);
}
.tb-btn-primary:hover { background: var(--tb-primary-bg-hover); }
.tb-btn-secondary {
  background: var(--tb-secondary-bg);
  color: var(--tb-secondary-fg);
  border-color: var(--tb-border);
}
.tb-btn-secondary:hover { background: var(--tb-secondary-bg-hover); }
.tb-btn-ghost {
  background: transparent;
  color: var(--tb-fg-muted);
  padding: 6px 10px;
}
.tb-btn-ghost:hover { color: var(--tb-fg); }

.tb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 18, 24, 0.5);
  z-index: var(--tb-z);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: tb-fade-in 160ms ease-out;
}
.tb-modal {
  background: var(--tb-bg);
  color: var(--tb-fg);
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius);
  box-shadow: var(--tb-shadow);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
}
.tb-modal-head {
  padding: 14px 16px;
  border-bottom: 1px solid var(--tb-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.tb-modal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.tb-modal-body {
  padding: 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tb-modal-foot {
  padding: 12px 16px;
  border-top: 1px solid var(--tb-border);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.tb-cat {
  border: 1px solid var(--tb-border);
  border-radius: var(--tb-radius);
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.tb-cat-text { flex: 1; min-width: 0; }
.tb-cat-name {
  font-weight: 600;
  margin: 0 0 2px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tb-cat-desc {
  margin: 0;
  color: var(--tb-fg-muted);
  font-size: 13px;
}
.tb-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: var(--tb-fg-muted);
  background: var(--tb-secondary-bg-hover);
  border: 1px solid var(--tb-border);
  border-radius: 999px;
  padding: 1px 8px;
}

.tb-switch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}
.tb-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.tb-switch-track {
  position: absolute;
  inset: 0;
  background: var(--tb-border);
  border-radius: 999px;
  transition: background-color 100ms ease;
  cursor: pointer;
}
.tb-switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  background: var(--tb-bg);
  border-radius: 50%;
  transition: transform 100ms ease;
}
.tb-switch input:checked + .tb-switch-track {
  background: var(--tb-primary-bg);
}
.tb-switch input:checked + .tb-switch-track .tb-switch-thumb {
  transform: translateX(14px);
}
.tb-switch input:disabled + .tb-switch-track {
  opacity: 0.5;
  cursor: not-allowed;
}
.tb-switch input:focus-visible + .tb-switch-track {
  outline: 2px solid var(--tb-link);
  outline-offset: 2px;
}

@keyframes tb-fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .tb-banner {
    flex-direction: column;
    align-items: stretch;
  }
  .tb-banner-actions {
    flex-direction: column;
  }
  .tb-banner-actions .tb-btn { width: 100%; }
}
`

const STYLE_ID = 'tickbox-default-styles'

let injected = false

/**
 * Insert the stylesheet into `<head>` exactly once per page. Safe to call
 * from every component mount — subsequent calls are no-ops. No-op on the
 * server (no `document`).
 */
export function injectStyles(): void {
  if (injected) return
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) {
    injected = true
    return
  }
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = TICKBOX_STYLES
  document.head.appendChild(el)
  injected = true
}
