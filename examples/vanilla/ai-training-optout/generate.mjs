#!/usr/bin/env node
// Generates /ai.txt or a robots.txt fragment from consent.config.mjs.
//
// Usage:
//   node generate.mjs > public/ai.txt
//   node generate.mjs --robots > public/robots.txt

import { generateAiBotRobotsRules, generateAiTxt } from '@tickboxhq/core'
import config from './consent.config.mjs'

const wantRobots = process.argv.includes('--robots')

if (wantRobots) {
  process.stdout.write(generateAiBotRobotsRules(config))
} else {
  process.stdout.write(
    generateAiTxt(config, { siteUrl: process.env.SITE_URL ?? 'https://example.com' }),
  )
}
