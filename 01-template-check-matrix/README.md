# Template check matrix

Companion code for the article "Which check catches which Angular template bug? I tested eight".

Ten tiny recipe components each carry one template bug. `run-matrix.mjs` runs ESLint, the compiler in three settings (plus the legacy `fullTemplateTypeCheck` option, which Angular 22 ignores) and three TestBed setups against each one, and prints which check catches which bug. [RESULTS.md](RESULTS.md) holds the table from the last run.

## What is where

| Path | What it holds |
|-|-|
| `cases/row-*.ts` | The broken components, one bug each. The app build, the default test run and `ng lint` skip this folder. |
| `cases/tsconfig.*.json` | One tsconfig per compiler mode. |
| `src/app/rows/` | The fixed version of each row. The app renders them, and the normal build, test and lint check them. |
| `src/app/rows/recipe-page.spec.ts` | A child stub typed with `Pick` against the real component, so the output binding stays tested. |
| `src/app/rows/ingredient-picker.spec.ts` | `cdkScrollable` arriving through `MatAutocompleteModule`, and silently missing without it. |
| `eslint.matrix.config.js` | ESLint with every angular-eslint rule on. |
| `run-matrix.mjs` | Runs every check and prints the table. |

## Run it

From the repo root, Node 24 and pnpm through corepack:

```bash
corepack pnpm install
node 01-template-check-matrix/run-matrix.mjs
```

It takes about a minute. Add `--keep` to keep the generated files in `cases/.matrix/`.

The normal project checks:

```bash
corepack pnpm exec ng build template-check-matrix
corepack pnpm exec ng test template-check-matrix --watch=false
corepack pnpm exec ng lint template-check-matrix
```

## Two things to know before you read the table

- On Angular 22, `strictTemplates` is on when no tsconfig sets it. The basic and full mode tsconfigs turn it off with `strictTemplates: false`.
- `ng test` builds specs in AOT, so a template error can stop the spec build before TestBed runs. The TestBed columns use copies of the cases with `jit: true`, so the error reaches TestBed. RESULTS.md also shows what `ng test` does with the files as written.
