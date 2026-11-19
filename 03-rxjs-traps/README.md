# 03. RxJS traps

Companion code for "When concatMap reads your state later than you think" (publishes 1 Dec 2026).

Two RxJS operators can run your code later, or with a different result, than the code suggests.
`concatMap` calls its project function when a value reaches the front of its queue, so state read there is read late.
`catchError(() => [])` completes without a value, so a `forkJoin` that waits on it emits nothing.
This folder shows both on an invented laptop store: a build page that saves parts through a queue, and a search filter panel.

Angular 22.2, @ngrx/signals 22.0, @ngrx/operators 22.0, RxJS 7.8, TypeScript 6.0, Vitest.

## What is here

| Path | What it shows |
|-|-|
| `repro/repro.mjs` | Plain Node and RxJS, no Angular: the late read with held-open subjects and with a synchronous `of()` mock, `catchError(() => [])` in `forkJoin`, an empty `forkJoin`, `shareReplay` and `share` after an error, and a throw inside a subscriber with and without `useDeprecatedSynchronousErrorHandling` |
| `src/lib/laptop-build/late-read-build.store.ts` | The build store that reads the build key inside the `concatMap` project function |
| `src/lib/laptop-build/laptop-build.store.ts` | The fix. The click stamps the build key on the change, and both handlers check it. A change for a model the user left is dropped and clears its share of `isSaving` |
| `src/lib/laptop-build/*.spec.ts` | Specs with a held-open `Subject` per save. The late-read spec also shows that a synchronous `of()` mock passes on the broken store |
| `src/lib/filter-panel/filter-panel-loader.ts` | The filter panel three ways: `catchError(() => [])`, `catchError(() => of([]))`, and `loadList`, which keeps `hasError` next to the fallback |
| `src/lib/filter-panel/filter-panel-resources.ts` | One `httpResource` per filter, tested with `HttpTestingController` |
| `experiments/` | `run.mjs`, which runs four spec cases that fail on purpose, and `plan-spec/plan-verbatim.spec.ts`, the article's first spec as written |
| `RESULTS.md` | What each check found, with the exact output |

## Run it

From the repository root:

```bash
corepack pnpm install
corepack pnpm exec ng build rxjs-traps
corepack pnpm exec ng test rxjs-traps --watch=false
corepack pnpm exec ng lint rxjs-traps
node 03-rxjs-traps/repro/repro.mjs
node 03-rxjs-traps/experiments/run.mjs
```

The runner has four cases. Each one runs `ng test` on one spec file and checks the exit code, the Vitest summary, and the name and message of every failing test.

1. Copies `laptop-build.store.spec.ts` into `experiments/out` and points its store import at `LateReadBuildStore`. Three tests fail.
2. Copies `laptop-build.store.ts` and its spec, and removes the `isStale()` check from the error handler. One test fails.
3. Copies `laptop-build.store.ts` and its spec, and removes `this.finishSave()` from the early `EMPTY` branch. One test fails.
4. Runs the checked-in `experiments/plan-spec/plan-verbatim.spec.ts` against both stores. It fails on the late-read store and passes on the fix.

Add `--keep` to keep the copies in `experiments/out`.
The experiments stay out of the library build and the default test run.
