#!/usr/bin/env sh
# Fetch the "in the wild" corpora: official example code from upstream repos, old tag vs current tag.
# Sparse, shallow clones; about 60 MB total. Usage: sh eval/wild/fetch.sh [dir]
set -e
DIR="${1:-.wild}"
mkdir -p "$DIR" && cd "$DIR"
sc() { [ -d "$3" ] || { git clone -q --depth 1 --filter=blob:none --sparse -b "$2" "https://github.com/$1" "$3" && (cd "$3" && git sparse-checkout set --no-cone "$4"); }; }
sc mrdoob/three.js r150    three-r150 '/examples/*.html'
sc mrdoob/three.js r186    three-r186 '/examples/*.html'
sc vercel/next.js  v14.2.0 next-14    '/examples/**'
sc vercel/next.js  v16.4.3 next-16    '/examples/**'
echo "corpora ready in $DIR"
