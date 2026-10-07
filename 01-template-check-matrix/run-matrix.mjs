import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const folder = dirname(fileURLToPath(import.meta.url))
const repo = dirname(folder)
const casesDir = join(folder, 'cases')
const rowsDir = join(folder, 'src/app/rows')
const workDir = join(casesDir, '.matrix')
const isKeepingWorkDir = process.argv.includes('--keep')
const require = createRequire(join(repo, 'package.json'))

const rows = [
  {
    id: '1',
    bug: 'Method the class lacks, top level',
    broken: 'row-1-missing-method.ts',
    fixed: 'recipe-actions.ts',
    component: 'RecipeActions',
  },
  {
    id: '2a',
    bug: 'Same call inside an `@if` body',
    broken: 'row-2a-missing-method-in-if.ts',
    fixed: 'recipe-actions-in-if.ts',
    component: 'RecipeActionsInIf',
  },
  {
    id: '2b',
    bug: 'Same call inside an `ng-template`, untyped context',
    broken: 'row-2b-missing-method-in-ng-template.ts',
    fixed: 'recipe-actions-in-template.ts',
    component: 'RecipeActionsInTemplate',
  },
  {
    id: '3',
    bug: 'Wrong-shaped object to an input',
    broken: 'row-3-wrong-input-shape.ts',
    fixed: 'recipe-list.ts',
    component: 'RecipeList',
  },
  {
    id: '4a',
    bug: 'Output the child no longer declares, handler takes `$event`',
    broken: 'row-4a-removed-output-typed-event.ts',
    fixed: 'recipe-page.ts',
    component: 'RecipePage',
  },
  {
    id: '4b',
    bug: 'Output the child no longer declares, handler ignores `$event`',
    broken: 'row-4b-removed-output-no-event.ts',
    fixed: 'recipe-quick-edit.ts',
    component: 'RecipeQuickEdit',
  },
  {
    id: '5',
    bug: '`cdkScrollable` missing from `imports`',
    broken: 'row-5-lost-cdk-scrollable.ts',
    fixed: 'ingredient-picker.ts',
    component: 'IngredientPicker',
  },
  {
    id: '6',
    bug: '`*appPermission` missing from `imports`',
    broken: 'row-6-lost-structural-directive.ts',
    fixed: 'recipe-toolbar.ts',
    component: 'RecipeToolbar',
  },
  {
    id: '7',
    bug: 'Signal read without `()` in `@if`',
    broken: 'row-7-signal-not-called.ts',
    fixed: 'recipe-badge.ts',
    component: 'RecipeBadge',
  },
  {
    id: '8',
    bug: 'Unused entry in `imports`',
    broken: 'row-8-unused-import.ts',
    fixed: 'recipe-summary.ts',
    component: 'RecipeSummary',
  },
]

const aotModes = [
  { id: 'basic', tsconfig: 'tsconfig.basic.json', title: 'AOT basic' },
  { id: 'full', tsconfig: 'tsconfig.full.json', title: 'AOT full' },
  { id: 'strict', tsconfig: 'tsconfig.strict.json', title: 'AOT strict' },
  {
    id: 'strict-errors',
    tsconfig: 'tsconfig.strict-errors.json',
    title: 'AOT strict, ext. as error',
  },
]

const testBedColumns = [
  { id: 'no-errors-schema', title: 'TestBed `NO_ERRORS_SCHEMA`' },
  { id: 'error-on-unknown', title: 'TestBed `errorOnUnknown*`' },
  { id: 'dev-mode-render', title: 'TestBed render, jsdom, dev mode' },
]

const problems = []
const details = []

function log(message) {
  process.stderr.write(`${message}\n`)
}

function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, '')
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)
}

async function pnpmExec(...args) {
  try {
    const { stdout, stderr } = await execFileAsync('corepack', ['pnpm', 'exec', ...args], {
      cwd: repo,
      maxBuffer: 64 * 1024 * 1024,
    })

    return { status: 0, stdout: stripAnsi(stdout), stderr: stripAnsi(stderr) }
  } catch (error) {
    return {
      status: error.code ?? 1,
      stdout: stripAnsi(error.stdout ?? ''),
      stderr: stripAnsi(error.stderr ?? ''),
    }
  }
}

async function inBatches(items, size, task) {
  const results = []

  for (let start = 0; start < items.length; start += size) {
    results.push(...(await Promise.all(items.slice(start, start + size).map(task))))
  }

  return results
}

function firstLine(text) {
  return text.split('\n')[0].trim()
}

const diagnosticPattern = /^(?:(.+?):\d+:\d+ - )?(error|warning)\s+((?:TS|NG)\d+): (.*)$/

async function runNgc(tsconfigPath) {
  const { status, stdout, stderr } = await pnpmExec('ngc', '-p', relative(repo, tsconfigPath))
  const diagnostics = `${stdout}\n${stderr}`
    .split('\n')
    .map((line) => line.match(diagnosticPattern))
    .filter(Boolean)
    .map(([, file, category, code, message]) => ({
      file: file ?? '',
      category,
      code,
      message: message.replace(/^(?:TS|NG)\d+: /, ''),
    }))

  return { status, diagnostics }
}

async function ngcProbe(name, extendsPath, filePath, extra = {}) {
  const tsconfigPath = join(workDir, `tsconfig.${name}.json`)

  writeJson(tsconfigPath, {
    extends: extendsPath,
    ...extra,
    files: [relative(workDir, filePath)],
    include: [],
  })

  return runNgc(tsconfigPath)
}

function aotCell(result) {
  if (result.diagnostics.length === 0) {
    return result.status === 0 ? 'pass' : `exit ${result.status}, no diagnostic`
  }

  return [...new Set(result.diagnostics.map((d) => `${d.code} ${d.category}`))].join(', ')
}

function copyCase(file, targetDir, isJit) {
  let source = readFileSync(join(casesDir, file), 'utf8')
    .replaceAll("from '../src/", "from '../../../src/")
    .replaceAll("from './", "from '../../")

  if (isJit) {
    source = source.replace('@Component({', '@Component({\n  jit: true,')

    if (!source.includes('jit: true')) {
      throw new Error(`Could not add jit: true to ${file}`)
    }
  }

  writeFileSync(join(targetDir, file), source)
}

async function runNgTest(name, tsconfigPath, specPath) {
  const reportPath = join(workDir, `report.${name}.json`)
  const args = ['ng', 'test', 'template-check-matrix', '--watch=false', '--include', specPath]

  if (tsconfigPath) {
    args.push('--ts-config', relative(repo, tsconfigPath))
  }

  args.push('--reporters', 'json', '--output-file', reportPath)

  const { status, stdout, stderr } = await pnpmExec(...args)
  const tests = existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, 'utf8')).testResults.flatMap((f) => f.assertionResults)
    : []
  const buildErrors = [
    ...new Set(
      `${stdout}\n${stderr}`
        .split('\n')
        .map((line) => line.match(/\[ERROR\] ((?:TS|NG)\d+): (.*)/))
        .filter(Boolean)
        .map(([, code, message]) => `${code}: ${message.replace(/^(?:TS|NG)\d+: /, '').trim()}`),
    ),
  ]

  return { status, tests, buildErrors }
}

function failureLine(test) {
  return firstLine(test.failureMessages[0] ?? '').replace(/^AssertionError: /, '')
}

function testBedCell(test) {
  if (!test) {
    return 'not run'
  }

  if (test.status === 'passed') {
    return 'pass'
  }

  const line = failureLine(test)
  const code = line.match(/NG0\d+/)?.[0]

  if (line.startsWith('uncaught:')) {
    return `fails: ${line.match(/(\w*Error)/)?.[1] ?? 'error'} on click`
  }

  if (line.startsWith('console.error:')) {
    return `fails: console.error ${code ?? ''}`.trim()
  }

  return `fails: throws ${code ?? line.slice(0, 40)}`
}

function markdownTable(header, body) {
  return [
    `| ${header.join(' | ')} |`,
    `|${header.map(() => '-').join('|')}|`,
    ...body.map((cells) => `| ${cells.join(' | ')} |`),
  ].join('\n')
}

function eslintMessages(results, file) {
  return (results.find((result) => result.filePath === file)?.messages ?? []).map(
    (m) => `${m.ruleId}|${m.message}`,
  )
}

function onlyInBroken(broken, fixed) {
  const remaining = [...fixed]

  return broken.filter((message) => {
    const index = remaining.indexOf(message)

    if (index === -1) {
      return true
    }

    remaining.splice(index, 1)

    return false
  })
}

async function runEslintColumn() {
  log('ESLint: every angular-eslint rule, broken case vs fixed control')

  const files = rows.flatMap((row) => [join(casesDir, row.broken), join(rowsDir, row.fixed)])
  const { stdout } = await pnpmExec(
    'eslint',
    '--config',
    '01-template-check-matrix/eslint.matrix.config.js',
    '--format',
    'json',
    ...files.map((file) => relative(repo, file)),
  )
  const results = JSON.parse(stdout)
  const noiseRules = new Set()
  const cells = {}

  for (const row of rows) {
    const fixed = eslintMessages(results, join(rowsDir, row.fixed))
    const extra = onlyInBroken(eslintMessages(results, join(casesDir, row.broken)), fixed)

    fixed.forEach((message) => noiseRules.add(message.split('|')[0]))
    cells[row.id] = extra.length
      ? [...new Set(extra.map((message) => message.split('|')[0]))].join(', ')
      : 'pass'
    extra.forEach((message) => {
      const [ruleId, text] = message.split('|')

      details.push([row.id, 'ESLint', ruleId, firstLine(text)])
    })
  }

  return { cells, noiseRules: [...noiseRules].sort() }
}

async function runAotColumns() {
  log('AOT: ngc per row, per mode, broken case and fixed control')

  const jobs = rows.flatMap((row) =>
    aotModes.flatMap((mode) => [
      { row, mode, side: 'broken', file: join(casesDir, row.broken) },
      { row, mode, side: 'fixed', file: join(rowsDir, row.fixed) },
    ]),
  )
  const results = await inBatches(jobs, 6, async (job) => ({
    ...job,
    result: await ngcProbe(
      `${job.row.id}.${job.mode.id}.${job.side}`,
      `../${job.mode.tsconfig}`,
      job.file,
    ),
  }))
  const cells = {}

  for (const { row, mode, side, result } of results) {
    if (side === 'fixed') {
      if (result.status !== 0 || result.diagnostics.length) {
        problems.push(`Fixed row ${row.id} is not clean in ${mode.title}: ${aotCell(result)}`)
      }

      continue
    }

    cells[`${row.id}.${mode.id}`] = aotCell(result)
    result.diagnostics.forEach((d) => {
      details.push([row.id, mode.title, `${d.code} ${d.category}`, firstLine(d.message)])
    })
  }

  return cells
}

async function runTestBedColumns() {
  log('TestBed: one ng test run over jit copies of every case')

  const jitDir = join(workDir, 'jit')

  mkdirSync(jitDir, { recursive: true })
  rows.forEach((row) => copyCase(row.broken, jitDir, true))

  const { tests, buildErrors } = await runNgTest(
    'testbed',
    join(casesDir, 'tsconfig.testbed.json'),
    join(casesDir, 'testbed-columns.spec.ts'),
  )

  if (!tests.length) {
    problems.push(`TestBed run did not produce results: ${buildErrors.join(' / ')}`)
  }

  const cells = {}

  for (const row of rows) {
    for (const column of testBedColumns) {
      const test = tests.find((t) => t.fullName === `row ${row.id} ${column.id}`)

      cells[`${row.id}.${column.id}`] = testBedCell(test)

      if (test?.status === 'failed') {
        details.push([row.id, column.title, 'spec fails', failureLine(test)])
      }
    }
  }

  return cells
}

async function runShippedTestPath() {
  log('ng test with the real case files: AOT spec build, settings as shipped')

  const aotDir = join(workDir, 'aot')

  mkdirSync(aotDir, { recursive: true })

  return inBatches(rows, 1, async (row) => {
    copyCase(row.broken, aotDir, false)

    const specPath = join(aotDir, `row-${row.id}.spec.ts`)
    const tsconfigPath = join(workDir, `tsconfig.aot-${row.id}.json`)

    writeFileSync(
      specPath,
      [
        "import { testBedColumns } from '../../../src/testing/testbed-columns'",
        "import { expectCleanRender } from '../../expect-clean-render'",
        `import { ${row.component} } from './${row.broken.replace(/\.ts$/, '')}'`,
        '',
        `it.each(testBedColumns)('row ${row.id} %s', (column) => expectCleanRender(${row.component}, column))`,
        '',
      ].join('\n'),
    )
    writeJson(tsconfigPath, {
      extends: '../tsconfig.testbed.json',
      files: [relative(workDir, specPath)],
      include: [],
    })

    const { tests, buildErrors } = await runNgTest(`aot-${row.id}`, tsconfigPath, specPath)

    if (!tests.length) {
      return [row.id, `fails: ${buildErrors.map((e) => e.split(':')[0]).join(', ')}`, '-', '-', '-']
    }

    return [
      row.id,
      'pass',
      ...testBedColumns.map((column) =>
        testBedCell(tests.find((t) => t.fullName === `row ${row.id} ${column.id}`)),
      ),
    ]
  })
}

async function runStubChecks() {
  log('Stub spec: original, (saved) deleted in a copy, saved renamed in a copy')

  const checks = []
  const original = await runNgTest('stub-original', null, 'app/rows/recipe-page.spec.ts')

  checks.push([
    'Original `recipe-page.spec.ts`',
    original.tests.map((t) => `${t.status}: ${t.title}`).join('; ') ||
      original.buildErrors.join('; '),
  ])

  const isOriginalGreen =
    original.tests.length > 0 && original.tests.every((t) => t.status === 'passed')

  if (!isOriginalGreen) {
    problems.push('The original stub spec did not pass')
  }

  const bindingDir = join(workDir, 'mutant-binding')
  const toSrcShared = (source, depth) =>
    source.replace(
      /from '\.\.\/shared\/(?!recipe-editor')/g,
      `from '${'../'.repeat(depth)}src/app/shared/`,
    )
  const page = readFileSync(join(rowsDir, 'recipe-page.ts'), 'utf8')
  const pageWithoutSaved = page.replace(' (saved)="save($event)"', '')
  const spec = readFileSync(join(rowsDir, 'recipe-page.spec.ts'), 'utf8')

  if (pageWithoutSaved === page) {
    throw new Error('The (saved) binding was not found in recipe-page.ts')
  }

  mkdirSync(bindingDir, { recursive: true })
  writeFileSync(
    join(bindingDir, 'recipe-page.ts'),
    toSrcShared(pageWithoutSaved, 3).replace(
      "'../shared/recipe-editor'",
      "'../../../src/app/shared/recipe-editor'",
    ),
  )
  writeFileSync(
    join(bindingDir, 'recipe-page.spec.ts'),
    toSrcShared(spec, 3).replace(
      "'../shared/recipe-editor'",
      "'../../../src/app/shared/recipe-editor'",
    ),
  )
  writeJson(join(workDir, 'tsconfig.mutant-binding.json'), {
    extends: '../tsconfig.testbed.json',
    files: ['mutant-binding/recipe-page.spec.ts'],
    include: [],
  })

  const withoutSaved = await runNgTest(
    'stub-without-saved',
    join(workDir, 'tsconfig.mutant-binding.json'),
    join(bindingDir, 'recipe-page.spec.ts'),
  )

  checks.push([
    'Copy with `(saved)` deleted from the page template',
    withoutSaved.tests
      .map((t) => `${t.status}: ${t.title}${t.status === 'failed' ? ` (${failureLine(t)})` : ''}`)
      .join('; ') || withoutSaved.buildErrors.join('; '),
  ])

  if (
    withoutSaved.tests.find((t) => t.title === 'saves the recipe the editor emits')?.status !==
    'failed'
  ) {
    problems.push('The stub spec did not fail after (saved) was deleted')
  }

  const renameDir = join(workDir, 'mutant-rename')
  const editor = readFileSync(join(folder, 'src/app/shared/recipe-editor.ts'), 'utf8')
  const renamedEditor = editor.replaceAll('saved', 'submitted')

  mkdirSync(join(renameDir, 'rows'), { recursive: true })
  mkdirSync(join(renameDir, 'shared'), { recursive: true })
  writeFileSync(
    join(renameDir, 'shared/recipe-editor.ts'),
    renamedEditor.replace("from './recipe'", "from '../../../../src/app/shared/recipe'"),
  )
  writeFileSync(join(renameDir, 'rows/recipe-page.ts'), toSrcShared(page, 4))
  writeFileSync(join(renameDir, 'rows/recipe-page.spec.ts'), toSrcShared(spec, 4))
  writeJson(join(workDir, 'tsconfig.mutant-rename.json'), {
    extends: '../tsconfig.testbed.json',
    files: ['mutant-rename/rows/recipe-page.spec.ts'],
    include: [],
  })

  const renamed = await runNgTest(
    'stub-renamed',
    join(workDir, 'tsconfig.mutant-rename.json'),
    join(renameDir, 'rows/recipe-page.spec.ts'),
  )

  checks.push([
    'Copy with `saved` renamed to `submitted` in the real editor',
    renamed.tests.length
      ? renamed.tests.map((t) => `${t.status}: ${t.title}`).join('; ')
      : `spec build fails: ${renamed.buildErrors.join(' / ')}`,
  ])

  const hasPickError = renamed.buildErrors.some((error) => error.includes('TS2344'))

  if (renamed.tests.length > 0 || !hasPickError) {
    problems.push('The stub spec build did not fail with TS2344 after saved was renamed')
  }

  return checks
}

function findLine(file, needle) {
  const lines = readFileSync(file, 'utf8').split('\n')
  const index = lines.findIndex((line) => line.includes(needle))

  return index === -1 ? null : { line: index + 1, text: lines[index].trim() }
}

function packageDir(name, from = require) {
  return dirname(from.resolve(`${name}/package.json`))
}

function filesUnder(dir, pattern) {
  return readdirSync(dir, { recursive: true })
    .map(String)
    .filter((file) => pattern.test(file) && !file.includes('node_modules'))
    .map((file) => join(dir, file))
}

function scrollableProviders() {
  const modules = new Map()

  for (const name of ['@angular/cdk', '@angular/material']) {
    for (const file of filesUnder(join(packageDir(name), 'fesm2022'), /\.mjs$/)) {
      const source = readFileSync(file, 'utf8')

      for (const [, body] of source.matchAll(/ɵɵngDeclareNgModule\(\{([\s\S]*?)\}\);/g)) {
        const type = body.match(/type:\s*(\w+)/)?.[1]
        const exportList = body.match(/exports:\s*\[([^\]]*)\]/)?.[1] ?? ''

        if (type) {
          modules.set(type, {
            pkg: name,
            file: relative(packageDir(name), file),
            exports: exportList.split(',').map((entry) => entry.trim().replace(/^\.\.\./, '')),
          })
        }
      }
    }
  }

  const providesScrollable = (type, seen = new Set()) => {
    if (type === 'CdkScrollableModule' || type === 'CdkScrollable') {
      return true
    }

    if (seen.has(type) || !modules.has(type)) {
      return false
    }

    seen.add(type)

    return modules.get(type).exports.some((entry) => providesScrollable(entry, seen))
  }

  return [...modules.entries()]
    .filter(([type]) => type !== 'CdkScrollableModule' && providesScrollable(type))
    .map(([type, info]) => ({
      type,
      pkg: info.pkg,
      file: info.file,
      isDirect: info.exports.includes('CdkScrollableModule'),
      via: info.exports.filter(
        (entry) => entry !== 'CdkScrollableModule' && providesScrollable(entry),
      ),
    }))
    .sort((a, b) => a.type.localeCompare(b.type))
}

async function runCompilerChecks() {
  log('Compiler and package facts')

  const facts = []
  const compilerDir = packageDir('@angular/compiler-cli')
  const compilerFiles = filesUnder(compilerDir, /\.(js|d\.ts)$/)
  const defaultLine = compilerFiles
    .map((file) => ({ file, hit: findLine(file, 'return this.options.strictTemplates !== false') }))
    .find(({ hit }) => hit)
  const fullModeMentions = compilerFiles.filter((file) =>
    readFileSync(file, 'utf8').includes('fullTemplateTypeCheck'),
  )
  const extendedGate = compilerFiles
    .map((file) => ({
      file,
      hit: findLine(file, 'if (this.strictTemplates && extendedTemplateChecker !== null)'),
    }))
    .find(({ hit }) => hit)
  const compilerVersion = JSON.parse(
    readFileSync(join(compilerDir, 'package.json'), 'utf8'),
  ).version

  facts.push([
    '`strictTemplates` default when a tsconfig does not set it',
    defaultLine
      ? `true: \`${defaultLine.hit.text}\` at @angular/compiler-cli/${relative(compilerDir, defaultLine.file)}:${defaultLine.hit.line} (compiler-cli ${compilerVersion})`
      : 'getter not found',
  ])
  facts.push([
    '`fullTemplateTypeCheck` in compiler-cli',
    `${fullModeMentions.length} of ${compilerFiles.length} .js and .d.ts files mention it`,
  ])
  facts.push([
    'Extended diagnostics gated on `strictTemplates`',
    extendedGate
      ? `\`${extendedGate.hit.text}\` at @angular/compiler-cli/${relative(compilerDir, extendedGate.file)}:${extendedGate.hit.line}`
      : 'gate not found',
  ])

  if (defaultLine) {
    const bodies = findLine(defaultLine.file, 'checkTemplateBodies: false')
    const controlFlow = findLine(defaultLine.file, 'checkControlFlowBodies: false')

    facts.push([
      'Basic mode skips template and control flow bodies',
      `\`${bodies?.text}\` (line ${bodies?.line}), \`${controlFlow?.text}\` (line ${controlFlow?.line}) in the same file`,
    ])
  }

  const typescriptDir = packageDir('typescript')
  const typescriptVersion = JSON.parse(
    readFileSync(join(typescriptDir, 'package.json'), 'utf8'),
  ).version
  const strictDefault = findLine(
    join(typescriptDir, 'lib/typescript.js'),
    'compilerOptions.strict !== false',
  )

  facts.push([
    'TypeScript `strict` default when a tsconfig does not set it',
    strictDefault
      ? `true: \`${strictDefault.text}\` at typescript/lib/typescript.js:${strictDefault.line} (TypeScript ${typescriptVersion})`
      : 'line not found',
  ])

  const planChecks = {
    angularCompilerOptions: {
      strictTemplates: true,
      extendedDiagnostics: {
        checks: {
          unusedStandaloneImports: 'error',
          interpolatedSignalNotInvoked: 'error',
          missingStructuralDirective: 'error',
        },
      },
    },
  }

  for (const row of [rows[7], rows[8], rows[9]]) {
    const result = await ngcProbe(
      `plan-checks-${row.id}`,
      '../tsconfig.base.json',
      join(casesDir, row.broken),
      planChecks,
    )

    facts.push([
      `Row ${row.id} with the plan's \`extendedDiagnostics.checks\` block`,
      aotCell(result),
    ])
  }

  const unset = await ngcProbe('unset', '../tsconfig.base.json', join(casesDir, rows[1].broken))

  facts.push(['Row 2a with no `strictTemplates` in any tsconfig', aotCell(unset)])

  const basicWithExtended = await ngcProbe(
    'basic-extended',
    '../tsconfig.basic.json',
    join(casesDir, rows[9].broken),
    {
      angularCompilerOptions: {
        extendedDiagnostics: { checks: { unusedStandaloneImports: 'error' } },
      },
    },
  )

  facts.push([
    'Row 8, `strictTemplates: false` plus `extendedDiagnostics`',
    `${aotCell(basicWithExtended)}: ${firstLine(basicWithExtended.diagnostics[0]?.message ?? '')}`,
  ])

  const looseTs = await ngcProbe(
    'basic-loose-ts',
    '../tsconfig.basic.json',
    join(casesDir, rows[8].broken),
    {
      compilerOptions: { strict: false },
    },
  )

  facts.push(['Row 7, basic mode with TypeScript `strict: false`', aotCell(looseTs)])

  const switchProbe = join(workDir, 'switch-probe.ts')

  writeFileSync(
    switchProbe,
    [
      "import { Component, signal } from '@angular/core'",
      '',
      '@Component({',
      "  selector: 'app-recipe-difficulty',",
      "  template: `@switch (difficulty) { @case ('easy') { <span>Easy</span> } @default { <span>Hard</span> } }`,",
      '})',
      'export class RecipeDifficulty {',
      "  readonly difficulty = signal('easy')",
      '}',
      '',
    ].join('\n'),
  )

  for (const mode of [aotModes[0], aotModes[2]]) {
    const result = await ngcProbe(`switch-${mode.id}`, `../${mode.tsconfig}`, switchProbe)

    facts.push([
      `Signal read without \`()\` in \`@switch\`, ${mode.title}`,
      `${aotCell(result)}${result.diagnostics.map((d) => ` / ${d.code}: ${firstLine(d.message)}`).join('')}`,
    ])
  }

  const rootTsconfig = readFileSync(join(repo, 'tsconfig.json'), 'utf8')

  facts.push([
    'Root tsconfig.json sets `strictTemplates`',
    rootTsconfig.includes('strictTemplates') ? 'yes' : 'no, the key is absent',
  ])

  const schematicsDir = packageDir(
    '@schematics/angular',
    createRequire(require.resolve('@angular/cli/package.json')),
  )
  const template = readFileSync(
    join(schematicsDir, 'workspace/files/tsconfig.json.template'),
    'utf8',
  )
  const schematicsVersion = JSON.parse(
    readFileSync(join(schematicsDir, 'package.json'), 'utf8'),
  ).version

  facts.push([
    `\`ng new\` tsconfig template (@schematics/angular ${schematicsVersion})`,
    template.includes('"strictTemplates": false') && !template.includes('"strictTemplates": true')
      ? 'writes `"strictTemplates": false` only when `--strict=false`, writes nothing otherwise'
      : 'see workspace/files/tsconfig.json.template',
  ])

  const coreTesting = join(packageDir('@angular/core'), 'fesm2022/testing.mjs')
  const elementsDefault = findLine(coreTesting, 'const THROW_ON_UNKNOWN_ELEMENTS_DEFAULT')
  const propertiesDefault = findLine(coreTesting, 'const THROW_ON_UNKNOWN_PROPERTIES_DEFAULT')
  const builderDir = packageDir('@angular/build')
  const builderInit = join(builderDir, 'src/builders/unit-test/runners/vitest/build-options.js')
  const builderLine = findLine(builderInit, 'errorOnUnknownElements: true')

  facts.push([
    'TestBed defaults in @angular/core',
    `\`${elementsDefault?.text}\` (testing.mjs:${elementsDefault?.line}), \`${propertiesDefault?.text}\` (testing.mjs:${propertiesDefault?.line})`,
  ])
  facts.push([
    '`@angular/build:unit-test` (Vitest) TestBed init',
    builderLine
      ? `sets both to true: \`${builderLine.text}\` at @angular/build/${relative(builderDir, builderInit)}:${builderLine.line}`
      : 'line not found',
  ])

  const applicationOptions = join(builderDir, 'src/builders/application/options.js')
  const aotDefault = findLine(applicationOptions, 'aot = true')

  facts.push([
    'Spec build of `ng test` is AOT',
    aotDefault
      ? `application builder default \`aot = true\` at @angular/build/${relative(builderDir, applicationOptions)}:${aotDefault.line}, the unit-test builder inherits it`
      : 'line not found',
  ])

  return facts
}

async function main() {
  rmSync(workDir, { recursive: true, force: true })
  mkdirSync(workDir, { recursive: true })

  const eslint = await runEslintColumn()
  const aot = await runAotColumns()
  const testBed = await runTestBedColumns()
  const shipped = await runShippedTestPath()
  const stubChecks = await runStubChecks()
  const facts = await runCompilerChecks()
  const providers = scrollableProviders()
  const planModules = [
    'autocomplete',
    'datepicker',
    'menu',
    'select',
    'sidenav',
    'timepicker',
    'tooltip',
    'dialog',
    'stepper',
    'tabs',
  ]
  const output = []

  output.push('## The table\n')
  output.push(
    markdownTable(
      [
        '#',
        'Bug',
        'ESLint',
        ...aotModes.map((m) => m.title),
        ...testBedColumns.map((c) => c.title),
      ],
      rows.map((row) => [
        row.id,
        row.bug,
        eslint.cells[row.id],
        ...aotModes.map((mode) => aot[`${row.id}.${mode.id}`]),
        ...testBedColumns.map((column) => testBed[`${row.id}.${column.id}`]),
      ]),
    ),
  )
  output.push(
    `\nFixed versions: ${problems.filter((p) => p.startsWith('Fixed')).length ? 'NOT clean, see problems' : 'every fixed row passes every AOT mode'}.`,
  )
  output.push(
    `AOT full equals AOT basic in every row: ${rows.every((row) => aot[`${row.id}.full`] === aot[`${row.id}.basic`]) ? 'yes' : 'no'}.`,
  )
  output.push(
    `ESLint rules that fire on the fixed versions too, so they say nothing about the bug: ${eslint.noiseRules.join(', ')}.\n`,
  )
  output.push('## First line of each diagnostic and failure\n')
  output.push(
    markdownTable(
      ['#', 'Column', 'Code', 'First line'],
      details.map((d) => d.map((c) => c.replaceAll('|', '\\|'))),
    ),
  )
  output.push('\n## `ng test` with the real case files (AOT spec build, settings as shipped)\n')
  output.push(markdownTable(['#', 'Spec build', ...testBedColumns.map((c) => c.title)], shipped))
  output.push('\n## Stub that keeps the output binding alive\n')
  output.push(
    markdownTable(
      ['Check', 'Result'],
      stubChecks.map((c) => c.map((cell) => cell.replaceAll('|', '\\|'))),
    ),
  )
  output.push('\n## Compiler and package facts\n')
  output.push(
    markdownTable(
      ['Check', 'Result'],
      facts.map((f) => f.map((cell) => cell.replaceAll('|', '\\|'))),
    ),
  )
  output.push('\n## Modules that make `cdkScrollable` available\n')
  output.push(
    markdownTable(
      ['NgModule', 'Package file', 'How'],
      providers.map((p) => [
        p.type,
        `${p.pkg}/${p.file}`,
        p.isDirect ? 'exports `CdkScrollableModule`' : `through ${p.via.join(', ')}`,
      ]),
    ),
  )
  output.push(
    `\nThe plan's ten Material entry points: ${planModules
      .map(
        (name) =>
          `${name} ${providers.some((p) => p.pkg === '@angular/material' && p.file === `fesm2022/${name}.mjs`) ? 'yes' : 'no'}`,
      )
      .join(', ')}.`,
  )

  if (problems.length) {
    output.push('\n## Problems\n')
    problems.forEach((problem) => output.push(`- ${problem}`))
  }

  process.stdout.write(`${output.join('\n')}\n`)

  if (!isKeepingWorkDir) {
    rmSync(workDir, { recursive: true, force: true })
  }

  process.exitCode = problems.length ? 1 : 0
}

await main()
