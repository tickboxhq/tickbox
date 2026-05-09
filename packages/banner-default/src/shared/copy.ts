export type BannerCopy = {
  title: string
  description: string
  acceptLabel: string
  rejectLabel: string
  customiseLabel: string
  saveLabel: string
  closeLabel: string
  policyLinkLabel: string
  requiredBadge: string
}

export type NoticeCopy = {
  title: string
  description: string
  acknowledgeLabel: string
  optOutLabel: string
  policyLinkLabel: string
}

// Defaults are re-exported from the English locale pack so the two stay in
// sync. Pass `locale="..."` on the components to switch language; pass
// `copy={{ ... }}` to override individual strings.
export { banner as DEFAULT_BANNER_COPY, notice as DEFAULT_NOTICE_COPY } from './locales/en.js'
