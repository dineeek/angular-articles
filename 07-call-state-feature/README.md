# 07: a call state feature for signalStore

Companion code for the article "I put request data inside the union. signalStore changed my mind".
It follows up on [Prefer Valid State Types in TypeScript](https://blog.stackademic.com/valid-state-types-in-typescript-65c18a414d3c) (2024).

Angular 22.2, @ngrx/signals 22.0, @ngrx/operators 22.0, TypeScript 6.0, Vitest.

## What is here

| Path | What it shows |
|-|-|
| `src/lib/call-state/with-call-state.ts` | `withCallState()` for one request, `withCallState({ collection })` and `withCallState({ collections })`, with `setLoading`, `setLoaded` and `setError` |
| `src/lib/users/users.store.ts` | The `UsersStore` from the 2024 article, ported to signalStore with `rxMethod` and `tapResponse` |
| `src/lib/users/users-list.ts` | A list that keeps the old users on screen while a refresh loads |
| `src/lib/profile/profile.store.ts` | A profile store whose state field does not collide with the derived `profileError` |
| `src/lib/split/` | One store split into `withUsers` and `withRoles`, composed with `withFeature` |
| `experiments/` | Cases that fail on purpose: the name collision, two input-typed features, a hand-typed methods factory, and a feature return type behind a custom alias |
| `RESULTS.md` | What each check found, with the exact error text |

## Run it

From the repository root:

```bash
pnpm install
pnpm ng build call-state
pnpm ng test call-state --watch=false
pnpm ng lint call-state
node 07-call-state-feature/experiments/run.mjs
```

The last command runs every experiment and compares it with the result it should give.
Add `--keep` to keep the compiler output in `experiments/out`.

The experiments stay out of the library build and the default test run.
The lint run skips only the two `*-unused-generic.ts` files, because they exist to show the lint error.
