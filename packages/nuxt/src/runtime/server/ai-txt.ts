import { type ConsentConfig, generateAiTxt } from '@tickboxhq/core'
import { defineEventHandler, setHeader } from 'h3'
// @ts-expect-error Nitro alias registered by the module at build time
import userConfig from '#tickbox-config'

export default defineEventHandler((event) => {
  const config = ((userConfig as { default?: ConsentConfig } & ConsentConfig)?.default ??
    (userConfig as ConsentConfig)) as ConsentConfig

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, must-revalidate')

  return generateAiTxt(config)
})
