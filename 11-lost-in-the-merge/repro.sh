#!/usr/bin/env bash
# Usage: ./repro.sh [base-dir]   (default base-dir: /tmp/angular-articles-11)
set -euo pipefail

base_dir="${1:-/tmp/angular-articles-11}"
mkdir -p "$base_dir"
demo_dir="$(mktemp -d "$base_dir/demo.XXXXXX")"

export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_NOSYSTEM=1
export GIT_PAGER=cat
export GIT_AUTHOR_NAME='Demo Author'
export GIT_AUTHOR_EMAIL='demo@example.com'
export GIT_COMMITTER_NAME='Demo Author'
export GIT_COMMITTER_EMAIL='demo@example.com'

clock=0

tick() {
  clock=$((clock + 60))
  export GIT_AUTHOR_DATE="@$((1767261600 + clock)) +0000"
  export GIT_COMMITTER_DATE="$GIT_AUTHOR_DATE"
}

step() {
  printf '\n$ %s\n' "$1"
  eval "$1"
}

git --version
echo "demo repo: $demo_dir"
cd "$demo_dir"

git init -q -b main .
printf 'line1\n<old-template/>\n' > page.html
git add page.html
tick
git commit -qm base

git checkout -qb upgrade
printf 'line1\n<old-template upgraded/>\n' > page.html
tick
git commit -qam 'upgrade side'

git checkout -q main
printf 'line1\n<old-template/>\n<new-popover/>\n' > page.html
tick
git commit -qam 'feature: add popover'

git checkout -q upgrade
step 'git merge main || true'
git checkout -q --ours page.html
git add page.html
tick
git commit -qm 'merge main into upgrade'

merge="$(git rev-parse --short HEAD)"

step 'git log --oneline --graph --all'
step 'cat page.html'
step 'git log --oneline -- page.html'
step 'git log --oneline -S"new-popover" -- page.html'
step 'git log --oneline -m -S"new-popover" -- page.html'
step 'git show --remerge-diff HEAD -- page.html'
step "git diff $merge^1 $merge -- page.html"
step "git diff $merge^2 $merge -- page.html"
