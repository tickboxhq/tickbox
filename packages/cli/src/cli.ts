import pc from 'picocolors'
import { scan } from './scan.js'
import { validate } from './validate.js'

const VERSION = '0.0.0'

async function main(): Promise<number> {
  const [cmd, ...args] = process.argv.slice(2)

  switch (cmd) {
    case 'scan':
      return scan(args)
    case 'validate':
      return validate(args)
    case '--version':
    case '-v':
      console.log(VERSION)
      return 0
    case undefined:
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      return cmd === undefined ? 2 : 0
    default:
      console.error(pc.red(`error: unknown command: ${cmd}`))
      console.error()
      printHelp()
      return 2
  }
}

function printHelp(): void {
  console.log(`${pc.bold('tickbox')} — consent management CLI

${pc.bold('Usage:')}
  tickbox scan <url>             Fetch a URL and list detected tracking vendors
  tickbox validate [config]      Check a consent.config.{js,mjs} for issues
  tickbox --version              Print the CLI version
  tickbox --help                 Print this message

${pc.bold('Examples:')}
  tickbox scan https://example.com
  tickbox validate ./consent.config.mjs

${pc.dim('Notes')}
  ${pc.dim('• `validate` only loads .js / .mjs files for now. Compile your .ts')}
  ${pc.dim('  config first, or run via `tsx` to evaluate TypeScript directly.')}
  ${pc.dim('• `scan` inspects the server HTML response only. Vendors injected')}
  ${pc.dim('  dynamically by JS may be missed; a JS-rendered scan is on the')}
  ${pc.dim('  roadmap.')}
`)
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(pc.red(`error: ${err instanceof Error ? err.message : String(err)}`))
    process.exit(1)
  })
