import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const experimentsDir = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(experimentsDir)
const workspaceDir = dirname(projectDir)
const outDir = join(experimentsDir, 'out')
const isKeepingOutput = process.argv.includes('--keep')
const isStrict = !process.argv.includes('--no-strict')

function exec(bin, args) {
  const result = spawnSync('corepack', ['pnpm', 'exec', bin, ...args], {
    cwd: workspaceDir,
    encoding: 'utf8',
  })
  const output = `${result.stdout}${result.stderr}`.replace(/\x1b\[[0-9;]*m/g, '')

  return { exitCode: result.status, output }
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

// A rootDir inside this folder fails the 07 cases with TS6059.
function caseConfig(name, baseConfig, file) {
  const caseDir = join(outDir, 'cases', name)

  mkdirSync(caseDir, { recursive: true })
  writeJson(join(caseDir, 'tsconfig.json'), {
    extends: relative(caseDir, join(experimentsDir, baseConfig)),
    compilerOptions: {
      outDir: './emit',
      rootDir: relative(caseDir, workspaceDir),
      strict: isStrict,
    },
    include: [],
    files: [relative(caseDir, join(workspaceDir, file))],
  })

  return relative(workspaceDir, join(caseDir, 'tsconfig.json'))
}

const tsc = (name, file) => exec('tsc', ['-p', caseConfig(name, 'tsconfig.json', file)])

const ngc = (name, file) => exec('ngc', ['-p', caseConfig(name, 'tsconfig.ngc.json', file)])

const eslint = (config, file) => exec('eslint', ['--no-ignore', '-c', config, file])

const project = '19-split-store-features'
const callStateProject = '07-call-state-feature'

const cases = [
  {
    name: 'misorder: withProfile composed before withUsers',
    run: () => tsc('misorder', `${project}/experiments/misorder/profile-before-users.ts`),
    expected: 'TS2345',
    message: "Property '_selectedUser' is missing",
  },
  {
    name: 'private member: _selectedUser read on the public store type',
    run: () => tsc('private-public-read', `${project}/experiments/private/public-read.ts`),
    expected: 'TS2551',
    message: "Property '_selectedUser' does not exist",
  },
  {
    name: 'private member: withFeature hands _selectedUser to withProfile (whole store)',
    run: () => tsc('store-tsc', `${project}/src/lib/directory/directory.store.ts`),
    expected: 'clean',
  },
  {
    name: 'SignalStoreFeatureType<typeof withRoles>, a factory with a parameter',
    run: () =>
      tsc('derived-type', `${project}/experiments/feature-type/derived-from-parameterized.ts`),
    expected: 'clean',
  },
  {
    name: 'hand-written result type as the return type of a factory with a parameter',
    run: () =>
      tsc('annotated-type', `${project}/experiments/feature-type/annotated-parameterized.ts`),
    expected: 'clean',
  },
  {
    name: 'SignalStoreFeatureType of the factory as its own return type',
    run: () => tsc('self-typed', `${project}/experiments/feature-type/derived-as-own-return.ts`),
    expected: 'TS2577',
    message: 'circularly references itself',
  },
  {
    name: 'hand-written result type claims a member, feature annotated with it',
    run: () =>
      tsc('claims-annotated', `${project}/experiments/hand-written/annotated-claims-more.ts`),
    expected: 'TS2322',
    message: 'isProfileStale',
  },
  {
    name: 'hand-written result type claims a member, feature not annotated',
    run: () =>
      tsc('claims-unannotated', `${project}/experiments/hand-written/unannotated-claims-more.ts`),
    expected: 'TS2345',
    message: 'selectedUserName',
  },
  {
    name: 'hand-written result type omits a member, feature annotated with it',
    run: () => tsc('omits', `${project}/experiments/hand-written/annotated-omits-member.ts`),
    expected: 'clean',
  },
  {
    name: 'reaction calls patchState on the public store type',
    run: () => tsc('patch-public', `${project}/experiments/reaction/patch-public-store.ts`),
    expected: 'TS2345',
    message: 'WritableStateSource',
  },
  {
    name: 'whole store, ngc declaration emit',
    run: () => ngc('store-ngc', `${project}/src/lib/directory/directory.store.ts`),
    expected: 'clean',
  },
  {
    name: '07 route: hand-typed withMethods factory, plain props type',
    run: () => tsc('07-hand-typed', `${callStateProject}/experiments/split/hand-typed-plain.ts`),
    expected: 'TS2345',
    message: 'WritableStateSource<object>',
  },
  {
    name: '07 route: withUsers() + withRoles(), both input-typed',
    run: () => tsc('07-combined', `${callStateProject}/experiments/split/combined-input.ts`),
    expected: 'TS2769',
    message: 'No overload matches this call',
  },
  {
    name: '07 route: withUsers<_>() + withRoles<_>(), eslint',
    run: () =>
      eslint(
        `${callStateProject}/eslint.config.js`,
        `${callStateProject}/experiments/split/combined-unused-generic.ts`,
      ),
    expected: '@typescript-eslint/no-unused-vars',
    message: "'_' is defined but never used",
  },
]

function reportedErrors(output) {
  const tsCodes = [...output.matchAll(/error (TS\d+)/g)].map((match) => match[1])
  const lintRules = output
    .split('\n')
    .filter((line) => /^\s+\d+:\d+\s+error\s/.test(line))
    .map((line) => line.trim().split(/\s+/).at(-1))

  return new Set([...tsCodes, ...lintRules])
}

function firstDiagnostic(output, expected) {
  const lines = output.split('\n').map((line) => line.trim())
  const codes = [expected].flat()
  const match = lines.find(
    (line) => expected !== 'clean' && codes.some((code) => line.includes(code)),
  )

  return match ?? lines.find((line) => /error/i.test(line)) ?? ''
}

let mismatches = 0

rmSync(outDir, { recursive: true, force: true })
console.log(`strict: ${isStrict}\n`)

try {
  for (const { name, run, expected, message } of cases) {
    const { exitCode, output } = run()
    const isClean = exitCode === 0
    const expectedErrors = new Set([expected].flat())
    const errors = reportedErrors(output)
    const hasExactlyExpectedErrors =
      errors.size === expectedErrors.size && [...errors].every((code) => expectedErrors.has(code))
    const hasMessage = !message || output.includes(message)
    const isMatch =
      expected === 'clean' ? isClean : !isClean && hasExactlyExpectedErrors && hasMessage
    const got = isClean
      ? 'clean'
      : `${[...errors].join(', ') || `exit ${exitCode}`}${hasMessage ? '' : ', message not found'}`

    if (!isMatch) {
      mismatches++
    }

    console.log(`${isMatch ? 'MATCH' : 'MISMATCH'}  ${name}  (expected ${expected}, got ${got})`)

    const diagnostic = firstDiagnostic(output, expected)

    if (!isClean && diagnostic) {
      console.log(`    ${diagnostic}`)
    }
  }
} finally {
  if (!isKeepingOutput) {
    rmSync(outDir, { recursive: true, force: true })
  }
}

console.log(`\n${cases.length - mismatches} of ${cases.length} cases match their expected result`)
process.exitCode = mismatches === 0 ? 0 : 1
