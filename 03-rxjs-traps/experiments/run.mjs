import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const experimentsDir = dirname(fileURLToPath(import.meta.url))
const projectDir = dirname(experimentsDir)
const workspaceDir = dirname(projectDir)
const sourceDir = join(projectDir, 'src')
const buildDir = join(sourceDir, 'lib/laptop-build')
const outDir = join(experimentsDir, 'out')
const isKeepingOutput = process.argv.includes('--keep')

const errorHandlerWithCheck = `        error: () => {
          if (!isStale()) {
            patchState(this.state, { hasSaveError: true })
          }
        },`
const errorHandlerWithoutCheck = `        error: () => {
          patchState(this.state, { hasSaveError: true })
        },`

function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) {
    throw new Error(`Expected exactly one match for:\n${from}`)
  }

  return text.replace(from, to)
}

function readBuildFile(file, caseDir) {
  const libPath = relative(caseDir, buildDir)
  const text = readFileSync(join(buildDir, file), 'utf8')

  return replaceOnce(
    replaceOnce(text, "from './laptop-build-api'", `from '${libPath}/laptop-build-api'`),
    "from './part'",
    `from '${libPath}/part'`,
  )
}

function writeCase(name, createFiles) {
  const caseDir = join(outDir, name)

  mkdirSync(caseDir, { recursive: true })

  for (const [file, text] of Object.entries(createFiles(caseDir))) {
    writeFileSync(join(caseDir, file), text)
  }

  return relative(sourceDir, join(caseDir, 'laptop-build.store.spec.ts'))
}

function runSpec(include) {
  const result = spawnSync(
    'corepack',
    [
      'pnpm',
      'exec',
      'ng',
      'test',
      'rxjs-traps',
      '--watch=false',
      '--reporters=verbose',
      '--ts-config',
      '03-rxjs-traps/experiments/tsconfig.spec.json',
      '--include',
      include,
    ],
    { cwd: workspaceDir, encoding: 'utf8' },
  )

  return {
    exitCode: result.status,
    output: `${result.stdout}${result.stderr}`.replace(/\x1b\[[0-9;]*m/g, ''),
  }
}

function testResults(output) {
  const passed = []
  const failed = []
  const lines = output.split('\n')

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([✓×])\s+rxjs-traps\s+\S+ > (.+?)(?: \d+ms)?$/)

    if (!match) {
      return
    }

    if (match[1] === '✓') {
      passed.push(match[2])
    } else {
      failed.push({ name: match[2], reason: lines[index + 1]?.trim() ?? '' })
    }
  })

  return { passed, failed }
}

function summaryLine(output, label) {
  return output
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .find((line) => line.startsWith(`${label} `))
}

function expectedSummary(label, passedCount, failedCount) {
  const counts = [failedCount && `${failedCount} failed`, passedCount && `${passedCount} passed`]

  return `${label} ${counts.filter(Boolean).join(' | ')} (${passedCount + failedCount})`
}

function findProblems({ exitCode, output }, expected) {
  const { passed, failed } = testResults(output)
  const failingNames = Object.keys(expected.failing)
  const failedCount = failingNames.length
  const errorNames = output
    .split('\n')
    .map((line) => line.match(/^\s*(\w*Error)\b/)?.[1])
    .filter(Boolean)
  const testsSummary = summaryLine(output, 'Tests')
  const filesSummary = summaryLine(output, 'Test Files')
  const problems = []

  if (exitCode !== (failedCount ? 1 : 0)) {
    problems.push(`exit code ${exitCode}`)
  }

  if (testsSummary !== expectedSummary('Tests', expected.passed, failedCount)) {
    problems.push(`tests summary: ${testsSummary ?? 'missing'}`)
  }

  if (filesSummary !== expectedSummary('Test Files', failedCount ? 0 : 1, failedCount ? 1 : 0)) {
    problems.push(`test files summary: ${filesSummary ?? 'missing'}`)
  }

  if (passed.length !== expected.passed) {
    problems.push(`${passed.length} passed tests listed, expected ${expected.passed}`)
  }

  for (const name of failingNames) {
    const test = failed.find((failedTest) => failedTest.name === name)

    if (!test) {
      problems.push(`did not fail: ${name}`)
    } else if (!test.reason.includes(expected.failing[name])) {
      problems.push(`failed for another reason: ${name}`)
    }
  }

  for (const test of failed) {
    if (!failingNames.includes(test.name)) {
      problems.push(`failed unexpectedly: ${test.name}`)
    }
  }

  if (errorNames.length !== failedCount || errorNames.some((error) => error !== 'AssertionError')) {
    problems.push(`errors in the output: ${errorNames.join(', ') || 'none'}`)
  }

  for (const marker of ['Failed Suites', 'Unhandled', '[ERROR]']) {
    if (output.includes(marker)) {
      problems.push(`output contains "${marker}"`)
    }
  }

  return { failed, testsSummary, problems }
}

const isFalse = 'expected true to be false'

const cases = [
  {
    name: "case 1: the fix's spec, with its store import pointed at the late-read store",
    include: () =>
      writeCase('late-read', (caseDir) => ({
        'laptop-build.store.spec.ts': replaceOnce(
          readBuildFile('laptop-build.store.spec.ts', caseDir),
          "import { LaptopBuildStore } from './laptop-build.store'",
          `import { LateReadBuildStore as LaptopBuildStore } from '${relative(caseDir, buildDir)}/late-read-build.store'`,
        ),
      })),
    passed: 6,
    failing: {
      'LaptopBuildStore > ignores a save answer for a model the user has left':
        'to deeply equal []',
      'LaptopBuildStore > keeps hasSaveError false when a save fails after the model change':
        isFalse,
      'LaptopBuildStore > clears isSaving when it drops a queued save for the old model': isFalse,
    },
  },
  {
    name: 'case 2: the fix without the isStale() check in the error handler',
    include: () =>
      writeCase('no-error-check', (caseDir) => ({
        'laptop-build.store.ts': replaceOnce(
          readBuildFile('laptop-build.store.ts', caseDir),
          errorHandlerWithCheck,
          errorHandlerWithoutCheck,
        ),
        'laptop-build.store.spec.ts': readBuildFile('laptop-build.store.spec.ts', caseDir),
      })),
    passed: 8,
    failing: {
      'LaptopBuildStore > keeps hasSaveError false when a save fails after the model change':
        isFalse,
    },
  },
  {
    name: 'case 3: the fix with an early EMPTY that does not clear isSaving',
    include: () =>
      writeCase('empty-keeps-saving', (caseDir) => ({
        'laptop-build.store.ts': replaceOnce(
          readBuildFile('laptop-build.store.ts', caseDir),
          '      this.finishSave()\n\n      return EMPTY',
          '      return EMPTY',
        ),
        'laptop-build.store.spec.ts': readBuildFile('laptop-build.store.spec.ts', caseDir),
      })),
    passed: 8,
    failing: {
      'LaptopBuildStore > clears isSaving when it drops a queued save for the old model': isFalse,
    },
  },
  {
    name: "case 4: the plan's first spec, as written, against both stores",
    include: () => relative(sourceDir, join(experimentsDir, 'plan-spec/plan-verbatim.spec.ts')),
    passed: 1,
    failing: {
      'LateReadBuildStore > ignores a save answer for a model the user has left':
        'to be called 1 times, but got 2 times',
    },
  },
]

let mismatches = 0

try {
  for (const testCase of cases) {
    const run = runSpec(testCase.include())
    const { failed, testsSummary, problems } = findProblems(run, testCase)
    const isMatch = problems.length === 0

    if (!isMatch) {
      mismatches++
    }

    console.log(
      `${isMatch ? 'MATCH' : 'MISMATCH'}  ${testCase.name}  (exit ${run.exitCode}, ${testsSummary ?? 'no summary'})`,
    )

    for (const test of failed) {
      console.log(`    failed: ${test.name}\n      ${test.reason}`)
    }

    for (const problem of problems) {
      console.log(`    problem: ${problem}`)
    }

    if (!isMatch && isKeepingOutput) {
      console.log(run.output)
    }
  }
} finally {
  if (!isKeepingOutput) {
    rmSync(outDir, { recursive: true, force: true })
  }
}

console.log(`\n${cases.length - mismatches} of ${cases.length} cases match their expected result`)
process.exitCode = mismatches === 0 ? 0 : 1
