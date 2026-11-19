# Results

Checked on 2026-11-19. All commands run from the repository root, `ng` and `prettier` through `corepack pnpm exec`.

## Versions

Read from `node_modules`.

| Package | Version |
|-|-|
| @angular/core, @angular/common | 22.2.1 |
| @angular/build, @angular/cli | 22.2.2 |
| @ngrx/signals | 22.0.1 |
| @ngrx/operators | 22.0.1 |
| rxjs | 7.8.2 |
| typescript | 6.0.3 |
| vitest | 5.0.3 |
| jsdom | 30.1.2 |
| ng-packagr | 22.2.4 |
| pnpm | 10.33.0 |
| Node | 24 |

## Gates

| Command | Result | Status |
|-|-|-|
| `ng build rxjs-traps` | Built rxjs-traps, exit 0 | pass |
| `ng test rxjs-traps --watch=false` | 4 files, 19 tests passed, exit 0 | pass |
| `ng lint rxjs-traps` | All files pass linting, exit 0 | pass |
| `node 03-rxjs-traps/repro/repro.mjs` | Output below, exit 0 | pass |
| `node 03-rxjs-traps/experiments/run.mjs` | 4 of 4 cases match their expected result, exit 0 | pass |

The task brief gives commit efbccd3 as the green baseline. It was not run again here.
At that commit this folder held only the generated placeholder component and its spec. Both are removed.
No other project imports `rxjs-traps`.

## 1. The Node repro

Command: `node 03-rxjs-traps/repro/repro.mjs`. Exit 0.

```text
rxjs 7.8.2
--- 1. concatMap reads state when it dequeues
Dune saved with shelf=fiction
Emma saved with shelf=classics
--- 1b. same code with a synchronous of() mock
Dune saved with shelf=fiction
Emma saved with shelf=fiction
--- 2. catchError(() => []) inside forkJoin
complete
next [["Dune"],[]]
complete
--- 3. forkJoin({}) and forkJoin([])
complete {}
complete []
--- 4. shareReplay(1) after an error
sub A error first call fails
sub B next [ 'poetry' ]
source calls 2
--- 4b. share with resetOnError: false after an error
sub A error first call fails
sub B error first call fails
source calls 1
--- 5. a throw inside subscribe next
subscriber B got 1
caller: next() returned normally
later, on a timer: subscriber A failed
--- 5b. the same throw with useDeprecatedSynchronousErrorHandling
subscriber B got 1
caller caught subscriber A failed
config reset: false
```

The original script loaded rxjs through an absolute path. The port imports it from this repository's `node_modules`.
The original, pointed at the same rxjs, printed the same lines for cases 1 to 5 (compared with `diff`).
Cases 4b and 5b are new.
Case 4b uses the `share` config that `shareReplay(1)` builds (`shareReplay.ts:167-172`) with only `resetOnError` flipped to `false`.
Case 5b sets `config.useDeprecatedSynchronousErrorHandling = true`, runs case 5 again, and sets it back to `false` in a `finally`. It runs on a timer after case 5's timer, so the earlier lines keep their order.

| Plan claim | Repro case | Status |
|-|-|-|
| Held-open subjects print `Dune saved with shelf=fiction`, then `Emma saved with shelf=classics` | 1 | pass |
| A synchronous `of()` mock prints "fiction" for both | 1b | pass |
| `catchError(() => [])` in `forkJoin` prints only `complete`. `of([])` prints `next [["Dune"],[]]` | 2 | pass |
| `forkJoin({})` and `forkJoin([])` complete without emitting | 3 | pass |
| `shareReplay`: the first subscriber gets the error, the second gets fresh data, the source runs twice | 4 | pass |
| `share` with `resetOnError: false` keeps the error | 4b: both subscribers get the error, the source runs once | pass |
| A throw in one subscriber: the second subscriber still runs, `next()` returns normally, the error shows up later on a timer | 5, with RxJS 7's default `config` | pass |
| The same, with `useDeprecatedSynchronousErrorHandling` on | 5b: the second subscriber still runs, but `next()` throws to its caller | the claim does not hold in this mode |

## 2. Laptop build store

Files: `src/lib/laptop-build/late-read-build.store.ts` (the late read) and `src/lib/laptop-build/laptop-build.store.ts` (the fix).
Both are an injectable class with a `signalState`, a private `rxMethod` + `concatMap` `savePart`, and `addPart`, `removePart`, `selectModel`, `parts`, `buildKey`, `hasSaveError` and `isSaving`.
The API is `LaptopBuildApi`, an injectable service on `HttpClient`. Its `savePart` takes a `SavePartRequest`, `{ part, isAdded }`. Specs replace it with `{ savePart: vi.fn() }`.

The fix sends `{ part: change.part, isAdded: change.isAdded }`, not the whole change. Passing `change` would put the undeclared `buildKey` into the HTTP body.
The plan's fix snippet calls `this.api.savePart(change)`. The late-read store sends its own change, which has only `part` and `isAdded`.

`isSaving` is computed from a `pendingSaves` counter. A click adds one. Each save removes one in `tapResponse`'s `finalize`, and a dropped change removes one in the early `EMPTY` branch.
A single boolean set at the click and cleared by the first save's `finalize` would read `false` while the second save still waits in the queue. That is reasoning from the code, not a run.

## 3. Specs for the late read

Gate results, `ng test rxjs-traps --watch=false --reporters=verbose`. Every spec whose timing matters uses a held-open `Subject` per save. The request and reset specs use `of()` and `throwError()`.

| Spec | Store | Result |
|-|-|-|
| (a) ignores a save answer for a model the user has left | fix | pass |
| (b) keeps hasSaveError false when a save fails after the model change | fix | pass |
| shows the parts a save answers with (asserts the exact request `{ part: ram32, isAdded: true }`) | fix | pass |
| sends isAdded false for a removed part (asserts the exact request `{ part: ram32, isAdded: false }`) | fix | pass |
| clears the parts when the user selects another model (after a successful save) | fix | pass |
| clears hasSaveError when the user selects another model (after a failed save) | fix | pass |
| sets hasSaveError when a save for the current model fails | fix | pass |
| keeps isSaving true while a queued save waits | fix | pass |
| clears isSaving when it drops a queued save for the old model | fix | pass |
| shows the answer to a part the user added on the old model (expects the bug) | late read | pass |
| sets hasSaveError for a save the user left (expects the bug) | late read | pass |
| (c) with a synchronous of() mock: passes the stale answer check | late read | pass |
| (c) with a synchronous of() mock: passes the save error check | late read | pass |

In (a) the first save answers `[ram32]` and the second answers `[ram32, ssd2tb]`, each through its own `Subject`.

### (a) and (b) fail on the late read

1. In the gate, `late-read-build.store.spec.ts` asserts the broken values on the late-read store: `parts()` is `[ram32, ssd2tb]` after the model change, `savePart` ran twice, and `hasSaveError()` is `true`.
2. Runner case 1 copies `laptop-build.store.spec.ts` into `experiments/out` and changes only the store import to `LateReadBuildStore`. Result: exit 1, `Tests 3 failed | 6 passed (9)`.

```text
failed: LaptopBuildStore > ignores a save answer for a model the user has left
  → expected [ { id: 'ram-32', …(1) }, …(1) ] to deeply equal []
failed: LaptopBuildStore > keeps hasSaveError false when a save fails after the model change
  → expected true to be false // Object.is equality
failed: LaptopBuildStore > clears isSaving when it drops a queued save for the old model
  → expected true to be false // Object.is equality
```

### (c) A synchronous of() mock passes on the late read

The "with a synchronous of() mock" block of `late-read-build.store.spec.ts` runs the fix's assertions against the late-read store with `of()` and `throwError()` mocks. Both pass.
Each mock completes before the next click, so nothing waits in the queue and the error lands before the model change.

### (d) Removing the isStale check from the error handler

The `if (!isStale())` around `patchState(this.state, { hasSaveError: true })` in `laptop-build.store.ts` was deleted by hand, and `ng test rxjs-traps --watch=false --reporters=verbose` ran once.
Result: exit 1, `Tests 1 failed | 18 passed (19)`. Only (b) failed:

```text
 FAIL   rxjs-traps  03-rxjs-traps/src/lib/laptop-build/laptop-build.store.spec.ts > LaptopBuildStore > keeps hasSaveError false when a save fails after the model change
AssertionError: expected true to be false // Object.is equality
 ❯ 03-rxjs-traps/src/lib/laptop-build/laptop-build.store.spec.ts:99:34
```

The file was restored from a copy, and `cmp` showed it identical to the copy. Runner case 2 repeats the check on a copy, with the same single failure.

### More hand mutations of `laptop-build.store.ts`

Same method as (d): edit the real file, run `ng test rxjs-traps --watch=false --reporters=verbose`, restore it, compare with `cmp`.

| Change | Result | Failed tests |
|-|-|-|
| `selectModel()` without `parts: []` | exit 1, `Tests 1 failed \| 18 passed (19)` | clears the parts when the user selects another model |
| `selectModel()` without `hasSaveError: false` | exit 1, `Tests 1 failed \| 18 passed (19)` | clears hasSaveError when the user selects another model |
| `this.api.savePart(change)` instead of the mapped request | exit 1, `Tests 2 failed \| 17 passed (19)` | shows the parts a save answers with, sends isAdded false for a removed part |

### Runner cases 3 and 4

The runner checks each case's exit code, the Vitest `Tests` and `Test Files` summary lines, the name and message of every failing test, and that the output has no other error, failed suite or unhandled error.
Results: case 1 `Tests 3 failed | 6 passed (9)`, case 2 `Tests 1 failed | 8 passed (9)`, case 3 `Tests 1 failed | 8 passed (9)`, case 4 `Tests 1 failed | 1 passed (2)`. All four match.
A copy of the runner with case 4's expected passed count set to 2 reported `MISMATCH` and exited with 1.

Case 3 removes `this.finishSave()` from the early `EMPTY` branch. Only "clears isSaving when it drops a queued save for the old model" fails (`expected true to be false`).
This backs the plan's note that the early `EMPTY` must also clear the saving flag.

Case 4 runs the plan's first spec, copied as written, in `experiments/plan-spec/plan-verbatim.spec.ts` against both stores.
On the fix it passes. On the late read it fails at the second assertion:

```text
failed: LateReadBuildStore > ignores a save answer for a model the user has left
  → expected "vi.fn()" to be called 1 times, but got 2 times
```

`expect` stops at the first failed assertion, so `expect(store.parts()).toEqual([])` passed on the broken store. See "Plan claims that turned out false".

## 4. Filter panel

File: `src/lib/filter-panel/filter-panel-loader.ts`. In every spec the brands answer `['Acme', 'Nimbus']` and the screen sizes fail.

| Spec | Result |
|-|-|
| `loadWithEmptyArray()`: `catchError(() => [])` on each source. `next` is never called, `complete` is called once | pass |
| `loadWithFallback()`: `catchError(() => of([]))`. One `next` with `{ brands: ['Acme', 'Nimbus'], screenSizes: [] }` | pass |
| `loadWithErrorState()`: the plan's `loadList`. One `next` with `hasError: false` on brands and `items: [], hasError: true` on screen sizes | pass |
| `catchError(() => ['Acme', 'Nimbus'])` emits `'Acme'` and `'Nimbus'` as two values | pass |

The blank panel is shown at the operator level. No component renders it.

## 5. Imports and API status

| Check | Evidence | Status |
|-|-|-|
| `rxMethod` from `@ngrx/signals/rxjs-interop` | `@ngrx/signals/package.json` lines 77-79 export `./rxjs-interop`. `types/ngrx-signals-rxjs-interop.d.ts:49` declares `rxMethod`. Both stores import it and build | pass |
| `tapResponse` from `@ngrx/operators` | `types/ngrx-operators.d.ts:72` is the only declaration. It takes `TapResponseObserver<T, E>`, `{ next, error, complete?, finalize? }` (lines 40-45). Only the object form is accepted | pass |
| `httpResource` marked `@publicApi 22.0` | The tag sits in `@angular/common/types/http.d.ts` at `:2534` (`httpResource`), `:2412` (`HttpResourceFn`) and `:2387` (`HttpResourceRef`), version 22.2.1 | pass |
| `rxResource` marked `@publicApi 22.0` | The tag sits in `@angular/core/types/rxjs-interop.d.ts` at `:198` and `:207` (both overloads) and `:178` (`RxResourceOptions`), version 22.2.1 | pass |

## 6. RxJS source lines

All in `node_modules/rxjs/src/internal`, rxjs 7.8.2. Every cited line number is correct.

| Cited | Real line | Text | Status |
|-|-|-|-|
| `concatMap.ts:82` | `operators/concatMap.ts:82` | `return isFunction(resultSelector) ? mergeMap(project, resultSelector, 1) : mergeMap(project, 1);` | pass |
| `mergeInternals.ts:53` | `operators/mergeInternals.ts:53` | `const outerNext = (value: T) => (active < concurrent ? doInnerSub(value) : buffer.push(value));` | pass |
| `:71` | `operators/mergeInternals.ts:71` | `innerFrom(project(value, index++)).subscribe(` | pass |
| `:113-121` | `operators/mergeInternals.ts:113-121` | `while (buffer.length && active < concurrent)` ... `doInnerSub(bufferedValue);`, inside the inner's finalizer that starts at `:95` | pass |
| `catchError.ts:115` | `operators/catchError.ts:115` | `handledResult = innerFrom(selector(err, catchError(selector)(source)));` | pass |
| `forkJoin.ts:171-176` | `observable/forkJoin.ts:171-176` | the finalizer: `if (!remainingCompletions \|\| !hasValue)`, `next` only when `!remainingEmissions`, then `subscriber.complete()` | pass |
| `util/reportUnhandledError.ts:13-23` | `util/reportUnhandledError.ts:13-23` | `timeoutProvider.setTimeout(() => { ... throw err; })` | pass |
| `shareReplay.ts:169` | `operators/shareReplay.ts:169` | `resetOnError: true,`. `ShareReplayConfig` (lines 5-10) has `bufferSize`, `windowTime`, `refCount` and `scheduler`, no `resetOnError` | pass |

Two lines the article may want too: `observable/forkJoin.ts:150-153` completes at once when there are no sources, and `Subscriber.ts:151-158` catches a throw in a `next` callback and passes it to `handleUnhandledError` (`:230-238`).

`handleUnhandledError` calls `reportUnhandledError` only while `config.useDeprecatedSynchronousErrorHandling` is `false`, the default (`config.ts:12`).
When it is `true`, `handleUnhandledError` calls `captureError` (`Subscriber.ts:231-232`, `util/errorContext.ts:37-42`).
`Subject.next` runs inside `errorContext` (`Subject.ts:59-71`), which lets every observer run and then rethrows the captured error to the caller (`util/errorContext.ts:12-31`, the throw at `:22-23`). Repro case 5b shows it.

## 7. One httpResource per filter

File: `src/lib/filter-panel/filter-panel-resources.ts`, two `httpResource` fields with `defaultValue: []`. Spec with `HttpTestingController`, brands flushed with data and screen sizes with a 500.

| Spec | Result |
|-|-|
| brands keep `['Acme', 'Nimbus']`. Screen sizes have `status()` `'error'`, an `HttpErrorResponse` in `error()`, and `hasValue()` `false` | pass |
| `screenSizes.value()` throws | pass |

`value()` throws for a failed resource even with a `defaultValue`. The doc comment says so at `@angular/core/types/_api-chunk.d.ts:161`.
A template must check `hasValue()` or `error()` before it reads `value()` of a filter that can fail.

Not run: the doc of `RxResourceOptions.stream` (`@angular/core/types/rxjs-interop.d.ts:184-188`) says a stream that completes without a value makes Angular throw `NG0991`.
So `catchError(() => [])` inside an `rxResource` stream should fail loudly instead of leaving the panel blank. A spec would confirm it.

## Plan claims that turned out false

1. The plan says the first spec "checks that the stale answer never reaches the parts list". On the late-read store that assertion passes.
   The default mock `of([])` answers the second save with `[]`, which is the value the test expects.
   The spec goes red only through `toHaveBeenCalledTimes(1)` (runner case 4).
   The companion spec gives the second save its own held-open `Subject` that answers `[ram32, ssd2tb]`, so the `parts` assertion fails on its own (runner case 1).

2. The plan says a throw inside a `subscribe` next callback "does not reach the code that called `next()`" and that RxJS 7 reports it on a `setTimeout`.
   That holds only with RxJS 7's default `config`. With `config.useDeprecatedSynchronousErrorHandling = true`, `next()` throws to its caller (repro case 5b).
   The other subscribers still run in both modes, so the advice in "What to tell readers to change" holds.

No other claim from "What RxJS does", "Example code" or "Check before you publish" turned out false.
The `@ngrx/signals` import paths the plan checked on 21.1.1 hold on 22.0.1.
