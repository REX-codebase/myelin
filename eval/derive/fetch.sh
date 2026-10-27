#!/usr/bin/env sh
# Fetch what the derive benchmark needs. Usage: sh eval/derive/fetch.sh [dir]   (default .derive)
#
#   project/  the libraries the bundled ledgers target, at their exact versions, installed from
#             eval/derive/package-lock.json (about 1 GB). This is the only thing installed.
#   apps/     two real open-source apps, pinned to a commit. Their SOURCE is read as text; their
#             dependencies are never installed and none of their code runs.
#   wild/     the official example corpora from eval/wild/fetch.sh.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="${1:-.derive}"
mkdir -p "$DIR/project" "$DIR/apps"

if [ ! -d "$DIR/project/node_modules" ]; then
  cp "$HERE/package.json" "$HERE/package-lock.json" "$DIR/project/"
  (cd "$DIR/project" && npm ci --ignore-scripts --no-audit --no-fund --legacy-peer-deps --loglevel=error)
fi

at() { # repo sha dest
  [ -d "$3/.git" ] && return 0
  mkdir -p "$3" && (cd "$3" && git init -q && git remote add origin "https://github.com/$1" && git fetch -q --depth 1 origin "$2" && git checkout -q FETCH_HEAD)
}
at shadcn-ui/taxonomy 298a8857c7128a0d121e7f699dfd729f23b3966d "$DIR/apps/taxonomy"
at vercel/ai-chatbot  c2f8235e1f3ea903ad8b7f61447c4f74164b5c58 "$DIR/apps/ai-chatbot"

sh "$HERE/../wild/fetch.sh" "$DIR/wild"
echo "derive benchmark inputs ready in $DIR"
