# 19: split a signalStore into features

Companion code for the article "Three ways to split a signalStore across files. Two of them do not get
past the compiler and the linter". It reuses `withCallState` from
[07-call-state-feature](../07-call-state-feature/README.md).

Angular 22.2, @ngrx/signals 22.0, @ngrx/operators 22.0, TypeScript 6.0, Vitest.

## What is here

| Path | What it shows |
|-|-|
| `src/lib/directory/directory.store.ts` | The composition file: `withUsers()`, then `withRoles` and `withProfile` through `withFeature`, then the reactions in `onInit` |
| `src/lib/directory/features/` | One feature per file. Each owns its state and its call state, and takes a source type that names only what it reads |
| `src/lib/directory/effects/` | Reactions that cross features, as plain functions built on `signalMethod`. They clear the old roles and profile when the user changes, and a direct `loadRoles()` keeps them |
| `src/lib/call-state/with-call-state.ts` | `withCallState` from 07, copied unchanged |
| `src/lib/directory/features/with-roles.spec.ts` | One feature tested alone, in a store of its own with a fake source |
| `src/lib/directory/directory.store.spec.ts` | The whole store: users, then roles and profile for the selected user |
| `experiments/` | Cases that fail on purpose: features in the wrong order, a private member read from outside, hand-written result types that drift from the feature |
| `RESULTS.md` | What each check found, with the exact error text |

## Run it

From the repository root:

```bash
pnpm install
pnpm ng build store-features
pnpm ng test store-features --watch=false
pnpm ng lint store-features
node 19-split-store-features/experiments/run.mjs
```

The last command runs every experiment and compares it with the result it should give.
Add `--keep` to keep the compiler output in `experiments/out`.
Add `--no-strict` to compile the cases with `strict: false`. TypeScript 6 turns `strict` on when a
tsconfig does not set it, so the default run is the strict one.

The experiments stay out of the library build and the default test run. The runner also checks
three failing routes again, from `07-call-state-feature/experiments/split/`.
