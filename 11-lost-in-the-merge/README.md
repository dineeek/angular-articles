# 11. Lost in the merge

Companion code for "How one merge deleted shipped features and every check stayed green" (coming soon).

A merge can throw away template code while every check stays green. This folder shows how that happens in git, what the Angular compiler catches and what it misses, and a small script that finds mismatches between templates and classes.

The code in `cases/` is invented: a bookshop admin area. `src/` is the generated Angular starter app.

## What is here

| Path | What it shows |
|-|-|
| `repro.sh` | A merge that keeps one side of a conflict and drops a line from main. Prints the `git log`, `git show --remerge-diff` and `git diff` commands that find it |
| `cases/broken/` | Four shapes a bad merge leaves behind: a signal read without `()`, a method called by an old name, outputs bound under old names, a guard that lost its ownership check |
| `cases/fixed/` | The same components, repaired |
| `cases/tsconfig.*.json` | Compiler settings to compare: `strictTemplates` on and off, TypeScript `strict` on and off |
| `scripts/check-compiler.sh` | Runs `ngc` on each config, then builds the broken cases with AOT and with JIT |
| `scripts/find-template-mismatches.ts` | Reports template reads the class lacks, class members nothing reads, signals used without `()`, and outputs that do not exist |
| `RESULTS.md` | The measured output of every check |

`cases/` and `scripts/` are outside the app's default build and test, so `ng build`, `ng test` and `ng lint` stay green.

## Run it

From this folder, after `pnpm install` at the repo root:

```bash
./repro.sh                                        # demo repo under /tmp/angular-articles-11/
./scripts/check-compiler.sh                       # ngc per config, then AOT and JIT builds
node scripts/find-template-mismatches.ts cases    # 8 hits, all in cases/broken
node scripts/find-template-mismatches.ts src      # 0 hits
```

`repro.sh` takes an optional folder for the demo repo. Every run creates a new one and deletes nothing.

## What to take away

- Review a conflicted merge with three commands: `git show --remerge-diff <merge>`, `git diff <merge>^1 <merge> -- <path>` and `git diff <merge>^2 <merge> -- <path>`.
- `git log -S"<text>" -- <path>` skips merges. Add `-m` to see them.
- A JIT build (`aot: false`) did not catch these template errors, even with `strictTemplates: true`.
- With `strictTemplates: true`, a binding to an output the child no longer has still compiles. Angular treats it as a DOM event.
- A dropped `[input]` binding with a literal value leaves no trace in the template or the class. Neither does a guard that lost a condition. Only a test of the denied case catches that.
