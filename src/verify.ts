import { readFileSync } from 'node:fs'
import { verifyPondState } from './state'

const [currentPath, previousPath] = process.argv.slice(2)
if (!currentPath) {
  console.error('Usage: npm run verify:state -- <pond-state.json> [previous-pond-state.json]')
  process.exit(1)
}

function readState(path: string) {
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'))
    return verifyPondState(value)
  } catch {
    return null
  }
}

const current = readState(currentPath)
if (!current) {
  console.error(`INVALID ${currentPath}`)
  process.exit(2)
}

if (previousPath) {
  const previous = readState(previousPath)
  if (!previous) {
    console.error(`INVALID ${previousPath}`)
    process.exit(2)
  }
  if (current.proof.previousDigest !== previous.proof.digest || current.revision !== previous.revision + 1) {
    console.error('INVALID chain link')
    process.exit(3)
  }
  console.log(`LINKED  revision ${previous.revision} -> ${current.revision}`)
}

console.log(`VALID   ${current.owner} pond revision ${current.revision}`)
console.log(`state   ${current.proof.digest}`)
console.log(`source  ${current.proof.sourceDigest}`)
console.log(`previous ${current.proof.previousDigest ?? 'genesis'}`)
