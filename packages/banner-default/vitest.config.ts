import { defineConfig } from 'vitest/config'

// Node 24+ installs its own global `localStorage`/`sessionStorage`. They are
// inert unless the process was started with --localstorage-file, and they are
// own properties of globalThis, so the happy-dom environment never gets to
// install working ones over the top. Tests then see a `localStorage` that
// exists but has no methods: `typeof localStorage === 'undefined'` guards in
// the source pass, and the call right after them throws.
//
// Turn Node's version off in the test workers so happy-dom's wins. Applies to
// both pools because which one vitest picks depends on the runner's defaults.
const execArgv = ['--no-experimental-webstorage']

export default defineConfig({
  test: {
    poolOptions: {
      threads: { execArgv },
      forks: { execArgv },
    },
  },
})
