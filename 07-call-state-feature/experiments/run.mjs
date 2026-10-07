import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const experimentsDir = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(experimentsDir)
const workspaceDir = dirname(projectDir)
const outDir = join(experimentsDir, 'out')
const isKeepingOutput = process.argv.includes('--keep')

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

function caseConfig(name, baseConfig, file) {
  const caseDir = join(outDir, 'cases', name)

  mkdirSync(caseDir, { recursive: true })
  writeJson(join(caseDir, 'tsconfig.json'), {
    extends: relative(caseDir, join(experimentsDir, baseConfig)),
    compilerOptions: { outDir: './emit' },
    include: [],
    files: [relative(caseDir, join(projectDir, file))],
  })

  return relative(workspaceDir, join(caseDir, 'tsconfig.json'))
}

const tsc = (name, file) => exec('tsc', ['-p', caseConfig(name, 'tsconfig.json', file)])

const ngc = (name, file) => exec('ngc', ['-p', caseConfig(name, 'tsconfig.ngc.json', file)])

const eslint = (file, extraArgs = []) =>
  exec('eslint', [
    '--no-ignore',
    '-c',
    '07-call-state-feature/eslint.config.js',
    ...extraArgs,
    `07-call-state-feature/${file}`,
  ])

// Naming this config ng-package.json makes `ng build call-state` pick it up as a secondary entry point.
function ngPackagr() {
  const libDir = join(outDir, 'collision-lib')
  const store = readFileSync(join(experimentsDir, 'collision/profile.store.ts'), 'utf8')

  mkdirSync(libDir, { recursive: true })
  copyFileSync(
    join(projectDir, 'src/lib/call-state/with-call-state.ts'),
    join(libDir, 'with-call-state.ts'),
  )
  writeFileSync(
    join(libDir, 'profile.store.ts'),
    store.replace('../../src/lib/call-state/with-call-state', './with-call-state'),
  )
  writeJson(join(libDir, 'package.json'), {
    name: 'collision-lib',
    version: '0.0.0',
    peerDependencies: { '@angular/core': '^22.2.0', '@ngrx/signals': '^22.0.1' },
  })
  writeJson(join(libDir, 'ng-package.collision.json'), {
    dest: '../collision-lib-dist',
    lib: { entryFile: 'profile.store.ts' },
  })

  return exec('ng-packagr', [
    '-p',
    relative(workspaceDir, join(libDir, 'ng-package.collision.json')),
    '-c',
    '07-call-state-feature/tsconfig.lib.prod.json',
  ])
}

const collisionSpec = () =>
  exec('ng', [
    'test',
    'call-state',
    '--watch=false',
    '--ts-config',
    '07-call-state-feature/experiments/tsconfig.spec.json',
    '--include',
    '../experiments/collision/profile.store.spec.ts',
  ])

const cases = [
  {
    name: 'feature return type wrapped in a custom alias',
    run: () => tsc('alias-return-type', 'experiments/feature/alias-return-type.ts'),
    expected: ['TS2322', 'TS4111'],
  },
  {
    name: 'feature return type spelled as SignalStoreFeature',
    run: () => tsc('direct-return-type', 'experiments/feature/direct-return-type.ts'),
    expected: 'clean',
  },
  {
    name: "minimal unannotated feature (the plan's first draft), tsc declaration emit",
    run: () => tsc('plan-verbatim', 'experiments/feature/plan-verbatim.ts'),
    expected: 'clean',
  },
  {
    name: 'collision, tsc declaration emit',
    run: () => tsc('collision-tsc', 'experiments/collision/profile.store.ts'),
    expected: 'TS4023',
  },
  {
    name: 'collision with the same member type, tsc declaration emit',
    run: () => tsc('collision-same-type', 'experiments/collision/profile-same-type.store.ts'),
    expected: 'TS4023',
  },
  {
    name: 'collision, ngc declaration emit',
    run: () => ngc('collision-ngc', 'experiments/collision/profile.store.ts'),
    expected: 'TS4023',
  },
  {
    name: 'collision, ng-packagr library build',
    run: ngPackagr,
    expected: 'TS4023',
  },
  {
    name: 'collision, console.warn spec',
    run: collisionSpec,
    expected: 'clean',
  },
  {
    name: 'renamed field, tsc declaration emit',
    run: () => tsc('renamed-tsc', 'src/lib/profile/profile.store.ts'),
    expected: 'clean',
  },
  {
    name: 'NgRx docs known issue, two input features',
    run: () => tsc('docs-issue', 'experiments/split/docs-known-issue.ts'),
    expected: 'TS2769',
  },
  {
    name: 'NgRx docs fix, unused generic, tsc',
    run: () => tsc('docs-generic', 'experiments/split/docs-unused-generic.ts'),
    expected: 'clean',
  },
  {
    name: 'NgRx docs fix, unused generic, eslint',
    run: () => eslint('experiments/split/docs-unused-generic.ts'),
    expected: '@typescript-eslint/no-unused-vars',
  },
  {
    name: 'withUsers() + withRoles(), both input-typed',
    run: () => tsc('combined', 'experiments/split/combined-input.ts'),
    expected: 'TS2769',
  },
  {
    name: 'withUsers<_>() + withRoles<_>(), tsc',
    run: () => tsc('combined-generic', 'experiments/split/combined-unused-generic.ts'),
    expected: 'clean',
  },
  {
    name: 'withUsers<_>() + withRoles<_>(), eslint',
    run: () => eslint('experiments/split/combined-unused-generic.ts'),
    expected: '@typescript-eslint/no-unused-vars',
  },
  {
    name: 'withUsers<_>() + withRoles<_>(), eslint with varsIgnorePattern ^_',
    run: () =>
      eslint('experiments/split/combined-unused-generic.ts', [
        '--rule',
        JSON.stringify({
          '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
        }),
      ]),
    expected: 'clean',
  },
  {
    name: 'withRoles() alone, input-typed',
    run: () => tsc('single', 'experiments/split/single-input.ts'),
    expected: 'clean',
  },
  {
    name: 'withFeature route, src store',
    run: () => tsc('with-feature', 'src/lib/split/users-roles.store.ts'),
    expected: 'clean',
  },
  {
    name: 'hand-typed withMethods factory, plain props type',
    run: () => tsc('hand-typed-plain', 'experiments/split/hand-typed-plain.ts'),
    expected: 'TS2345',
  },
  {
    name: 'hand-typed withMethods factory, WritableStateSource',
    run: () => tsc('hand-typed-source', 'experiments/split/hand-typed-source.ts'),
    expected: 'clean',
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

try {
  for (const { name, run, expected } of cases) {
    const { exitCode, output } = run()
    const isClean = exitCode === 0
    const expectedErrors = new Set([expected].flat())
    const errors = reportedErrors(output)
    const hasExactlyExpectedErrors =
      errors.size === expectedErrors.size && [...errors].every((code) => expectedErrors.has(code))
    const isMatch = expected === 'clean' ? isClean : !isClean && hasExactlyExpectedErrors
    const got = isClean ? 'clean' : `exit ${exitCode}`

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
