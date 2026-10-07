# Results

Measured on 2026-10-07 on macOS. Base commit 4dda0c8, with this folder's new files uncommitted.

| Tool | Version |
|-|-|
| git | 2.45.0 |
| Node | 24.15.0 |
| pnpm | 10.33.0 |
| @angular/compiler-cli | 22.2.1 |
| @angular/build | 22.2.2 |
| @schematics/angular | 22.2.2 |
| TypeScript | 6.0.3 |

All commands run from `11-lost-in-the-merge/` unless the command starts with `corepack`. Those run from the repo root.

## 1. Git repro

Command: `./repro.sh`. Every run creates a new demo repo under `/tmp/angular-articles-11/` (or the folder you pass) and deletes nothing. Dates and author are fixed, so two runs printed the same output apart from the demo path.

```text
git version 2.45.0
demo repo: /tmp/angular-articles-11/demo.PIuyLI

$ git merge main || true
Auto-merging page.html
CONFLICT (content): Merge conflict in page.html
Automatic merge failed; fix conflicts and then commit the result.

$ git log --oneline --graph --all
*   1135a2a merge main into upgrade
|\
| * 74bd856 feature: add popover
* | 66bc4db upgrade side
|/
* 0de828f base

$ cat page.html
line1
<old-template upgraded/>

$ git log --oneline -- page.html
66bc4db upgrade side
0de828f base

$ git log --oneline -S"new-popover" -- page.html

$ git log --oneline -m -S"new-popover" -- page.html
1135a2a (from 74bd856) merge main into upgrade
74bd856 feature: add popover

$ git show --remerge-diff HEAD -- page.html
commit 1135a2a0ff832eb1eb0026b05ce2ea01d2b8bfe6
Merge: 66bc4db 74bd856
Author: Demo Author <demo@example.com>
Date:   Thu Jan 1 10:04:00 2026 +0000

    merge main into upgrade

diff --git a/page.html b/page.html
remerge CONFLICT (content): Merge conflict in page.html
index 7c63593..1ce2b06 100644
--- a/page.html
+++ b/page.html
@@ -1,7 +1,2 @@
 line1
-<<<<<<< 66bc4db (upgrade side)
 <old-template upgraded/>
-=======
-<old-template/>
-<new-popover/>
->>>>>>> 74bd856 (feature: add popover)

$ git diff 1135a2a^1 1135a2a -- page.html

$ git diff 1135a2a^2 1135a2a -- page.html
diff --git a/page.html b/page.html
index 563b039..1ce2b06 100644
--- a/page.html
+++ b/page.html
@@ -1,3 +1,2 @@
 line1
-<old-template/>
-<new-popover/>
+<old-template upgraded/>
```

| Check | Result | Pass |
|-|-|-|
| `git log -- page.html` hides the merge and the feature commit | Lists only `upgrade side` and `base` | pass |
| `git log -S"new-popover"` hides the merge | Prints nothing | pass |
| `git log -m -S"new-popover"` shows the merge and the feature commit | Prints both. The merge line says `(from 74bd856)`: git diffed it against the second parent | pass |
| `git show --remerge-diff` shows the conflict fix dropping main's lines | Shows `<new-popover/>` removed from the conflict | pass |
| `git diff M^1 M` | Empty. The merge changed nothing on the upgrade side, so a review of the branch diff shows nothing | pass |
| `git diff M^2 M` | Shows `<new-popover/>` as removed: what main had that the merge result lacks | pass |
| Safe to rerun | Second run created a new folder, output identical apart from the path | pass |

The `|\` and `|/` lines carry two trailing spaces in the raw output. They are trimmed above.

## 2. Compiler checks with ngc

Command: `./scripts/check-compiler.sh`. It runs `corepack pnpm exec ngc -p cases/tsconfig.<name>.json` for each config below, then the two builds in section 3. Every config extends the repo root `tsconfig.json`.

The broken cases in `cases/broken/`:

| Case | Shape |
|-|-|
| `book-options` (templateUrl) | `@if (loadingOptions)` where `loadingOptions = signal(true)` |
| `book-list` (inline) | Template calls `reloadBooks()` at the top level and `removeBook(book)` inside `@for`. The class has `reload()` and `deleteBook()` |
| `book-shelf` (inline) | Binds `(bookArchived)="loadBooks()"` and `(bookRemoved)="removeBook($event)"`. The child `BookRow` renamed them to `archived` and `removed`. Also dropped `[showPrice]="true"` and `[canArchive]="canArchive()"` |
| `book-actions` (templateUrl) | Guard `@if (canEdit)` lost `&& (book.isOwner \|\| book.isSharedWithMe)`. Illustration only |

| Config | TS `strict` | `strictTemplates` | `reloadBooks()` top level | `removeBook()` in `@for` | `@if (loadingOptions)` | `(bookArchived)="loadBooks()"` | `(bookRemoved)="removeBook($event)"` | Exit |
|-|-|-|-|-|-|-|-|-|
| `default` | on (TS 6 default) | not set | TS2339 | TS2339 | TS2774 error, NG8109 warning | silent | TS2345 | 1 |
| `strict` | on | true | TS2339 | TS2339 | TS2774 error, NG8109 warning | silent | TS2345 | 1 |
| `loose` | on | false | TS2339 | silent | TS2774 error | silent | silent | 1 |
| `ng-new-no-strict` | off | false | TS2339 | silent | silent | silent | silent | 1 |
| `strict-templates-only` | off | true | TS2339 | TS2339 | NG8109 warning | silent | TS2345 | 1 |
| `signal-warning` (book-options only) | off | true | n/a | n/a | NG8109 warning | n/a | n/a | 0 |
| `signal-error` (book-options only) | off | true, check set to error | n/a | n/a | NG8109 error | n/a | n/a | 1 |
| `fixed` (`cases/fixed/`) | on | true | clean | clean | clean | clean | clean | 0 |

The guard case produced no diagnostic in any config. Both versions are valid templates.

`ng-new-no-strict` holds the two settings `ng new --strict=false` writes (`"strict": false`, `"strictTemplates": false`).

Exact diagnostic lines (colors stripped):

```text
=== ngc -p cases/tsconfig.default.json
broken/book-list.ts:7:36 - error TS2339: Property 'reloadBooks' does not exist on type 'BookList'.
broken/book-list.ts:12:42 - error TS2339: Property 'removeBook' does not exist on type 'BookList'.
broken/book-options.html:1:6 - error TS2774: This condition will always return true since this function is always defined. Did you mean to call it instead?
broken/book-shelf.ts:15:39 - error TS2345: Argument of type 'Event' is not assignable to parameter of type 'Book'.
broken/book-options.html:1:6 - warning NG8109: NG8109: loadingOptions is a function and should be invoked: loadingOptions()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109
exit 1

=== ngc -p cases/tsconfig.strict.json
(same five lines as default)
exit 1

=== ngc -p cases/tsconfig.loose.json
broken/book-list.ts:7:36 - error TS2339: Property 'reloadBooks' does not exist on type 'BookList'.
broken/book-options.html:1:6 - error TS2774: This condition will always return true since this function is always defined. Did you mean to call it instead?
exit 1

=== ngc -p cases/tsconfig.ng-new-no-strict.json
broken/book-list.ts:7:36 - error TS2339: Property 'reloadBooks' does not exist on type 'BookList'.
exit 1

=== ngc -p cases/tsconfig.strict-templates-only.json
broken/book-list.ts:7:36 - error TS2339: Property 'reloadBooks' does not exist on type 'BookList'.
broken/book-list.ts:12:42 - error TS2339: Property 'removeBook' does not exist on type 'BookList'.
broken/book-shelf.ts:15:39 - error TS2345: Argument of type 'Event' is not assignable to parameter of type 'Book'.
broken/book-options.html:1:6 - warning NG8109: NG8109: loadingOptions is a function and should be invoked: loadingOptions()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109
exit 1

=== ngc -p cases/tsconfig.signal-warning.json
broken/book-options.html:1:6 - warning NG8109: NG8109: loadingOptions is a function and should be invoked: loadingOptions()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109
exit 0

=== ngc -p cases/tsconfig.signal-error.json
broken/book-options.html:1:6 - error NG8109: NG8109: loadingOptions is a function and should be invoked: loadingOptions()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109
exit 1

=== ngc -p cases/tsconfig.fixed.json
exit 0
```

The stray `}` after `loadingOptions()` is in Angular's own message template (`node_modules/@angular/compiler-cli/bundles/chunk-VMCGORHB.js:3171`). Quote it as printed or drop it.

| Question | Answer | Pass |
|-|-|-|
| With `strictTemplates: true`, does ngc warn on `@if (loadingOptions)`? | Yes, warning `NG8109` (`interpolatedSignalNotInvoked`). With TS `strict` on, the same line also gets error `TS2774` | pass |
| With `strictTemplates: false`, is it silent? | Only when TS `strict` is off, or when the `@if` sits inside another block. With TS 6 defaults, a top-level `@if (loadingOptions)` fails with `TS2774` | fail (plan claim) |
| NG8109 is a warning unless set to error | Warning alone exits 0. `extendedDiagnostics.checks.interpolatedSignalNotInvoked: "error"` makes it an error, exit 1 | pass |
| NG8109 runs only with `strictTemplates` on | Absent in `loose` and `ng-new-no-strict`. Source: `chunk-VMCGORHB.js:4743` runs the extended checks only when `this.strictTemplates` is true | pass |
| With `strictTemplates: true`, does an unknown output on a component element pass silently? | Yes for `(bookArchived)="loadBooks()"`. Angular treats the name as a DOM event (`checkUnclaimedEventNames: false`, `chunk-VMCGORHB.js:5060`). It fails only when `$event` (typed `Event`) flows into an incompatible parameter: `TS2345` for `removeBook($event)` | pass |
| Does a missing method call fail in each mode? | Top level: `TS2339` in every mode. Inside `@for`: `TS2339` only with `strictTemplates` on. Loose mode skips block bodies (`checkControlFlowBodies: false`, `chunk-VMCGORHB.js:5082`) | pass |

Two throwaway probes in `/tmp/angular-articles-11/probe-nested/` (not part of this folder), same root tsconfig:

| Probe template | Config | Result |
|-|-|-|
| `@if (isOpen()) { @if (loadingOptions) { ... } }` | `strictTemplates: false`, TS `strict` on | silent, exit 0 |
| same | `strictTemplates: true` | `TS2774` error and `NG8109` warning, exit 1 |
| `@if (isOpen() && loadingOptions) { ... }` | `strictTemplates: true`, TS `strict` on | `TS2774` only, no `NG8109`, exit 1 |
| same | `strictTemplates: true`, TS `strict` off | silent, exit 0 |

NG8109 checks an `@if` condition only when the whole condition is the signal or `!signal` (`chunk-VMCGORHB.js:3104-3108`). A compound condition escapes it.

## 3. Build path: AOT and JIT

Commands (run by `check-compiler.sh`), with CLI overrides and no change to `angular.json`:

```bash
corepack pnpm exec ng build lost-in-the-merge --aot=true \
  --browser=11-lost-in-the-merge/cases/broken/main.ts \
  --ts-config=11-lost-in-the-merge/cases/tsconfig.build.json \
  --output-path=/tmp/angular-articles-11/dist-aot-true
# same with --aot=false and dist-aot-false
```

`tsconfig.build.json` sets `strictTemplates: true`.

```text
=== ng build lost-in-the-merge --aot=true (cases/broken, strictTemplates: true)
Application bundle generation failed.
▲ [WARNING] NG8109: NG8109: loadingOptions is a function and should be invoked: loadingOptions()}. Find more at https://v22.angular.dev/extended-diagnostics/NG8109 [plugin angular-compiler]
✘ [ERROR] TS2339: Property 'reloadBooks' does not exist on type 'BookList'. [plugin angular-compiler]
✘ [ERROR] TS2339: Property 'removeBook' does not exist on type 'BookList'. [plugin angular-compiler]
✘ [ERROR] TS2774: This condition will always return true since this function is always defined. Did you mean to call it instead? [plugin angular-compiler]
✘ [ERROR] TS2345: Argument of type 'Event' is not assignable to parameter of type 'Book'.
exit 1

=== ng build lost-in-the-merge --aot=false (cases/broken, strictTemplates: true)
Application bundle generation complete.
▲ [WARNING] bundle initial exceeded maximum budget. Budget 500.00 kB was not met by 458.05 kB with a total of 958.05 kB.
exit 0
```

| Check | Result | Pass |
|-|-|-|
| JIT build with `strictTemplates: true` reports zero template errors | Exit 0, only a budget warning | pass |
| Default `aot` for `@angular/build:application` | `true`: `node_modules/@angular/build/src/builders/application/schema.json:355-360` | pass |

## 4. Workspace defaults

| Check | Result | Evidence |
|-|-|-|
| Root `tsconfig.json` sets `strictTemplates` | No. It sets neither `strictTemplates` nor `strict` | `tsconfig.json` at 4dda0c8 |
| `ng new` template | Writes `"strict": false` and `"strictTemplates": false` only with `--strict=false`. With the default `--strict=true` it writes neither key | `node_modules/@schematics/angular/workspace/files/tsconfig.json.template:5-22` |
| Compiler default when `strictTemplates` is not set | On. `get strictTemplates() { return this.options.strictTemplates !== false }` | `node_modules/@angular/compiler-cli/bundles/chunk-VMCGORHB.js:5028-5034`. Measured: `default` config matches `strict` |
| `ng update` to 22 | Migration `strict-templates-default` adds `strictTemplates: false` to tsconfig files that do not set it | `node_modules/@angular/core/schematics/migrations.json:13-17` |
| TS 6 `strict` default | On when not set, so the root tsconfig runs with `strictNullChecks`. That is why `TS2774` fires | `typescript/lib/typescript.js`, option descriptions `true_unless_strict_is_false` |

So a new CLI 22 workspace has `strictTemplates` on. A workspace upgraded to 22 that never set the flag gets `strictTemplates: false` written into its tsconfig, and stays off.

## 5. Static check script

Command: `node scripts/find-template-mismatches.ts <dir-or-file>...`. It parses classes with the TypeScript compiler API, templates with `parseTemplate` from `@angular/compiler`, and resolves template locals (`@let`, `@for` items, `#refs`, `let-` variables) with `R3TargetBinder`. It reads inline templates and `templateUrl`. Exit code 1 when it finds a hit.

It reports four kinds. The plan asked for the first two. The last two are additions: they catch the two broken shapes the first two miss. Delete `signal-not-called` and `unknown-output` from the script to match the plan's two checks.

| Kind | Meaning |
|-|-|
| `missing-member` | The template reads a member the class does not declare |
| `unused-member` | The class declares a signal, computed or method that neither its template nor its class reads |
| `signal-not-called` (added) | A signal used as a value without `()` in an interpolation, `@if` or `@switch`, including inside `&&`, `\|\|`, `!` and ternaries |
| `unknown-output` (added) | An `(event)` on a component element from the scanned files that is neither an output of that component nor a DOM event |

`node scripts/find-template-mismatches.ts cases`:

```text
cases/broken/book-options.html:1  signal-not-called  loadingOptions: the template of BookOptions uses this signal as a value without calling it
cases/broken/book-list.ts:7  missing-member  reloadBooks: the template of BookList reads it, the class does not declare it
cases/broken/book-list.ts:12  missing-member  removeBook: the template of BookList reads it, the class does not declare it
cases/broken/book-list.ts:21  unused-member  reload: BookList declares this method, nothing in its template or class reads it
cases/broken/book-list.ts:25  unused-member  deleteBook: BookList declares this method, nothing in its template or class reads it
cases/broken/book-shelf.ts:14  unknown-output  (bookArchived) on <app-book-row>: BookRow has no output with this name, Angular binds it as a DOM event
cases/broken/book-shelf.ts:15  unknown-output  (bookRemoved) on <app-book-row>: BookRow has no output with this name, Angular binds it as a DOM event
cases/broken/book-shelf.ts:25  unused-member  canArchive: BookShelf declares this signal, nothing in its template or class reads it
8 hit(s) in 11 component(s)
```

| Run | Result | Pass |
|-|-|-|
| `cases` | 8 hits, all in `cases/broken/`, exit 1 | pass |
| `cases/fixed cases/shared` | `0 hit(s) in 6 component(s)`, exit 0 | pass |
| `src` (default app) | `0 hit(s) in 1 component(s)`, exit 0 | pass |
| `../01-template-check-matrix/src ../07-call-state-feature/src` | `0 hit(s) in 4 component(s)`, exit 0 | pass |
| Throwaway edge file (`@let`, `#ref`, `$any`, pipes, `track fn()`, `ng-template let-`, `@defer`, `@switch`, `this.x`, host bindings, `@HostListener`, inherited member, constructor parameter property, getter, `model()` two-way binding, output alias, `(click)` on a component) | 0 hits. A copy with five planted mistakes gave exactly those five hits | pass |

What each case gives:

| Case | Plan checks (missing, unused) | Added checks | Compiler |
|-|-|-|-|
| `book-options` signal as property | nothing | `signal-not-called` | NG8109 and TS2774 (see section 2) |
| `book-list` old method names | `missing-member` x2, `unused-member` x2 | nothing more | TS2339 |
| `book-shelf` old output names | nothing | `unknown-output` x2 | TS2345 for the `$event` one only |
| `book-shelf` dropped `[canArchive]="canArchive()"` | `unused-member canArchive` | nothing more | nothing |
| `book-shelf` dropped `[showPrice]="true"` | nothing | nothing | nothing |
| `book-actions` guard lost its ownership check | nothing | nothing | nothing |

Limits:

- A dropped `[input]` binding leaves no trace when the bound value is a literal or a member that something else still reads (`[showPrice]="true"`). It does leave a trace when the binding was the only reader of a parent signal or method (`canArchive`).
- A guard that loses a condition stays a valid template. Only a test that checks the denied case catches it.
- A method that another class calls (through `viewChild`, or a parent calling a public method) shows up as `unused-member`.
- Base classes must be in the scanned paths. If not, the script skips `missing-member` for that class and says so on stderr.
- Only `@Component` classes are checked. Directive host members are not.
- `unknown-output` knows only components in the scanned paths. An attribute directive on the same element with that output name would be a false hit.
- Confirm a hit with `git log -m -S"<identifier>" -- <file>`. Not run on `cases/`: the folder has no git history, and this task allowed no commits.
- The script is not type-checked: `@types/node` is not installed, and the ESLint config has no TypeScript project. `ng lint` lints it, and the runs above exercise it.

## 6. Gates

| Command | Result |
|-|-|
| `corepack pnpm exec ng build lost-in-the-merge` | pass, exit 0 |
| `corepack pnpm exec ng test lost-in-the-merge --watch=false` | pass, 1 file, 2 tests, exit 0 |
| `corepack pnpm exec ng lint lost-in-the-merge` | pass, "All files pass linting.", exit 0. Lints `cases/` and `scripts/` too |

`cases/` and `scripts/` sit outside `tsconfig.app.json` and `tsconfig.spec.json` (both include only `src/`), so the broken cases never reach the default build or test.

## 7. Plan claims that turned out false

1. "With the flag off, nothing reports it" (`@if (loadingOptions)`). False with TS 6 defaults. The `loose` config (`strictTemplates: false`, TS `strict` not set, so on) fails with `TS2774` at the top-level `@if`. The claim holds only with TS `strict: false` (`ng-new-no-strict` config, exit 1 only for `reloadBooks`) or when the `@if` sits inside another block (nested probe, exit 0).
2. "A dropped `[input]` binding on a parent template leaves neither trace." Partly false. Dropping `[canArchive]="canArchive()"` left `canArchive` unread, and the unused-member check flagged it. Dropping `[showPrice]="true"` left no trace.

Claims that hold but need care in the wording:

- "Angular warns" about `@if (loadingOptions)`: NG8109 is a warning, but with TS `strict` on, the same line is also error `TS2774`, so the AOT build fails. "Warns" understates it.
- NG8109 covers a bare signal (or `!signal`) as the whole `@if` condition. `@if (isOpen() && loadingOptions)` gets no NG8109.
- `strictTemplates: false` still type-checks top-level template expressions. A missing top-level method fails ngc with `TS2339` in every mode. Only expressions inside `@if`, `@for`, `@switch` and `ng-template` bodies go unchecked.
- `strictTemplates` lets an unknown output through, unless `$event` flows into a parameter that does not accept `Event` (`TS2345`).
- The plan's two static checks do not find the opening symptom (signal read as a property) or an output bound under an old name. Section 5 shows which check finds which case.
- "New Angular CLI workspaces turn `strictTemplates` on by default": true, but through the compiler default. The generated tsconfig has no `strictTemplates` key. `ng update` to 22 writes `strictTemplates: false` where the key is missing.

## 8. Not checked

- Angular 21.2 and compiler-cli 21.2.22: not installed here. Every result above is from 22.2.1.
- Nx workspace defaults: Nx is not installed in this repo.
- Runtime behavior of the broken cases in a browser (the endless loading text, the TypeError, the missed refresh). Only static checks and builds ran.
