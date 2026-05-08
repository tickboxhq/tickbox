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

export const DEFAULT_BANNER_COPY: BannerCopy = {
  title: 'Cookies and tracking',
  description:
    'We use cookies to make this site work and, with your consent, to measure usage. You can choose what to allow.',
  acceptLabel: 'Accept all',
  rejectLabel: 'Reject all',
  customiseLabel: 'Customise',
  saveLabel: 'Save preferences',
  closeLabel: 'Close',
  policyLinkLabel: 'Privacy policy',
  requiredBadge: 'Required',
}

export const DEFAULT_NOTICE_COPY: NoticeCopy = {
  title: 'A note about analytics',
  description:
    'We use privacy-friendly analytics to understand how this site is used. No personal data is collected and no advertising profiles are built.',
  acknowledgeLabel: 'Got it',
  optOutLabel: 'Opt out',
  policyLinkLabel: 'Privacy policy',
}
