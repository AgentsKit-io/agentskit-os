#!/usr/bin/env node
import { route } from './router.js'

const main = async () => {
  const argv = process.argv.slice(2)
  const exit = await route(argv)
  if (exit.stdout) process.stdout.write(exit.stdout)
  if (exit.stderr) process.stderr.write(exit.stderr)
  process.exit(exit.code)
}

main().catch((err) => {
  process.stderr.write(`fatal: ${(err as Error).stack ?? String(err)}\n`)
  process.exit(70)
})
