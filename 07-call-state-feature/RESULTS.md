# Results

Checked on 2026-10-07. Versions read from `node_modules`: Angular 22.2.1, @ngrx/signals 22.0.1,
@ngrx/operators 22.0.1, TypeScript 6.0.3, ng-packagr 22.2.4, Vitest 5.0.3. Node 24.15.0.

All commands run from the repository root through `corepack pnpm exec`.

## Gates

| Command | Result | Status |
|-|-|-|
| `ng build call-state` | Built call-state | pass |
| `ng test call-state --watch=false` | 6 files, 29 tests passed | pass |
| `ng lint call-state` | All files pass linting | pass |
| `node 07-call-state-feature/experiments/run.mjs` | 20 of 20 cases match their expected result | pass |

The baseline at commit 4dda0c8 was green according to the task brief. It was not run again here.

Re-run on 2026-10-07 after adding `src/lib/call-state/single-request/` (the article's one-request version of
the feature, with a spec of three tests): build pass, 6 files and 29 tests pass, lint pass, runner 20 of 20.
Before the change the same four gates gave 5 files and 26 tests.

Two mutation checks showed the specs can fail. Removing the `message` branch from `setError` failed
"uses the message of an HttpErrorResponse". Changing one `expectTypeOf` to `Signal<number>` failed
the test build with TS2344. Both files were restored. A copy of the runner with one wrong expectation
reported `MISMATCH` and exited with 1.

## Experiment runner cases

| Case | Expected | Got |
|-|-|-|
| Feature return type wrapped in a custom alias | TS2322, TS4111 | TS2322, TS4111 |
| Feature return type spelled as `SignalStoreFeature<...>` | clean | clean |
| Minimal unannotated feature (the plan's first draft), declaration emit | clean | clean |
| Collision, `tsc` declaration emit | TS4023 | TS4023 |
| Collision with the same member type, `tsc` declaration emit | TS4023 | TS4023 |
| Collision, `ngc` declaration emit | TS4023 | TS4023 |
| Collision, `ng-packagr` library build | TS4023 | TS4023 |
| Collision, `console.warn` spec | clean | clean |
| Renamed field, declaration emit | clean | clean |
| NgRx docs known issue, two input features | TS2769 | TS2769 |
| NgRx docs fix `<_>`, `tsc` | clean | clean |
| NgRx docs fix `<_>`, ESLint | no-unused-vars | no-unused-vars |
| `withUsers()` + `withRoles()`, both input-typed | TS2769 | TS2769 |
| `withUsers<_>()` + `withRoles<_>()`, `tsc` | clean | clean |
| `withUsers<_>()` + `withRoles<_>()`, ESLint | no-unused-vars | no-unused-vars |
| Same, ESLint with `varsIgnorePattern: '^_'` | clean | clean |
| `withRoles()` alone, input-typed | clean | clean |
| `withFeature` route (`src/lib/split/users-roles.store.ts`) | clean | clean |
| Hand-typed `withMethods` factory, plain props type | TS2345 | TS2345 |
| Hand-typed `withMethods` factory, `WritableStateSource` | clean | clean |

## Checks from "Check before you publish"

### 1. `tapResponse` signature in @ngrx/operators 22

Source: `node_modules/@ngrx/operators/types/ngrx-operators.d.ts`, lines 40 and 72.

There is one declaration:

```ts
declare function tapResponse<T, E = unknown>(observer: TapResponseObserver<T, E>): (source$: Observable<T>) => Observable<T>;
```

`TapResponseObserver<T, E>` is `{ next, error, complete?, finalize? }`. The positional form
`tapResponse(next, error)` from the 2024 article is not in the types.

Status: pass.

### 2. `withFeature` description in the installed d.ts

Source: `node_modules/@ngrx/signals/types/ngrx-signals.d.ts`, line 435.

Text: "Allows passing state signals, properties, and methods from a SignalStore instance to a custom
feature." The usage example passes `(store) => withEntityLoader((id) => store.loadById(id))`. The text
is the same at NgRx tag 21.1.0 (`modules/signals/src/with-feature.ts`, line 12).

Status: pass.

### 3. Input-typed `signalStoreFeature` syntax in 22

Source: `ngrx-signals.d.ts` line 391 (overloads with `input: Input` as the first argument), and the
22.0.1 docs, "Example 3" and "Example 4".

`signalStoreFeature({ state: type<...>(), props: type<...>(), methods: type<...>() }, ...)` is valid.
So is `signalStoreFeature(type<SignalStoreFeatureType<typeof withX>>(), ...)`.

Status: pass.

### 4. Known TypeScript issue and workaround in the 22 docs

Source: https://raw.githubusercontent.com/ngrx/platform/22.0.1/projects/www/src/app/pages/guide/signals/signal-store/custom-store-features.md,
line 398, "Known TypeScript Issues". The 19.2.0 docs have the same section
(`projects/ngrx.io/content/guide/signals/signal-store/custom-store-features.md`, line 269).

The section is still there in 22.0.1, with the same `withZ<_>()` workaround. The docs example still
fails on NgRx 22.0.1 with TypeScript 6.0.3:

```
07-call-state-feature/experiments/split/docs-known-issue.ts(11,22): error TS2769: No overload matches this call.
  ...
            Types of property 'stateSignals' are incompatible.
              Property 'y' is missing in type '{ x: Signal<number>; z: Signal<number>; }' but required in type '{ y: Signal<number>; }'.
```

The NgRx ESLint rule `signal-store-feature-should-use-generic-type` (docs at tag 22.0.1) asks for the
same `<_>` and is marked fixable. That plugin is not installed in this repo.

Status: pass.

### 5. `resource`, `rxResource` and `httpResource` in 22.2

| API | 22.2.1 type files | 21.2.0 source on GitHub |
|-|-|-|
| `resource` | `@publicApi 22.0`, `core/types/core.d.ts` lines 7430 and 7443 | `@experimental 19.0` |
| `rxResource` | `@publicApi 22.0`, `core/types/rxjs-interop.d.ts` lines 198 and 207 | `@experimental` |
| `httpResource` | `@publicApi 22.0`, `common/types/http.d.ts` line 2534 | `@experimental 19.2` |

21.2.0 sources: `packages/core/src/resource/resource.ts`, `packages/core/rxjs-interop/src/rx_resource.ts`
and `packages/common/http/src/resource.ts` at tag `v21.2.0`.

Still experimental in 22.2.1: `debounced` (`@experimental 22.0`) and `resourceFromSnapshots`.

Status: pass.

### 6. Prior art in the NgRx docs

Source: the 22.0.1 raw markdown from check 4.

Yes, there is a request status example. It is called "Example 1: Tracking Request Status" and builds
`withRequestStatus()`:

- state `requestStatus: 'idle' | 'pending' | 'fulfilled' | { error: string }`
- computed `isPending`, `isFulfilled` and `error`
- standalone updaters `setPending()`, `setFulfilled()` and `setError(error: string)`
- used in a `BooksStore`

It is the plan's single-request feature with other names. It has no named collections and no error
mapping. The 19.2.0 docs have the same example. The live page should be
https://ngrx.io/guide/signals/signal-store/custom-store-features. That URL is inferred from the docs
path and was not fetched.

Status: pass. Prior art exists and needs credit.

### 7. ngrx-toolkit `withCallState`

Sources: the README of https://github.com/ngrx-toolkit/core (the old `angular-architects/ngrx-toolkit`
repo redirects there), `docs/docs/with-call-state.md`, and
`libs/ngrx-toolkit/src/lib/with-call-state.ts` (last changed 2025-07-29, commit f5a1b35c8a).

The README does not mention `withCallState`. It says the package is `@ngrx-toolkit/core` from v22 and
`@angular-architects/ngrx-toolkit` for v21 and earlier. The docs and the source show `withCallState`
with the API the plan describes:

- union `'init' | 'loading' | 'loaded' | { error: string }`
- `withCallState()`, `withCallState({ collection })` and `withCallState({ collections })`
- members `callState`, `loading`, `loaded`, `error`, and `xCallState`, `xLoading`, `xLoaded`, `xError`
- `setLoading(collection?)`, `setLoaded(collection?)` and `setError(error, collection?)`

How the code in this folder differs:

- Toolkit `setError` reads `message` from any object and turns a falsy error into `''`. This folder
  reads `message` from an `Error` or from any object with `message`, and turns other values into a
  string, so `setError(undefined)` gives `'undefined'`.
- Toolkit builds the keys with `Capitalize` over the slice keys and treats an empty collection name
  as no collection. This folder maps the collection names to keys directly.

Status: pass. It exists, and the plan's named-collections API matches it almost name for name.

### 8. Name collision: the console warning

Sources: `node_modules/@ngrx/signals/fesm2022/ngrx-signals.mjs` line 499, and the spec
`experiments/collision/profile.store.spec.ts` (runner case "Collision, console.warn spec").

NgRx 22.0.1 calls `console.warn` once, with three arguments:

```ts
'@ngrx/signals: SignalStore members cannot be overridden.'
'Trying to override:'
'profileError'
```

A browser console prints them on one line:
`@ngrx/signals: SignalStore members cannot be overridden. Trying to override: profileError`.
NgRx 21.1.0 passes the same three arguments (`modules/signals/src/signal-store-assertions.ts`,
line 17). The check runs only when `ngDevMode` is on.

The derived signal wins. After `patchState(unprotected(store), { profileError: true })`,
`getState(store).profileError` is `true` and `store.profileError()` is `null`. TypeScript types the
member as `(() => boolean) & { [SIGNAL]: unknown } & (() => string | null)`, so `store.profileError()`
is typed `boolean` while it returns `null`.

Status: pass, with a correction to the plan (three arguments, not two strings).

### 9. Name collision: declaration emit

Commands: runner cases with `tsc` (`declaration: true`), `ngc`, and `ng-packagr` using the library's
own `tsconfig.lib.prod.json`.

All three fail with the same error:

```
error TS4023: Exported variable 'ProfileStore' has or is using name 'SIGNAL' from external module "/Users/dineeek/Repos/Private/angular-articles/node_modules/.pnpm/@angular+core@22.2.1_@angular+compiler@22.2.1_rxjs@7.8.2/node_modules/@angular/core/types/_chrome_dev_tools_performance-chunk" but cannot be named.
```

It also fails when both members have the same type (`profileError: null as string | null`).
TS4023 is the only error in the `ng-packagr` output.

Renaming the state field to `hasProfileError` gives clean declarations and no warning
(`src/lib/profile/profile.store.ts` and its spec).

Cause in one sentence: a member that two features define is typed as an intersection of two signal
types, TypeScript writes that intersection out in full, and the result holds Angular's `SIGNAL`
symbol from an internal type file that declaration emit cannot import.

Status: pass. The TS4023 trap is real on NgRx 22.0.1 with TypeScript 6.0.3.

### 10. Splitting a store

- One input-typed `withRoles()` in a store compiles.
- `withUsers()` plus `withRoles()`, both input-typed, fails:

  ```
  07-call-state-feature/experiments/split/combined-input.ts(45,32): error TS2769: No overload matches this call.
    ...
              Types of property 'stateSignals' are incompatible.
                Type '{}' is missing the following properties from type '{ users: Signal<User[]>; usersCallState: DeepSignal<{ error: string; }> | Signal<"init" | "loading" | "loaded">; }': users, usersCallState
  ```

- With `withUsers<_>()` and `withRoles<_>()` it compiles. ESLint then reports
  `'_' is defined but never used  @typescript-eslint/no-unused-vars` for each `<_>`.
  With `varsIgnorePattern: '^_'` on that rule, lint passes. The repo config does not set it.
- The `withFeature` route compiles, passes lint and emits clean declarations. Each feature takes the
  store members it needs as a typed argument: `withFeature((store) => withUsers(store))`. This is the
  version in `src/lib/split/`, with a spec.
- A hand-typed `withMethods` factory in another file fails when the store is typed by its props only:

  ```
  07-call-state-feature/experiments/split/hand-typed-plain.ts(7,16): error TS2345: Argument of type '{ users: Signal<User[]>; }' is not assignable to parameter of type 'WritableStateSource<object>'.
    Property '[STATE_SOURCE]' is missing in type '{ users: Signal<User[]>; }' but required in type 'WritableStateSource<object>'.
  ```

- The same factory compiles when the store is typed
  `WritableStateSource<UsersState> & { users: Signal<User[]> }`.

Status: pass. Results recorded.

## Findings the plan does not mention

1. Wrapping the feature return type in your own alias breaks inference. With
   `type FeatureOf<S, P> = SignalStoreFeature<...>` as the return type, `signalStore()` loses every
   member and falls back to an index signature:

   ```
   07-call-state-feature/experiments/feature/alias-return-type.ts(28,3): error TS2322: Type 'Function' is not assignable to type 'Signal<boolean>'.
   07-call-state-feature/experiments/feature/alias-return-type.ts(28,16): error TS4111: Property 'loading' comes from an index signature, so it must be accessed with ['loading'].
   ```

   The same file with the return type spelled as `SignalStoreFeature<...>` compiles. The plan's code
   has no return type annotation, so it does not hit this.
2. `HttpErrorResponse` is not an `Error` instance. Its declaration is
   `declare class HttpErrorResponse extends HttpResponseBase implements Error`
   (`@angular/common/types/_module-chunk.d.ts`, line 845). A spec shows `instanceof Error` is `false`
   and `String(response)` is `'[object Object]'`.
3. The 2024 effect placed `tapResponse` after `switchMap`. After the first error the stream
   completes and later calls do nothing. The spec "tapResponse after switchMap instead of inside it"
   shows the second `loadUsers()` sends no request. The plan's port puts `tapResponse` inside
   `switchMap`, which keeps the method alive.
4. The repo lint (`@typescript-eslint/consistent-type-definitions`, from the typescript-eslint
   stylistic set) rejects `type UsersState = { users: User[] }`. This folder uses interfaces. With an
   interface, the setter overloads need the implementation return type
   `CallStateSlice | NamedCallStateSlice<string>`. `Record<string, CallState>` fails with TS2394,
   because an interface has no index signature.
5. In the emitted types, the `callState` state signal is
   `DeepSignal<{ error: string }> | Signal<'init' | 'loading' | 'loaded'>`, not `Signal<CallState>`.
   Reading it still gives `CallState`, checked with `expectTypeOf` in `with-call-state.spec.ts`.
6. To reproduce the checks by hand: TypeScript 6.0 needs an explicit `rootDir` when the sources span
   folders (TS5011), and `ngc` rejects `emitDeclarationOnly` (NG4006).
7. A config file named `ng-package.json` anywhere inside the library folder becomes a secondary entry
   point of `ng build call-state`. The runner names its config `ng-package.collision.json` and writes
   it under `experiments/out`, which it deletes at the end.

## Plan claims that turned out false

Claims from the first draft of the plan. The plan has since been updated with these results.

1. "NgRx 21.1 logs two strings to the console." Both 21.1.0 and 22.0.1 pass three arguments:
   `'@ngrx/signals: SignalStore members cannot be overridden.'`, `'Trying to override:'` and the key
   list. Evidence: check 8.
2. The first draft's `setError` maps an `HttpErrorResponse` to `'[object Object]'`.
   `error instanceof Error ? error.message : String(error)` misses the most common error a
   `UsersStore` gets from `HttpClient`. Evidence: finding 2 and the spec
   "cannot rely on instanceof Error for an HttpErrorResponse". The code here also reads `message`
   from any object.
3. "Do not hand-type a bare `withMethods` factory in another file" is too strong. A hand-typed
   factory compiles when its store parameter includes `WritableStateSource<State>`. It fails only
   without it. Evidence: check 10.

Claims that held: TS4023 on a collision (now confirmed on 22.0.1, not only 19.2), the 19.2 docs
listing the known issue with `<_>`, `no-unused-vars` rejecting `<_>`, the `withFeature` text, the
resource API tags in 22.2.1 and 21.2, and the old list staying visible during a refresh.

## Deviations from the plan's code

- The template uses `lib-spinner` and `lib-user-row`. The library lint requires the `lib` prefix,
  so `app-spinner` and `app-user-row` fail lint.
- `User` has an `id` because the template tracks `user.id`. The 2024 `IUser` had only `name` and
  `age`, and its template tracked `user.name`.
- The service method is `getUsers()`, as in the plan. The 2024 article used `getUsers$()`.
- The split store is named `UsersRolesStore` so it does not clash with the ported `UsersStore`.
- The collision warning spec runs through the experiment runner, not the default `ng test`, as the
  task asked for broken cases.

## Checks not run

- TS4023 on NgRx 19.2. That version is not installed, and installing packages was out of scope.
- The live ngrx.io page. The check used the raw markdown at tag 22.0.1.
