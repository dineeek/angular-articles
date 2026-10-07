# Results

Checked on 2026-10-07. Versions read from `node_modules`: Angular 22.2.1, @ngrx/signals 22.0.1,
@ngrx/operators 22.0.1, TypeScript 6.0.3, ng-packagr 22.2.4, Vitest 5.0.3. Node 24.15.0.

All commands run from the repository root through `corepack pnpm exec`.

## Gates

| Command | Result | Status |
|-|-|-|
| `ng build store-features` | Built store-features | pass |
| `ng test store-features --watch=false` | 4 files, 24 tests passed | pass |
| `ng lint store-features` | All files pass linting (24 files, experiments included) | pass |
| `node 19-split-store-features/experiments/run.mjs` | 14 of 14 cases match their expected result | pass |
| `node 19-split-store-features/experiments/run.mjs --no-strict` | 14 of 14 cases match their expected result | pass |

The baseline at commit 7e1d7f2 was green according to the task brief. It was not run again here.
The gates of the other projects were not run. No file outside this folder changed.

Re-run on 2026-10-07 after the review round recorded in findings 3 and 4 below (the profile reaction
watches the resolved user, both reactions clear the old data on a user switch, the runner checks the
error message of nine cases): build pass, 4 files and 24 tests pass, lint pass, runner 14 of 14 in
both modes, and `ng test call-state` still passes 29 tests.

### Strict mode

TypeScript 6.0 turns `strict` on when a tsconfig does not set it. Measured with the repo's `tsc`
6.0.3 on a file outside any tsconfig: `const x: string = null` fails with TS2322, and passes with
`--strict false`. The workspace `tsconfig.json` and this folder's configs set nothing, so every
default run is strict. `--no-strict` writes `strict: false` into each case config. Every case gives
the same error codes either way. The messages then show types such as `Signal<number>` in place of
`Signal<number | null>`, seen in the private member case.

### The specs can fail

Each change below was made by hand, run, and reverted.

| Change | Result |
|-|-|
| `reloadProfileOnUserChange` written as `effect(() => { store.selectedUserId(); store.loadProfile() })` | 2 of 18 fail: "does not react to the signals that loadProfile reads" and "does not reload the profile when the users reload" |
| `reloadProfileOnUserChange(store)` removed from `onInit` | 3 of 18 fail, all in `directory.store.spec.ts` |
| `_selectedUser` renamed to `selectedUser` | 1 of 18 fails: "still puts _selectedUser on the instance at runtime" |
| `not.toHaveProperty('_selectedUser')` pointed at `selectedUserId` | The test build fails with TS2554 |
| An extra type error added to `experiments/private/public-read.ts` | Runner prints `MISMATCH ... (expected TS2551, got TS2551, TS2322)` and exits with 1 |
| `export type Shape = { name: string }` added to an experiment | `ng lint` fails with `@typescript-eslint/consistent-type-definitions` |
| `store.clearRoles()` skipped in `reloadRolesOnUserChange` | 2 of 24 fail: "clears the roles before it loads the roles of the next user" and "drops the old roles and profile while another user loads" |
| `reloadProfileOnUserChange` watches `_selectedUser() ? 1 : null` instead of the user id | 3 of 24 fail: "calls loadProfile again when another user is selected", "loads the roles and the profile again when another user is selected" and "drops the old roles and profile while another user loads" |
| Wrong `message` on the misorder runner case | Runner prints `MISMATCH ... (expected TS2345, got TS2345, message not found)` and exits with 1 |

The first six rows were run before the review round, with 18 tests. The last three after it.

The spec "does not reload the profile when the users reload" first passed under the first mutation.
The refresh answered with the same user objects, so `_selectedUser` kept the same value and the
computed signal did not notify. The spec now refreshes with copies, as a server would send them.

## Experiment runner cases

| Case | Expected | Got |
|-|-|-|
| Misorder: `withProfile` composed before `withUsers` | TS2345 | TS2345 |
| Private member: `_selectedUser` read on the public store type | TS2551 | TS2551 |
| Private member: `withFeature` hands `_selectedUser` to `withProfile` (whole store, `tsc` declaration emit) | clean | clean |
| `SignalStoreFeatureType<typeof withRoles>`, a factory with a parameter | clean | clean |
| Hand-written result type as the return type of a factory with a parameter | clean | clean |
| `SignalStoreFeatureType` of the factory as its own return type | TS2577 | TS2577 |
| Hand-written result type claims a member, feature annotated with it | TS2322 | TS2322 |
| Hand-written result type claims a member, feature not annotated | TS2345 | TS2345 |
| Hand-written result type omits a member, feature annotated with it | clean | clean |
| Reaction calls `patchState` on the public store type | TS2345 | TS2345 |
| Whole store, `ngc` declaration emit | clean | clean |
| 07 route: hand-typed `withMethods` factory, plain props type | TS2345 | TS2345 |
| 07 route: `withUsers()` + `withRoles()`, both input-typed | TS2769 | TS2769 |
| 07 route: `withUsers<_>()` + `withRoles<_>()`, ESLint | no-unused-vars | no-unused-vars |

A case passes only when the set of reported codes equals the expected set. An extra code fails it.
Nine cases also require a message substring in the output, such as `Property '_selectedUser' is
missing` for the misorder, so a case cannot drift to a different error with the same code.

## Checks from "Check before you publish"

### 1. The misorder error

File: `experiments/misorder/profile-before-users.ts`. It composes
`withFeature((store) => withProfile(store))` first, then `withUsers()`, then `withRoles`.

```
19-split-store-features/experiments/misorder/profile-before-users.ts(7,38): error TS2345: Argument of type '{ [STATE_SOURCE]: {}; }' is not assignable to parameter of type 'ProfileSource'.
  Property '_selectedUser' is missing in type '{ [STATE_SOURCE]: {}; }' but required in type 'ProfileSource'.
```

The error points at the `store` argument on the `withFeature` line. At that line `store` holds only
the state source, because no feature above it adds members. It is TS2345, not an overload error,
because the call that fails is `withProfile(store)` inside the factory.

Status: pass.

### 2. The `_` member on and off the public type

Off the public type: `experiments/private/public-read.ts` reads `store._selectedUser()` on
`DirectoryStoreInstance`.

```
19-split-store-features/experiments/private/public-read.ts(4,16): error TS2551: Property '_selectedUser' does not exist on type '{ users: Signal<User[]>; selectedUserId: Signal<number | null>; usersCallState: DeepSignal<{ error: string; }> | Signal<"init" | "loading" | "loaded">; ... 16 more ...; loadProfile: RxMethod<...>; } & StateSource<...>'. Did you mean 'selectedUserId'?
```

On the type inside a feature: `directory.store.ts` passes `store` to `withProfile`, whose source type
is `Pick<UsersFeatureResult['props'], '_selectedUser'>`. It compiles with `tsc`, `ngc` and `ng build`.

In the built package, `dist/store-features/types/store-features.d.ts` has `_selectedUser` in the
return type of `withUsers` (line 77) and in `ProfileSource` (line 106). The `DirectoryStore` type,
from line 125, does not have it. The spec "leaves _selectedUser out of the public type" checks the
same with `expectTypeOf`.

At runtime the member is still on the instance. The spec "still puts _selectedUser on the instance at
runtime" passes. `signalStore` copies every key of the state signals, props and methods onto the
instance (`node_modules/@ngrx/signals/fesm2022/ngrx-signals.mjs`, line 423):

```js
for (const key of Reflect.ownKeys(storeMembers)) {
```

Status: pass. The privacy is a type, not a runtime guard.

### 3. The `withFeature` and `signalStore` d.ts lines

Source: `node_modules/@ngrx/signals/types/ngrx-signals.d.ts`.

Line 456, `withFeature`. The factory receives the input members as they are, with no `OmitPrivate`:

```ts
declare function withFeature<Input extends SignalStoreFeatureResult, Output extends SignalStoreFeatureResult>(featureFactory: (store: Prettify<StateSignals<Input['state']> & Input['props'] & Input['methods'] & WritableStateSource<Input['state']>>) => SignalStoreFeature<Input, Output>): SignalStoreFeature<Input, Output>;
```

Line 269, the members of the store instance, with `OmitPrivate`:

```ts
type SignalStoreMembers<FeatureResult extends SignalStoreFeatureResult> = Prettify<OmitPrivate<StateSignals<FeatureResult['state']> & FeatureResult['props'] & FeatureResult['methods']>>;
```

Lines 12 to 14 define `OmitPrivate`:

```ts
type OmitPrivate<T> = {
    [K in keyof T as K extends `_${string}` ? never : K]: T[K];
};
```

Every `signalStore` overload (lines 270 to 329) returns
`Type<SignalStoreMembers<R> & StateSource<Prettify<OmitPrivate<R['state']>>>>`, so private state keys
are also dropped from the public state type.

Status: pass. The line numbers match the brief.

### 4. `SignalStoreFeatureType` on a factory with a parameter

Line 264 of the same d.ts:

```ts
type SignalStoreFeatureType<Feature extends (...params: never[]) => unknown> = ReturnType<Feature> extends SignalStoreFeature<infer Input, infer Output> ? SignalStoreFeatureResult extends Input ? Output : Input & Output : never;
```

The constraint `(...params: never[]) => unknown` accepts a function with any parameters.
`experiments/feature-type/derived-from-parameterized.ts` checks that
`SignalStoreFeatureType<typeof withRoles>` has the state keys `roles` and `rolesCallState`, the props
`rolesLoading`, `rolesLoaded` and `rolesError`, and the method `loadRoles`. It compiles.

A hand-written `RolesFeatureResult` as the return type,
`SignalStoreFeature<EmptyFeatureResult, RolesFeatureResult>`, also compiles
(`experiments/feature-type/annotated-parameterized.ts`).

The derived type cannot be the return type of the same factory:

```
19-split-store-features/experiments/feature-type/derived-as-own-return.ts(6,4): error TS2577: Return type annotation circularly references itself.
```

Status: pass. Both forms work. The code in `src` derives all three result types with
`SignalStoreFeatureType<typeof withX>` and leaves the factories unannotated.

### 5. Hand-written result types that drift from the feature

Claims a member the feature does not have, feature annotated with it
(`experiments/hand-written/annotated-claims-more.ts`). It fails inside the feature file, at
`return withProfile(source)`:

```
19-split-store-features/experiments/hand-written/annotated-claims-more.ts(23,3): error TS2322: Type 'SignalStoreFeature<EmptyFeatureResult, { state: { profile: Profile | null; profileCallState: CallState; }; props: { profileLoading: Signal<boolean>; profileLoaded: Signal<...>; profileError: Signal<...>; }; methods: { ...; }; }>' is not assignable to type 'SignalStoreFeature<EmptyFeatureResult, ProfileFeatureResult>'.
  ...
          Property 'isProfileStale' is missing in type '{ profileLoading: Signal<boolean>; profileLoaded: Signal<boolean>; profileError: Signal<string | null>; }' but required in type '{ isProfileStale: Signal<boolean>; }'.
```

Claims a member, feature not annotated (`experiments/hand-written/unannotated-claims-more.ts`). The
feature and the reaction function compile. The error shows where the reaction gets the real store,
in `onInit`:

```
19-split-store-features/experiments/hand-written/unannotated-claims-more.ts(30,28): error TS2345: Argument of type '{ users: Signal<User[]>; selectedUserId: Signal<number | null>; usersCallState: DeepSignal<{ error: string; }> | Signal<"init" | "loading" | "loaded">; ... 6 more ...; [STATE_SOURCE]: { ...; }; }' is not assignable to parameter of type 'Pick<{ usersLoading: Signal<boolean>; usersLoaded: Signal<boolean>; } & { usersError: Signal<string | null>; } & { _selectedUser: Signal<User | null>; selectedUserName: Signal<...>; }, "selectedUserName">'.
  Property 'selectedUserName' is missing in type '{ users: Signal<User[]>; ... }' but required in type 'Pick<...>'.
```

The second line above is shortened. The runner prints the full text with `--keep` and a direct `tsc`
run on `experiments/out/cases/claims-unannotated/tsconfig.json`.

Omits a member, feature annotated with it (`experiments/hand-written/annotated-omits-member.ts`). It
compiles. The omitted method `selectUser` drops out of the store type: the file assigns `true` to
`'selectUser' extends keyof InstanceType<typeof UsersStore> ? false : true`, and that compiles. The
annotation changes only the type, so the instance still has `selectUser` at runtime. That last point is
read from the code, not run.

Omits a member, feature not annotated: no runner case. Nothing reads the missing member, so nothing
can fail.

Status: pass.

### 6. The isolated spec with a fake source

`src/lib/directory/features/with-roles.spec.ts` builds `signalStore(withRoles({ selectedUserId }))`
with `selectedUserId = signal<number | null>(7)` and `FakeUserService`. Four tests: it loads the roles
of user 7, sends no request when the source holds `null`, drops the answer for a user that is no longer
selected, and records an error.

Status: pass.

### 7. Declaration emit on the whole store

Runner cases with `tsc` (`declaration: true`) and `ngc` on `src/lib/directory/directory.store.ts`, and
`ng build store-features` with ng-packagr. All clean. The two runner cases are clean in strict and
non-strict mode. `ng build` ran only with this folder's strict config.

The store and the reaction functions refer to each other. `directory.store.ts` calls
`reloadRolesOnUserChange` and `reloadProfileOnUserChange` in `onInit`, and those files take
`Pick<DirectoryStoreInstance, ...>` with `import type` from `directory.store.ts`. None of the three
compilers reports a circular type.

Status: pass.

### 8. The three failing routes from 07

Measured in [07-call-state-feature/RESULTS.md, check 10](../07-call-state-feature/RESULTS.md#10-splitting-a-store).
The runner here compiles the same 07 files again, now also with `strict: true`, which 07 did not use.

| Route | 07 file | Result here |
|-|-|-|
| Hand-typed `withMethods` factory without `WritableStateSource` | `experiments/split/hand-typed-plain.ts` | TS2345 |
| Two input-typed features in one store | `experiments/split/combined-input.ts` | TS2769 |
| The docs' unused generic `<_>` | `experiments/split/combined-unused-generic.ts` | `@typescript-eslint/no-unused-vars` |

Status: pass. The three results hold in strict and non-strict mode.

## Findings the plan does not mention

1. The `_` prefix hides a member from the type only. The instance still has it at runtime (check 2).
2. A reaction written with a plain `effect()` tracks what the called method reads. `rxMethod` called
   with a plain value runs `source$.next(input)` with no `untracked`
   (`fesm2022/ngrx-signals-rxjs-interop.mjs`, lines 52 and 53). So
   `effect(() => { store.selectedUserId(); store.loadProfile() })` also tracks `_selectedUser`
   through the `map` in `loadProfile`, and a users refresh with new objects loads the profile again.
   `signalMethod` runs its function in `untracked` (`fesm2022/ngrx-signals.mjs`, line 135). The
   reaction functions here use `signalMethod`. The first mutation in "The specs can fail" shows the
   difference.
3. In the first build of this folder the profile did not load for a user selected before the users
   list arrived: `loadProfile` reads `_selectedUser`, which is `null` until the users arrive, and the
   reaction watched only `selectedUserId`. Fixed in the review round: `reloadProfileOnUserChange` is
   typed from the feature results, `Pick<UsersFeatureResult['props'], '_selectedUser'> &
   Pick<ProfileFeatureResult['methods'], 'clearProfile' | 'loadProfile'>`, and watches
   `computed(() => store._selectedUser()?.id ?? null)`. It fires when the user becomes resolvable
   and stays quiet when a users refresh returns copies. `onInit` hands the hook the full store,
   private members included, so the call compiles. Spec: "loads the profile once the users arrive
   for a user selected before".
4. In the first build, a switch from one user to another left the previous user's roles and profile
   in the store, with the call state `loading`, until the new answer arrived. Fixed in the review
   round: both reactions call `clearRoles()` or `clearProfile()` before the load, so a switch drops
   the old data, while a direct `loadRoles()` for the same user keeps it on screen. Specs: "drops the
   old roles and profile while another user loads" and "keeps the old roles on screen while a refresh
   for the same user loads".
5. A reaction typed with the public store type cannot call `patchState`. The public type is a
   read-only `StateSource`, and `patchState` needs a `WritableStateSource`:

   ```
   19-split-store-features/experiments/reaction/patch-public-store.ts(5,14): error TS2345: Argument of type '{ users: Signal<User[]>; ... } & StateSource<...>' is not assignable to parameter of type 'WritableStateSource<{ users: User[]; ... }>'.
     The types of '[STATE_SOURCE].users' are incompatible between these types.
       Type 'Signal<User[]>' is missing the following properties from type 'WritableSignal<User[]>': set, update, asReadonly, [ɵWRITABLE_SIGNAL]
   ```

   The first line above is shortened. The reactions here call a method of the other feature instead.
   A reaction that needs a private member is typed from the feature results instead
   (`reload-profile-on-user-change.ts`), because the public store type has no `_` members and
   `onInit` hands the full store.
6. A `Pick` of the store type makes the fake in a reaction spec harder. `loadProfile` is
   `RxMethod<void>`, so `Object.assign(vi.fn(), { destroy: vi.fn() })` fails with TS2322:
   `Type 'unknown' is not assignable to type 'RxMethodRef'`. `src/lib/directory/testing/fake-rx-method.ts`
   returns `{ destroy }` from each call.
7. Roles have to follow a user change too, and the plan has only `reloadProfileOnUserChange`. This
   folder adds `reloadRolesOnUserChange`, and `onInit` calls both.
8. The `profile` state signal (`Profile | null`) is emitted as
   `DeepSignal<Profile> | Signal<null>`, the same shape as 07 finding 5.

## Plan claims that turned out false

1. "The isolated spec builds a two-feature store with a fake source." The snippet under that line,
   `signalStore(withRoles({ selectedUserId }))`, is a store with one feature. Beat 7 says "a two-line
   `signalStore`", which matches the snippet.
2. The plan's `export type RolesSource = { selectedUserId: Signal<number | null> }` fails the repo
   lint with `@typescript-eslint/consistent-type-definitions` (mutation check above). The code here
   uses interfaces.
3. Beat 6: "a reaction that reads one feature and patches another". With state per feature and the
   reaction typed from the public store, it cannot patch (finding 5). It calls a method of the other
   feature.
4. From the task brief: a hand-written result type that claims a missing member "fails at the effect
   call with the real store". That holds only when the feature has no return type. With
   `SignalStoreFeature<EmptyFeatureResult, XFeatureResult>` on the feature, it fails at the feature's
   `return` with TS2322 (check 5).

Claims that held: the misorder does not compile, `withFeature` hands private members to the factory,
`signalStore` drops them from the public type, the d.ts lines 456 and 269,
`SignalStoreFeatureType` on a factory with a parameter, a feature tested alone with a fake source,
clean declaration emit for the whole store, and the three failing routes from 07.

## Deviations from the plan's code

- `RolesSource` and the state shapes are interfaces, not object type aliases (lint).
- `loadRoles` and `loadProfile` read the source once with `map`, then
  `filter((userId) => userId !== null)`. TypeScript 5.5 and later infer the type guard, so the code
  needs no `source.selectedUserId()!`.
- `onInit` calls two reactions, not one (finding 7).
- `Profile` is `{ userId, email }`. `User` is `{ id, name }`.

## Checks not run

- The live NgRx docs page (https://ngrx.io/guide/signals/signal-store/custom-store-features,
  "Using withFeature" and "Known TypeScript Issues"). It needs the network, and this run checked
  only what runs locally.
- The prior art: NgRx discussion #4236, issue #4272 and PR #4441 (July 2024). Same reason.
- An ordering constraint between two reactions, kept in a test (beat 6). The two reactions here do
  not depend on each other, so there was nothing to test.
- The baseline gates at 7e1d7f2 and the gates of the other projects.
