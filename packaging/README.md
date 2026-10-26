# Packaging

How Myelin reaches users, and how a maintainer ships each channel. The install scripts at the repo root are the main path; these are for people who already use npm, Homebrew or Scoop.

| Channel | Who it is for | Where it lives |
| --- | --- | --- |
| One-line installer | Everyone | `install.sh` (macOS, Linux, WSL), `install.ps1` (Windows) |
| npm | Node users | `myelin-ledger` on npm (`npx myelin-ledger`) |
| Homebrew | macOS and Linux | Tap repo, `Formula/myelin.rb` (template: `packaging/homebrew/myelin.rb`) |
| Scoop | Windows | Bucket repo, `bucket/myelin.json` (template: `packaging/scoop/myelin.json`) |

## Release steps

1. Bump `version` in `package.json` and add a dated section to `CHANGELOG.md`. Commit.
2. Tag and push: `git tag v0.2.2 && git push origin v0.2.2`.
3. The `release` workflow runs the tests and creates a GitHub Release with the npm tarball, `install.sh`, `install.ps1` and `SHA256SUMS`. It also publishes to npm if the `NPM_TOKEN` secret is set.
4. Update Homebrew and Scoop (below). Both point at the GitHub tag tarball, so the hash can be computed once the tag exists.

## npm

Automatic on tag push when `NPM_TOKEN` is set (publishes with provenance). By hand:

```sh
npm login
npm publish --access public
```

## Homebrew tap

1. Create `REX-codebase/homebrew-tap` if it does not exist, with a `Formula/` folder.
2. Copy `packaging/homebrew/myelin.rb` to `Formula/myelin.rb`.
3. Set `url` to the new tag and compute the hash:
   ```sh
   curl -sL https://github.com/REX-codebase/myelin/archive/refs/tags/v0.2.2.tar.gz | shasum -a 256
   ```
   Put the hash in `sha256`.
4. Check it: `brew audit --strict --new Formula/myelin.rb && brew install --build-from-source ./Formula/myelin.rb && brew test myelin`.
5. Commit and push. Users install with `brew tap REX-codebase/tap && brew install myelin`.

## Scoop bucket

1. Create `REX-codebase/scoop-bucket` with a `bucket/` folder.
2. Copy `packaging/scoop/myelin.json` to `bucket/myelin.json`. Set `version`, `url` and `extract_dir` to the new tag.
3. Compute the hash: `(Get-FileHash -Algorithm SHA256 myelin-0.2.2.zip).Hash.ToLower()`, after downloading the zip from the tag URL. Put it in `hash`.
4. Check it: `scoop install ./bucket/myelin.json`, then `myelin version`.
5. Commit and push. Users run `scoop bucket add rex https://github.com/REX-codebase/scoop-bucket` and then `scoop install myelin`.

The Scoop manifest's `installer` script writes a `myelin.cmd` shim, because Scoop cannot run `.mjs` files directly. Verify the shim on a real Windows machine before the first release.
