#!/usr/bin/env sh
# Fetch what the derive benchmark needs. Usage: sh eval/derive/fetch.sh [dir]   (default .derive)
#
#   project/  the libraries the bundled ledgers target, at their exact versions, installed from
#             eval/derive/package-lock.json (about 1 GB). This is the only thing installed.
#   apps/     five real open-source code bases, each pinned to a commit. Their SOURCE is read as text; their
#             dependencies are never installed and none of their code runs.
#   wild/     the official example corpora from eval/wild/fetch.sh.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:-.derive}"
mkdir -p "$DIR/project" "$DIR/apps"

[ -f "$DIR/project/package.json" ] || cp "$HERE/package.json" "$HERE/package-lock.json" "$DIR/project/"
if [ ! -d "$DIR/project/node_modules" ]; then
  (cd "$DIR/project" && npm ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps --loglevel=error)
fi

at() { # repo sha dest [sparse pattern]: a single commit, optionally only part of the tree
  [ -d "$3/.git" ] && return 0
  mkdir -p "$3" && (
    cd "$3" && git init -q && git remote add origin "https://github.com/$1"
    if [ -n "$4" ]; then
      git sparse-checkout set --no-cone "$4"
      git fetch -q --depth 1 --filter=blob:none origin "$2"
    else
      git fetch -q --depth 1 origin "$2"
    fi
    git checkout -q FETCH_HEAD
  )
}
at shadcn-ui/taxonomy 298a8857c7128a0d121e7f699dfd729f23b3966d "$DIR/apps/taxonomy"
at vercel/ai-chatbot  c2f8235e1f3ea903ad8b7f61447c4f74164b5c58 "$DIR/apps/ai-chatbot"
at shadcn-ui/ui       96da9cc7f1aa10580a3741664e2a77c721206c00 "$DIR/apps/shadcn-ui" '/apps/v4/registry/**'
at TanStack/query     2941a23d57969b85cd562036f5cf23c7dd2d5cb1 "$DIR/apps/tanstack-query" '/examples/react/**'
at openai/openai-node 60224b376e25912bb1143007c81d2ecdc7a7434c "$DIR/apps/openai-node" '/examples/**'

sh "$HERE/../wild/fetch.sh" "$DIR/wild"
echo "derive benchmark inputs ready in $DIR"
