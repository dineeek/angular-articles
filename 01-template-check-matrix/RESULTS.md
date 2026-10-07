# Results

Every cell on this page comes from `node 01-template-check-matrix/run-matrix.mjs`, run on 2026-10-07 on top of commit 4dda0c8. The runner exited with 0 and reported no problems.

## Versions

| Package | Version |
|-|-|
| @angular/core, compiler-cli, cdk, material | 22.2.1 |
| @angular/build, @schematics/angular | 22.2.2 |
| TypeScript | 6.0.3 |
| Vitest | 5.0.3 |
| ESLint | 10.12.0 |
| angular-eslint | 22.5.0 |
| Node | 24.15.0 |

## Commands

Run from the repo root.

```bash
node 01-template-check-matrix/run-matrix.mjs
node 01-template-check-matrix/run-matrix.mjs --keep
corepack pnpm exec ng build template-check-matrix
corepack pnpm exec ng test template-check-matrix --watch=false
corepack pnpm exec ng lint template-check-matrix
```

`--keep` leaves the generated tsconfigs, copies and reports in `cases/.matrix/`.

One column by hand:

```bash
corepack pnpm exec ngc -p 01-template-check-matrix/cases/tsconfig.basic.json
corepack pnpm exec ngc -p 01-template-check-matrix/cases/tsconfig.full.json
corepack pnpm exec ngc -p 01-template-check-matrix/cases/tsconfig.strict.json
corepack pnpm exec ngc -p 01-template-check-matrix/cases/tsconfig.strict-errors.json
corepack pnpm exec eslint --config 01-template-check-matrix/eslint.matrix.config.js "01-template-check-matrix/cases/row-*.ts"
```

The last command prints raw ESLint output, about two dozen messages, and most of them also fire on
the fixed versions. The ESLint column counts only messages that fire on a broken row and not on its
fixed version, so read the table, or run `run-matrix.mjs`, for that comparison.

The runner compiles each row alone, with one generated tsconfig per row and mode. A single run over all rows gave the same diagnostics.

## How each column runs

| Column | Setup |
|-|-|
| ESLint | The repo config plus every angular-eslint rule (`tsAll` and `templateAll`, with type information). A cell lists only messages that fire on the broken case and not on its fixed version. |
| AOT basic | `ngc -p cases/tsconfig.basic.json`: `strictTemplates: false`, `fullTemplateTypeCheck: false` |
| AOT full | `ngc -p cases/tsconfig.full.json`: `strictTemplates: false`, `fullTemplateTypeCheck: true`. Angular 22.2.1 ignores `fullTemplateTypeCheck`, so this column equals AOT basic. It stays in the table for readers on older versions. |
| AOT strict | `ngc -p cases/tsconfig.strict.json`: `strictTemplates: true` |
| AOT strict, ext. as error | `ngc -p cases/tsconfig.strict-errors.json`: `strictTemplates: true`, `extendedDiagnostics.defaultCategory: "error"` |
| TestBed `NO_ERRORS_SCHEMA` | `ng test`. Adds `NO_ERRORS_SCHEMA` to the component, renders it and clicks every button. The spec fails on a thrown or uncaught error. |
| TestBed `errorOnUnknown*` | Same steps with `errorOnUnknownElements` and `errorOnUnknownProperties` set to true. |
| TestBed render, jsdom, dev mode | Same steps with both flags set to false, TestBed's own default, so Angular logs instead of throwing. `console.error` is captured, and any message fails the spec. |

"error" in an AOT cell means the build fails. "warning" means the build passes and prints the diagnostic.

The TestBed steps live in `src/testing/testbed-columns.ts` and `cases/expect-clean-render.ts`. The TestBed columns run on copies of the cases with `jit: true` added to `@Component`. `ng test` builds specs in AOT, and ngtsc skips any component whose decorator has a `jit` key (`@angular/compiler-cli/bundles/chunk-TXYIKH36.js:3175`). Without the copies, the spec build would stop at the template error before TestBed ran. The section "ng test with the real case files" shows that path.

Rows 2 and 4 of the plan are split. Row 2a puts the call in an `@if` body, row 2b in an `ng-template`. Row 4a passes `$event` to a method typed `Recipe`, row 4b ignores `$event`.

## The table

| # | Bug | ESLint | AOT basic | AOT full | AOT strict | AOT strict, ext. as error | TestBed `NO_ERRORS_SCHEMA` | TestBed `errorOnUnknown*` | TestBed render, jsdom, dev mode |
|-|-|-|-|-|-|-|-|-|-|
| 1 | Method the class lacks, top level | pass | TS2339 error | TS2339 error | TS2339 error | TS2339 error | fails: TypeError on click | fails: TypeError on click | fails: TypeError on click |
| 2a | Same call inside an `@if` body | pass | pass | pass | TS2339 error | TS2339 error | fails: TypeError on click | fails: TypeError on click | fails: TypeError on click |
| 2b | Same call inside an `ng-template`, untyped context | pass | pass | pass | TS2339 error | TS2339 error | fails: TypeError on click | fails: TypeError on click | fails: TypeError on click |
| 3 | Wrong-shaped object to an input | pass | pass | pass | TS2739 error | TS2739 error | pass | pass | pass |
| 4a | Output the child no longer declares, handler takes `$event` | pass | pass | pass | TS2345 error | TS2345 error | pass | pass | pass |
| 4b | Output the child no longer declares, handler ignores `$event` | pass | pass | pass | pass | pass | pass | pass | pass |
| 5 | `cdkScrollable` missing from `imports` | pass | pass | pass | pass | pass | pass | pass | pass |
| 6 | `*appPermission` missing from `imports` | pass | pass | pass | NG8116 warning | NG8116 error | pass | fails: throws NG0303 | fails: console.error NG0303 |
| 7 | Signal read without `()` in `@if` | pass | TS2774 error | TS2774 error | TS2774 error, NG8109 warning | TS2774 error, NG8109 error | pass | pass | pass |
| 8 | Unused entry in `imports` | pass | NG8113 warning | NG8113 warning | NG8113 warning | NG8113 error | pass | pass | pass |

Fixed versions: every fixed row passes every AOT mode.
AOT full equals AOT basic in every row: yes.
ESLint rules that fire on the fixed versions too, so they say nothing about the bug: @angular-eslint/component-class-suffix, @angular-eslint/component-max-inline-declarations, @angular-eslint/template/i18n, @angular-eslint/template/no-call-expression.

Every fixed version also renders and clicks clean in all three TestBed columns: `src/app/rows/rows.spec.ts`, 30 of 30, part of `ng test`.

## First line of each diagnostic and failure

The NG8109 text ends in a stray `}`. That is Angular's own message, quoted as printed.

| # | Column | Code | First line |
|-|-|-|-|
| 1 | AOT basic | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActions'. |
| 1 | AOT full | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActions'. |
| 1 | AOT strict | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActions'. |
| 1 | AOT strict, ext. as error | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActions'. |
| 2a | AOT strict | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActionsInIf'. |
| 2a | AOT strict, ext. as error | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActionsInIf'. |
| 2b | AOT strict | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActionsInTemplate'. |
| 2b | AOT strict, ext. as error | TS2339 error | Property 'scaleRecipe' does not exist on type 'RecipeActionsInTemplate'. |
| 3 | AOT strict | TS2739 error | Type '{ name: string; time: number; }' is missing the following properties from type 'Recipe': id, title, minutes |
| 3 | AOT strict, ext. as error | TS2739 error | Type '{ name: string; time: number; }' is missing the following properties from type 'Recipe': id, title, minutes |
| 4a | AOT strict | TS2345 error | Argument of type 'Event' is not assignable to parameter of type 'Recipe'. |
| 4a | AOT strict, ext. as error | TS2345 error | Argument of type 'Event' is not assignable to parameter of type 'Recipe'. |
| 6 | AOT strict | NG8116 warning | A structural directive `appPermission` was used in the template without a corresponding import in the component. Make sure that the directive is included in the `@Component.imports` array of this component. Find more at https://v22.angular.dev/extended-diagnostics/NG8116 |
| 6 | AOT strict, ext. as error | NG8116 error | A structural directive `appPermission` was used in the template without a corresponding import in the component. Make sure that the directive is included in the `@Component.imports` array of this component. Find more at https://v22.angular.dev/extended-diagnostics/NG8116 |
| 7 | AOT basic | TS2774 error | This condition will always return true since this function is always defined. Did you mean to call it instead? |
| 7 | AOT full | TS2774 error | This condition will always return true since this function is always defined. Did you mean to call it instead? |
| 7 | AOT strict | TS2774 error | This condition will always return true since this function is always defined. Did you mean to call it instead? |
| 7 | AOT strict | NG8109 warning | isVegetarian is a function and should be invoked: isVegetarian()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109 |
| 7 | AOT strict, ext. as error | TS2774 error | This condition will always return true since this function is always defined. Did you mean to call it instead? |
| 7 | AOT strict, ext. as error | NG8109 error | isVegetarian is a function and should be invoked: isVegetarian()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109 |
| 8 | AOT basic | NG8113 warning | All imports are unused |
| 8 | AOT full | NG8113 warning | All imports are unused |
| 8 | AOT strict | NG8113 warning | All imports are unused |
| 8 | AOT strict, ext. as error | NG8113 error | All imports are unused |
| 1 | TestBed `NO_ERRORS_SCHEMA` | spec fails | uncaught: TypeError: ctx.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 1 | TestBed `errorOnUnknown*` | spec fails | uncaught: TypeError: ctx.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 1 | TestBed render, jsdom, dev mode | spec fails | uncaught: TypeError: ctx.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2a | TestBed `NO_ERRORS_SCHEMA` | spec fails | uncaught: TypeError: ctx_r1.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2a | TestBed `errorOnUnknown*` | spec fails | uncaught: TypeError: ctx_r1.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2a | TestBed render, jsdom, dev mode | spec fails | uncaught: TypeError: ctx_r1.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2b | TestBed `NO_ERRORS_SCHEMA` | spec fails | uncaught: TypeError: ctx_r2.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2b | TestBed `errorOnUnknown*` | spec fails | uncaught: TypeError: ctx_r2.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 2b | TestBed render, jsdom, dev mode | spec fails | uncaught: TypeError: ctx_r2.scaleRecipe is not a function: expected [ Array(1) ] to deeply equal [] |
| 6 | TestBed `errorOnUnknown*` | spec fails | Error: NG0303: Can't bind to 'appPermission' since it isn't a known property of 'button' (used in the 'RecipeToolbar' component template). |
| 6 | TestBed render, jsdom, dev mode | spec fails | console.error: NG0303: Can't bind to 'appPermission' since it isn't a known property of 'button' (used in the 'RecipeToolbar' component template).: expected [ Array(1) ] to deeply equal [] |

## ng test with the real case files

Same three TestBed steps, on the case files as written, without `jit`. The spec tsconfig extends the root tsconfig, like `tsconfig.spec.json` does, so `strictTemplates` is unset and therefore on. The spec build stops six of the ten rows before any spec runs.

| # | Spec build | TestBed `NO_ERRORS_SCHEMA` | TestBed `errorOnUnknown*` | TestBed render, jsdom, dev mode |
|-|-|-|-|-|
| 1 | fails: TS2339 | - | - | - |
| 2a | fails: TS2339 | - | - | - |
| 2b | fails: TS2339 | - | - | - |
| 3 | fails: TS2739 | - | - | - |
| 4a | fails: TS2345 | - | - | - |
| 4b | pass | pass | pass | pass |
| 5 | pass | pass | pass | pass |
| 6 | pass | pass | fails: throws NG0303 | fails: console.error NG0303 |
| 7 | fails: TS2774 | - | - | - |
| 8 | pass | pass | pass | pass |

## The stub that keeps the output binding alive

`src/app/rows/recipe-page.spec.ts` replaces the real `RecipeEditor` with a stub that implements `Pick<RecipeEditor, 'recipe' | 'saved' | 'cancelled'>`. The runner makes both mutations in copies under `cases/.matrix/` and deletes them at the end. The original files never change.

| Check | Result |
|-|-|
| Original `recipe-page.spec.ts` | passed: saves the recipe the editor emits; passed: closes when the editor cancels |
| Copy with `(saved)` deleted from the page template | failed: saves the recipe the editor emits (expected "vi.fn()" to be called with arguments: [ { id: 1, …(2) } ]); passed: closes when the editor cancels |
| Copy with `saved` renamed to `submitted` in the real editor | spec build fails: TS2345: Argument of type 'Event' is not assignable to parameter of type 'Recipe'. / TS2344: Type '"recipe" \| "saved" \| "cancelled"' does not satisfy the constraint 'keyof RecipeEditor'. |

The plan's stub declares only the outputs: `Pick<RecipeEditor, 'saved' | 'cancelled'>`. The first version of the spec used that form and failed with `NG0303: Can't bind to 'recipe' since it isn't a known property of 'app-recipe-editor'`. The page binds `[recipe]`, and the Vitest builder sets `errorOnUnknownProperties: true`. The stub has to declare every input the page binds. Command: `corepack pnpm exec ng test template-check-matrix --watch=false --include app/rows/recipe-page.spec.ts`. That run was a one-off and the runner does not repeat it.

## Compiler and package facts

| Check | Result |
|-|-|
| `strictTemplates` default when a tsconfig does not set it | true: `return this.options.strictTemplates !== false;` at @angular/compiler-cli/bundles/chunk-VMCGORHB.js:5033 (compiler-cli 22.2.1) |
| `fullTemplateTypeCheck` in compiler-cli | 0 of 373 .js and .d.ts files mention it |
| Extended diagnostics gated on `strictTemplates` | `if (this.strictTemplates && extendedTemplateChecker !== null) {` at @angular/compiler-cli/bundles/chunk-VMCGORHB.js:4743 |
| Basic mode skips template and control flow bodies | `checkTemplateBodies: false,` (line 5081), `checkControlFlowBodies: false,` (line 5082) in the same file |
| TypeScript `strict` default when a tsconfig does not set it | true: `return compilerOptions[flag] === void 0 ? compilerOptions.strict !== false : !!compilerOptions[flag];` at typescript/lib/typescript.js:22256 (TypeScript 6.0.3) |
| Row 6 with the plan's `extendedDiagnostics.checks` block | NG8116 error |
| Row 7 with the plan's `extendedDiagnostics.checks` block | TS2774 error, NG8109 error |
| Row 8 with the plan's `extendedDiagnostics.checks` block | NG8113 error |
| Row 2a with no `strictTemplates` in any tsconfig | TS2339 error |
| Row 8, `strictTemplates: false` plus `extendedDiagnostics` | NG4003 error: Angular compiler option "extendedDiagnostics" is configured, however "strictTemplates" is disabled. |
| Row 7, basic mode with TypeScript `strict: false` | pass |
| Signal read without `()` in `@switch`, AOT basic | TS2678 error / TS2678: Type 'string' is not comparable to type 'WritableSignal<string>'. |
| Signal read without `()` in `@switch`, AOT strict | TS2678 error, NG8109 warning / TS2678: Type 'string' is not comparable to type 'WritableSignal<string>'. / NG8109: difficulty is a function and should be invoked: difficulty()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109 |
| Root tsconfig.json sets `strictTemplates` | no, the key is absent |
| `ng new` tsconfig template (@schematics/angular 22.2.2) | writes `"strictTemplates": false` only when `--strict=false`, writes nothing otherwise |
| TestBed defaults in @angular/core | `const THROW_ON_UNKNOWN_ELEMENTS_DEFAULT = false;` (testing.mjs:133), `const THROW_ON_UNKNOWN_PROPERTIES_DEFAULT = false;` (testing.mjs:134) |
| `@angular/build:unit-test` (Vitest) TestBed init | sets both to true: `errorOnUnknownElements: true,` at @angular/build/src/builders/unit-test/runners/vitest/build-options.js:120 |
| Spec build of `ng test` is AOT | application builder default `aot = true` at @angular/build/src/builders/application/options.js:258, the unit-test builder inherits it |

Before Angular 22, from the published 21.2.22 package (read with curl, not installed):

```bash
curl -s https://cdn.jsdelivr.net/npm/@angular/compiler-cli@21.2.22/bundles/chunk-PMBD6IFV.js | grep -n "fullTemplateTypeCheck"
```

Lines 4657 to 4659 hold `get fullTemplateTypeCheck() { const strictTemplates = !!this.options.strictTemplates; return strictTemplates || !!this.options.fullTemplateTypeCheck; }`. On 21.2.22 a workspace that sets neither option runs in basic mode. On 22.2.1 the same workspace runs in strict mode.

## Modules that make cdkScrollable available

The runner parses `exports: [...]` in every `ɵɵngDeclareNgModule` call in `@angular/cdk/fesm2022` and `@angular/material/fesm2022` and follows re-exports. The plan's own loop over ten Material files prints the same seven yes and three no.

| NgModule | Package file | How |
|-|-|-|
| DragDropModule | @angular/cdk/fesm2022/drag-drop.mjs | exports `CdkScrollableModule` |
| MatAutocompleteModule | @angular/material/fesm2022/autocomplete.mjs | exports `CdkScrollableModule` |
| MatDatepickerModule | @angular/material/fesm2022/datepicker.mjs | exports `CdkScrollableModule` |
| MatMenuModule | @angular/material/fesm2022/menu.mjs | exports `CdkScrollableModule` |
| MatSelectModule | @angular/material/fesm2022/select.mjs | exports `CdkScrollableModule` |
| MatSidenavModule | @angular/material/fesm2022/sidenav.mjs | exports `CdkScrollableModule` |
| MatTimepickerModule | @angular/material/fesm2022/timepicker.mjs | exports `CdkScrollableModule` |
| MatTooltipModule | @angular/material/fesm2022/tooltip.mjs | exports `CdkScrollableModule` |
| OverlayModule | @angular/cdk/fesm2022/_overlay-module-chunk.mjs | through ScrollingModule |
| ScrollingModule | @angular/cdk/fesm2022/scrolling.mjs | exports `CdkScrollableModule` |

The plan's ten Material entry points: autocomplete yes, datepicker yes, menu yes, select yes, sidenav yes, timepicker yes, tooltip yes, dialog no, stepper no, tabs no.

`src/app/rows/ingredient-picker.spec.ts` shows the effect at runtime: a `CdkScrollable` instance exists with `MatAutocompleteModule` in `imports` or with `CdkScrollable` in `imports`, and none exists with empty `imports`. No error appears in any of the three.

## Checks

| Check | Command | Result | Pass/fail |
|-|-|-|-|
| Scaffold baseline at 4dda0c8, before this folder's code | `ng build`, `ng test --watch=false`, `ng lint` for `template-check-matrix` | build exit 0, 2 of 2 tests in 1 file, lint clean | pass |
| Build gate | `corepack pnpm exec ng build template-check-matrix` | exit 0, no warnings | pass |
| Test gate | `corepack pnpm exec ng test template-check-matrix --watch=false` | 36 of 36 tests in 4 files | pass |
| Lint gate | `corepack pnpm exec ng lint template-check-matrix` | All files pass linting | pass |
| Matrix runner | `node 01-template-check-matrix/run-matrix.mjs` | exit 0 in about 50 seconds, no problems section | pass |
| Fixed versions in every AOT mode | runner | no diagnostics in 40 ngc runs | pass |
| Fixed versions in every TestBed column | `ng test` (`rows.spec.ts`) | 30 of 30 | pass |
| Stub spec on the real page | runner | 2 of 2 pass | pass |
| Stub spec after `(saved)` is deleted | runner | "saves the recipe the editor emits" fails | pass |
| `Pick` after `saved` is renamed | runner | spec build fails with TS2344 | pass |
| Plan's re-export loop | the plan's `for f in ...` loop in `node_modules/@angular/material/fesm2022` | 7 yes, 3 no | pass |
| Prettier | `corepack pnpm exec prettier --check "01-template-check-matrix/**/*.{ts,html}"` | all files formatted | pass |
| Keep-out words | `grep -rn -i -E -f _keep-out-words.txt 01-template-check-matrix` | no hits | pass |

The test count went from 2 to 36. The two scaffold tests checked the generated welcome page, which this folder replaced with a page that renders the fixed rows.

## Plan claims that turned out false

1. "AOT build, legacy full mode": compiler-cli 22.2.1 has no full mode. No `.js` or `.d.ts` file in the package mentions `fullTemplateTypeCheck`, and the option is ignored without a warning. The AOT full column equals AOT basic in every row.
2. "A library that does not set it inherits `false` unless a parent config sets it": false on 22.2.1. An unset `strictTemplates` is `true` (`chunk-VMCGORHB.js:5033`). Row 2a with no setting anywhere fails with TS2339. The claim holds for 21.2.22.
3. "Row 4 passes `strictTemplates`": false when the handler passes `$event` on. The unknown event is treated as a DOM event, so `$event` is typed `Event`, and strict mode reports TS2345 against the `Recipe` parameter (row 4a). Only a handler that ignores `$event` passes (row 4b).
4. "Row 7 gets a warning only with `strictTemplates` on": false. TypeScript 6 turns `strict` on by default (`typescript.js:22256`), and even basic mode checks the `@if` condition, so TS2774 fails the build in all four modes. Basic mode passes row 7 only with `"strict": false` in the tsconfig. The NG8109 warning does need `strictTemplates`.
5. The stub example with `Pick<..., 'saved' | 'cancelled'>`: in this setup it throws NG0303 as soon as the page binds an input of the child. The stub also needs the inputs. See the stub section.

## Plan claims that hold, with corrections

- Row 2 passes basic mode: holds. `checkTemplateBodies: false` and `checkControlFlowBodies: false` are at `chunk-VMCGORHB.js:5081-5082`.
- Row 5 passes every build: holds. It also passes ESLint and every TestBed column.
- Row 6, NG8116 warning with `strictTemplates`, and it can be raised to an error: holds. Without strict templates the only trace is NG0303 at runtime: holds for the jsdom dev mode render. Two corrections: the message names the host element (`button`), not `ng-template`, and under `ng test` the builder's `errorOnUnknownProperties: true` turns NG0303 into a failing spec unless `NO_ERRORS_SCHEMA` hides it.
- `interpolatedSignalNotInvoked` checks `@if` and `@switch`: holds, NG8109 for both. It needs `strictTemplates`: holds.
- Extended diagnostics run only with `strictTemplates`: holds (`chunk-VMCGORHB.js:4743`). Setting `extendedDiagnostics` with `strictTemplates: false` is config error NG4003.
- Row 8 passes ESLint, and NG8113 warns with or without `strictTemplates`: holds. Correction: without `strictTemplates` it cannot be raised to an error, because that needs `extendedDiagnostics` (NG4003).
- `errorOnUnknownElements` and `errorOnUnknownProperties` are still `false` by default: holds for TestBed (`@angular/core/fesm2022/testing.mjs:133-134`). Correction: `@angular/build:unit-test` passes `true` for both (`build-options.js:120-121`), so `ng test` with Vitest already runs with them on.
- Seven Material modules re-export `CdkScrollableModule` (autocomplete, datepicker, menu, select, sidenav, timepicker, tooltip), dialog, stepper and tabs do not: holds on Material 22.2.1. Addition: CDK `OverlayModule` (through `ScrollingModule`), `ScrollingModule` and `DragDropModule` also make `cdkScrollable` available. No Material module re-exports `OverlayModule`.
- `ng new` turns `strictTemplates` on: holds in effect. Correction: the 22.2.2 template writes no `strictTemplates` key, and strict mode comes from the compiler default. A search for `"strictTemplates": true` in a fresh Angular 22 workspace finds nothing. This repo's root `tsconfig.json` has no `strictTemplates` key.
- No angular-eslint rule catches any row, even with every rule on. `@angular-eslint/no-uncalled-signals` checks TypeScript code only, not templates. `template/no-call-expression` skips output handlers, so it cannot see rows 1 and 2.

## Not checked

- Nx Angular generators: Nx is not installed in this repo.
- jest-preset-angular and its setup helpers: not installed. This repo runs Vitest through `@angular/build:unit-test`, so the plan's Jest wording does not match it.
- A real browser. The runtime column is TestBed in jsdom, dev mode.
- Angular 21 behavior was read from the published source. It was not run.
