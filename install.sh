#!/bin/sh
# Myelin installer for macOS, Linux and WSL.
#
#   curl -fsSL https://raw.githubusercontent.com/REX-codebase/myelin/main/install.sh | sh
#
# Installs the latest published release into $MYELIN_HOME/app (default
# ~/.myelin/app) and a small launcher at $MYELIN_BIN/myelin (default
# ~/.local/bin/myelin). The download is checked against the SHA-256 the release
# publishes before anything is installed. Running it again upgrades in place.
# Needs Node.js 18 or newer. It never uses sudo and never installs Node.js for
# you.
#
# Run `sh install.sh --help` for options.

set -eu

REPO="REX-codebase/myelin"
MIN_NODE_MAJOR=18
MARKER="myelin-installer"
RC_BEGIN="# >>> myelin installer >>>"
RC_END="# <<< myelin installer <<<"

ACTION="install"
REF="${MYELIN_REF:-}"
# Where releases and git archives come from. Only tests change these.
GITHUB_URL="${MYELIN_GITHUB_URL:-https://github.com}"
CODELOAD_URL="${MYELIN_CODELOAD_URL:-https://codeload.github.com}"
SOURCE_LABEL=""
MYELIN_HOME="${MYELIN_HOME:-$HOME/.myelin}"
MYELIN_BIN="${MYELIN_BIN:-$HOME/.local/bin}"
MODIFY_PATH=0
ASSUME_YES=0

OS=""
UTF=0
BOLD=""
DIM=""
RED=""
GREEN=""
YELLOW=""
CYAN=""
RESET=""
OK_G="+"
BAD_G="x"
DOT="*"

NODE_BIN=""
NODE_VERSION=""
NEW_VERSION=""
TMP_DIR=""
STAGE_DIR=""
BACKUP_DIR=""
LAUNCHER_TMP=""
APP_DIR=""
LAUNCHER=""
SHELL_NAME=""

# ---------------------------------------------------------------- output

init_ui() {
  if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
    ESC=$(printf '\033')
    BOLD="${ESC}[1m"
    DIM="${ESC}[2m"
    RED="${ESC}[31m"
    GREEN="${ESC}[32m"
    YELLOW="${ESC}[33m"
    CYAN="${ESC}[36m"
    RESET="${ESC}[0m"
  fi
  case "${LC_ALL:-${LC_CTYPE:-${LANG:-}}}" in
    *UTF-8* | *utf-8* | *UTF8* | *utf8*)
      UTF=1
      OK_G="✓"
      BAD_G="✗"
      DOT="◆"
      ;;
  esac
}

banner() {
  printf '\n'
  if [ "$UTF" -eq 1 ]; then
    printf '  %s%s%s\n' "$CYAN" "╭────────────────────────────────────╮" "$RESET"
    printf '  %s%s%s%s\n' "$CYAN" "│" "$RESET" "$BOLD  ◆  M Y E L I N                    ${RESET}${CYAN}│${RESET}"
    printf '  %s%s%s\n' "$CYAN" "│     rule ledgers for AI code       │" "$RESET"
    printf '  %s%s%s\n\n' "$CYAN" "╰────────────────────────────────────╯" "$RESET"
  else
    printf '  %s%s%s\n' "$CYAN" "+------------------------------------+" "$RESET"
    printf '  %s%s%s\n' "$CYAN" "|  *  M Y E L I N                    |" "$RESET"
    printf '  %s%s%s\n' "$CYAN" "|     rule ledgers for AI code       |" "$RESET"
    printf '  %s%s%s\n\n' "$CYAN" "+------------------------------------+" "$RESET"
  fi
}

ok() {
  printf '  %s%s%s %s\n' "$GREEN" "$OK_G" "$RESET" "$1"
}

warn() {
  printf '  %s%s%s %s\n' "$YELLOW" "$DOT" "$RESET" "$1"
}

info() {
  printf '    %s%s%s\n' "$DIM" "$1" "$RESET"
}

fail() {
  printf '  %s%s%s %s\n' "$RED" "$BAD_G" "$RESET" "$1" >&2
}

die() {
  fail "$1"
  exit 1
}

on_signal() {
  printf '\n'
  fail "Interrupted. Nothing else was changed."
  exit "$1"
}

usage() {
  cat <<'EOF'
Myelin installer for macOS, Linux and WSL.

Usage:
  curl -fsSL https://raw.githubusercontent.com/REX-codebase/myelin/main/install.sh | sh
  sh install.sh [options]

Options:
  --ref <ref>     install a specific version. A release tag such as v0.4.0 is
                  verified against its published SHA-256. Any other ref (a
                  branch or commit) is installed as is and is NOT verified.
                  Default: the latest release, verified.
  --modify-path   also add the launcher folder to your shell's rc file
  --uninstall     remove Myelin: the app, the launcher and any PATH line added here
  --yes, -y       skip the confirmation prompt (for --uninstall)
  -h, --help      show this help

Environment:
  MYELIN_REF      same as --ref
  MYELIN_HOME     where the app is installed (default: ~/.myelin)
  MYELIN_BIN      where the myelin launcher is written (default: ~/.local/bin)
  NO_COLOR        set to any value to turn off colours

After installing, run: myelin setup
EOF
}

usage_error() {
  printf 'install.sh: %s\n' "$1" >&2
  printf 'Run "sh install.sh --help" for options.\n' >&2
  exit 2
}

# ---------------------------------------------------------------- args

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --ref)
        [ $# -ge 2 ] || usage_error "--ref needs a value, for example --ref v0.4.0"
        REF="$2"
        shift 2
        ;;
      --ref=*)
        REF="${1#--ref=}"
        shift
        ;;
      --uninstall)
        ACTION="uninstall"
        shift
        ;;
      --modify-path)
        MODIFY_PATH=1
        shift
        ;;
      -y | --yes)
        ASSUME_YES=1
        shift
        ;;
      -h | --help)
        usage
        exit 0
        ;;
      *)
        usage_error "unknown option: $1"
        ;;
    esac
  done
}

# ---------------------------------------------------------------- checks

check_os() {
  case "$(uname -s 2>/dev/null || echo unknown)" in
    Darwin) OS="Darwin" ;;
    Linux) OS="Linux" ;;
    MINGW* | MSYS* | CYGWIN*)
      die "This is Windows. In PowerShell, run: irm https://raw.githubusercontent.com/REX-codebase/myelin/main/install.ps1 | iex"
      ;;
    *)
      die "Unsupported system: $(uname -s 2>/dev/null || echo unknown). Myelin installs on macOS, Linux and WSL."
      ;;
  esac
}

validate_settings() {
  case "$MYELIN_HOME" in
    "" | / | "$HOME")
      die "MYELIN_HOME must be its own folder, not empty, / or your home folder."
      ;;
  esac
  case "$MYELIN_HOME" in
    /*) ;;
    *) die "MYELIN_HOME must be an absolute path: $MYELIN_HOME" ;;
  esac
  case "$MYELIN_BIN" in
    /*) ;;
    *) die "MYELIN_BIN must be an absolute path: $MYELIN_BIN" ;;
  esac
  for p in "$MYELIN_HOME" "$MYELIN_BIN"; do
    case "$p" in
      *\"* | *\$* | *\`* | *\\*)
        die "Install paths may not contain quotes, \$, backticks or backslashes: $p"
        ;;
    esac
  done
  case "$REF" in
    "") ;; # no ref: install the latest release
    *[!A-Za-z0-9._/-]* | *..*)
      die "Invalid ref '$REF'. Use letters, digits, and . _ - / only."
      ;;
  esac
  APP_DIR="$MYELIN_HOME/app"
  LAUNCHER="$MYELIN_BIN/myelin"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but was not found. Install it and run this installer again."
}

check_node() {
  NODE_BIN=$(command -v node 2>/dev/null || true)
  if [ -z "$NODE_BIN" ]; then
    fail "Node.js $MIN_NODE_MAJOR or newer is required, but 'node' was not found."
    printf '\n    Install Node.js, then run this installer again:\n\n'
    if [ "$OS" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
      printf '      brew install node\n'
    fi
    printf '      https://nodejs.org/en/download\n'
    printf '      fnm install 22 && fnm use 22        (if you use fnm)\n\n'
    exit 1
  fi
  NODE_VERSION=$("$NODE_BIN" -p 'process.versions.node' 2>/dev/null || echo 0)
  NODE_MAJOR=${NODE_VERSION%%.*}
  case "$NODE_MAJOR" in
    '' | *[!0-9]*) NODE_MAJOR=0 ;;
  esac
  if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    fail "Node.js $NODE_VERSION is installed, but Myelin needs $MIN_NODE_MAJOR or newer."
    printf '\n    Upgrade Node.js, then run this installer again:\n\n'
    if [ "$OS" = "Darwin" ] && command -v brew >/dev/null 2>&1; then
      printf '      brew upgrade node\n'
    fi
    printf '      https://nodejs.org/en/download\n'
    printf '      fnm install 22 && fnm use 22        (if you use fnm)\n\n'
    exit 1
  fi
  ok "Node.js v$NODE_VERSION"
}

# ---------------------------------------------------------------- download and install

fetch() {
  # fetch URL DEST: curl if present, else wget.
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 -o "$2" "$1"
  else
    wget -q -O "$2" "$1"
  fi
}

final_url() {
  # Print the URL a request ends up at after redirects.
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 -o /dev/null -w '%{url_effective}' "$1"
  else
    wget -q --server-response --spider "$1" 2>&1 | awk 'tolower($1) == "location:" { u = $2 } END { print u }'
  fi
}

latest_tag() {
  # GitHub redirects /releases/latest to /releases/tag/<tag>. With no release it
  # lands on the plain releases page instead, and this prints nothing.
  url=$(final_url "$GITHUB_URL/$REPO/releases/latest") || return 1
  case "$url" in
    */releases/tag/*)
      tag=${url##*/releases/tag/}
      printf '%s' "${tag%%[?#]*}"
      ;;
  esac
  return 0
}

sha256_of() {
  "$NODE_BIN" -e 'process.stdout.write(require("crypto").createHash("sha256").update(require("fs").readFileSync(process.argv[1])).digest("hex"))' "$1"
}

get_release() {
  # get_release TAG: download the release tarball and refuse it unless it matches the published SHA-256.
  TAG="$1"
  case "$TAG" in
    "" | *[!A-Za-z0-9._-]* | *..*) die "Invalid release tag '$TAG'." ;;
  esac
  ASSET="myelin-ledger-${TAG#v}.tgz"
  BASE="$GITHUB_URL/$REPO/releases/download/$TAG"
  if ! fetch "$BASE/$ASSET" "$TMP_DIR/myelin.tar.gz"; then
    fail "Could not download $ASSET from release $TAG."
    info "Check your internet connection, or that $TAG is a published release."
    info "Releases: $GITHUB_URL/$REPO/releases"
    exit 1
  fi
  if ! fetch "$BASE/SHA256SUMS" "$TMP_DIR/SHA256SUMS"; then
    die "Could not download SHA256SUMS for release $TAG, so the download cannot be verified. Nothing was installed."
  fi
  EXPECTED=$(awk -v f="$ASSET" '{ n = $2; sub(/^\*/, "", n) } n == f { print tolower($1); exit }' "$TMP_DIR/SHA256SUMS")
  [ -n "$EXPECTED" ] || die "SHA256SUMS for $TAG has no entry for $ASSET. Nothing was installed."
  ACTUAL=$(sha256_of "$TMP_DIR/myelin.tar.gz") || die "Could not compute the SHA-256 of the download."
  if [ "$ACTUAL" != "$EXPECTED" ]; then
    fail "The download does not match the SHA-256 published for $TAG."
    info "expected $EXPECTED"
    info "got      $ACTUAL"
    die "Nothing was installed. Try again; if it keeps failing, report it at $GITHUB_URL/$REPO/issues."
  fi
  SOURCE_LABEL="release $TAG, SHA-256 verified"
  ok "Downloaded release $TAG and verified its SHA-256"
}

get_ref() {
  # get_ref REF: a branch or commit straight from git. Nothing to verify it against.
  URL="$CODELOAD_URL/$REPO/tar.gz/$1"
  if ! fetch "$URL" "$TMP_DIR/myelin.tar.gz"; then
    fail "Could not download Myelin ($1) from GitHub."
    info "Check your internet connection and try again."
    info "To install a release instead, run with --ref <tag>, for example --ref v0.4.0."
    exit 1
  fi
  SOURCE_LABEL="ref $1, not verified"
  ok "Downloaded Myelin ($1)"
}

get_archive() {
  if [ -n "${MYELIN_TARBALL:-}" ]; then
    [ -f "$MYELIN_TARBALL" ] || die "MYELIN_TARBALL does not exist: $MYELIN_TARBALL"
    cp "$MYELIN_TARBALL" "$TMP_DIR/myelin.tar.gz"
    SOURCE_LABEL="local archive, not verified"
    ok "Using local archive $MYELIN_TARBALL"
    return 0
  fi
  case "$REF" in
    v[0-9]*)
      get_release "$REF"
      return 0
      ;;
    ?*)
      warn "Installing git ref $REF. It is not a release, so it is not checksum-verified."
      get_ref "$REF"
      return 0
      ;;
  esac
  if ! LATEST=$(latest_tag); then
    fail "Could not look up the latest Myelin release on GitHub."
    info "Check your internet connection and try again."
    exit 1
  fi
  if [ -n "$LATEST" ]; then
    get_release "$LATEST"
  else
    warn "No Myelin release has been published yet, so this installs the main branch."
    warn "It is not checksum-verified. Once a release exists, running this again installs that instead."
    get_ref main
  fi
}

unpack() {
  mkdir "$TMP_DIR/unpacked"
  if ! tar -xzf "$TMP_DIR/myelin.tar.gz" -C "$TMP_DIR/unpacked" --strip-components=1 2>/dev/null; then
    die "The download is not a valid archive. Try again, or use --ref with a release tag."
  fi
  if [ ! -f "$TMP_DIR/unpacked/bin/myelin.mjs" ]; then
    die "The archive does not look like Myelin (bin/myelin.mjs is missing)."
  fi
  ok "Unpacked the archive"
}

stage_and_verify() {
  # Build the new tree next to the install so the final move is a same-disk rename.
  STAGE_DIR="$MYELIN_HOME/.staging.$$"
  rm -rf "$STAGE_DIR"
  mkdir -p "$MYELIN_HOME"
  mv "$TMP_DIR/unpacked" "$STAGE_DIR"
  if ! NEW_VERSION=$("$NODE_BIN" "$STAGE_DIR/bin/myelin.mjs" version 2>/dev/null); then
    die "The new build failed its self-check. Your existing install, if any, was left as it was."
  fi
  ok "Self-check passed (myelin $NEW_VERSION)"
}

swap_in() {
  PREV_VERSION=""
  if [ -f "$APP_DIR/bin/myelin.mjs" ]; then
    PREV_VERSION=$("$NODE_BIN" "$APP_DIR/bin/myelin.mjs" version 2>/dev/null || true)
    BACKUP_DIR="$MYELIN_HOME/.previous.$$"
    rm -rf "$BACKUP_DIR"
    mv "$APP_DIR" "$BACKUP_DIR"
  fi
  if ! mv "$STAGE_DIR" "$APP_DIR"; then
    if [ -n "$BACKUP_DIR" ]; then
      mv "$BACKUP_DIR" "$APP_DIR" || true
      BACKUP_DIR=""
    fi
    die "Could not move the new build into $APP_DIR."
  fi
  STAGE_DIR=""
  if [ -n "$BACKUP_DIR" ]; then
    rm -rf "$BACKUP_DIR"
    BACKUP_DIR=""
  fi
  if [ -n "$PREV_VERSION" ]; then
    ok "Replaced myelin $PREV_VERSION at $APP_DIR"
  else
    ok "Installed the app to $APP_DIR"
  fi
}

check_launcher_free() {
  # Fail before downloading anything if the launcher path belongs to something else.
  if [ -e "$LAUNCHER" ] && ! grep -q "$MARKER" "$LAUNCHER" 2>/dev/null; then
    die "$LAUNCHER already exists and was not made by this installer. Move it, or set MYELIN_BIN to another folder."
  fi
}

write_launcher() {
  check_launcher_free
  mkdir -p "$MYELIN_BIN"
  LAUNCHER_TMP="$MYELIN_BIN/.myelin-launcher.$$"
  {
    printf '#!/bin/sh\n'
    printf '# %s: generated by install.sh. Re-run the installer to upgrade, or run it with --uninstall to remove.\n' "$MARKER"
    printf 'exec node "%s" "$@"\n' "$APP_DIR/bin/myelin.mjs"
  } >"$LAUNCHER_TMP"
  chmod 755 "$LAUNCHER_TMP"
  mv -f "$LAUNCHER_TMP" "$LAUNCHER"
  LAUNCHER_TMP=""
  ok "Wrote the launcher to $LAUNCHER"
}

# ---------------------------------------------------------------- PATH

on_path() {
  case ":$PATH:" in
    *":$1:"*) return 0 ;;
  esac
  return 1
}

rc_file() {
  case "$SHELL_NAME" in
    zsh) printf '%s' "${ZDOTDIR:-$HOME}/.zshrc" ;;
    fish) printf '%s' "$HOME/.config/fish/config.fish" ;;
    bash)
      if [ "$OS" = "Darwin" ]; then
        printf '%s' "$HOME/.bash_profile"
      else
        printf '%s' "$HOME/.bashrc"
      fi
      ;;
    *) printf '%s' "$HOME/.profile" ;;
  esac
}

# shellcheck disable=SC2016
path_line() {
  case "$SHELL_NAME" in
    fish) printf 'fish_add_path "%s"' "$MYELIN_BIN" ;;
    *) printf 'export PATH="%s:$PATH"' "$MYELIN_BIN" ;;
  esac
}

strip_rc_block() {
  # Remove our marked block from an rc file. Writes through symlinks and keeps the file's mode.
  [ -f "$1" ] || return 0
  grep -qF "$RC_BEGIN" "$1" || return 0
  tmp_rc="$1.myelin.$$"
  awk -v begin="$RC_BEGIN" -v end="$RC_END" '
    # Blank lines are held back, so the one we add before the block is dropped with it.
    $0 == begin { skip = 1; held = ""; next }
    $0 == end { skip = 0; next }
    skip { next }
    /^[ \t]*$/ { held = held "\n"; next }
    { printf "%s", held; held = ""; print }
    END { printf "%s", held }
  ' "$1" >"$tmp_rc"
  cat "$tmp_rc" >"$1"
  rm -f "$tmp_rc"
}

add_rc_block() {
  # add_rc_block FILE LINE: replaces any earlier block, so re-running stays idempotent.
  strip_rc_block "$1"
  mkdir -p "$(dirname "$1")"
  printf '\n%s\n%s\n%s\n' "$RC_BEGIN" "$2" "$RC_END" >>"$1"
}

handle_path() {
  if on_path "$MYELIN_BIN"; then
    ok "$MYELIN_BIN is on your PATH"
    return 0
  fi
  RC=$(rc_file)
  LINE=$(path_line)
  case "$RC" in
    "$HOME"/*) RC_SHOWN="~${RC#"$HOME"}" ;;
    *) RC_SHOWN="$RC" ;;
  esac
  if [ "$MODIFY_PATH" -eq 1 ]; then
    add_rc_block "$RC" "$LINE"
    ok "Added $MYELIN_BIN to PATH in $RC_SHOWN"
    info "Open a new terminal to pick it up."
    return 0
  fi
  warn "$MYELIN_BIN is not on your PATH yet."
  if [ "$SHELL_NAME" = "fish" ]; then
    info "Run this once in fish, then open a new terminal:"
    printf '\n      %s\n\n' "$LINE"
  else
    info "Run this once, then open a new terminal:"
    printf "\n      echo '%s' >> %s\n\n" "$LINE" "$RC_SHOWN"
  fi
}

# ---------------------------------------------------------------- uninstall

uninstall() {
  if [ "$ASSUME_YES" -ne 1 ]; then
    if (: </dev/tty) 2>/dev/null; then
      printf '  Remove Myelin from %s and %s? [y/N] ' "$APP_DIR" "$LAUNCHER"
      answer=""
      read -r answer </dev/tty || answer=""
      case "$answer" in
        y | Y | yes | YES) ;;
        *)
          printf '  Cancelled. Nothing was removed.\n'
          exit 0
          ;;
      esac
    else
      die "No terminal to ask on. Re-run with --yes to remove Myelin without a prompt."
    fi
  fi

  if [ -f "$LAUNCHER" ]; then
    if grep -q "$MARKER" "$LAUNCHER" 2>/dev/null; then
      rm -f "$LAUNCHER"
      ok "Removed $LAUNCHER"
    else
      warn "Left $LAUNCHER alone: it was not made by this installer."
    fi
  else
    info "No launcher at $LAUNCHER"
  fi

  if [ -d "$APP_DIR" ]; then
    rm -rf "$APP_DIR"
    ok "Removed $APP_DIR"
  else
    info "No app at $APP_DIR"
  fi

  rm -rf "$MYELIN_HOME"/.staging.* "$MYELIN_HOME"/.previous.*
  rmdir "$MYELIN_HOME" 2>/dev/null || true

  for rc in "${ZDOTDIR:-$HOME}/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile" "$HOME/.config/fish/config.fish"; do
    if [ -f "$rc" ] && grep -qF "$RC_BEGIN" "$rc"; then
      strip_rc_block "$rc"
      ok "Removed the PATH line from $rc"
    fi
  done

  printf '\n'
  ok "Myelin is uninstalled."
}

# ---------------------------------------------------------------- cleanup

cleanup() {
  status=$?
  if [ -n "$BACKUP_DIR" ] && [ -e "$BACKUP_DIR" ]; then
    # Interrupted between the two moves: put the previous install back.
    if [ ! -e "$APP_DIR" ]; then
      mv "$BACKUP_DIR" "$APP_DIR" 2>/dev/null || true
    else
      rm -rf "$BACKUP_DIR"
    fi
  fi
  if [ -n "$STAGE_DIR" ]; then
    rm -rf "$STAGE_DIR"
  fi
  if [ -n "$LAUNCHER_TMP" ]; then
    rm -f "$LAUNCHER_TMP"
  fi
  if [ -n "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
  exit "$status"
}

# ---------------------------------------------------------------- main

main() {
  parse_args "$@"
  init_ui
  banner
  check_os
  validate_settings

  SHELL_NAME=$(basename "${SHELL:-/bin/sh}")

  trap cleanup EXIT
  trap 'on_signal 130' INT
  trap 'on_signal 143' TERM

  if [ "$ACTION" = "uninstall" ]; then
    uninstall
    exit 0
  fi

  need_cmd tar
  if [ -z "${MYELIN_TARBALL:-}" ] && ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    die "Either curl or wget is required to download Myelin."
  fi

  check_node
  check_launcher_free

  TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t myelin-install)
  get_archive
  unpack
  stage_and_verify
  swap_in
  write_launcher
  handle_path

  printf '\n'
  ok "Myelin $NEW_VERSION is ready ($SOURCE_LABEL)"
  printf '\n'
  printf '  %sNext: run `myelin setup`%s\n' "$BOLD" "$RESET"
}

main "$@"
