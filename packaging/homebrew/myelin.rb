# Homebrew formula template for Myelin.
#
# Lives in the tap repo as Formula/myelin.rb (see packaging/README.md).
# Bump `url` and `sha256` for each release; `sha256` is the hash of the GitHub tag tarball.
class Myelin < Formula
  desc "Rule ledgers that keep AI-written code on current library versions"
  homepage "https://github.com/REX-codebase/myelin"
  url "https://github.com/REX-codebase/myelin/archive/refs/tags/v0.2.1.tar.gz"
  sha256 "REPLACE_WITH_RELEASE_SHA256"
  license "MIT"
  head "https://github.com/REX-codebase/myelin.git", branch: "main"

  depends_on "node"

  def install
    libexec.install Dir["*"]

    node = Formula["node"].opt_bin/"node"
    entry = libexec/"bin/myelin.mjs"
    entry.chmod 0755

    # Plain wrapper scripts, so `myelin` and `myelin-ledger` run the same entry point with Homebrew's node.
    %w[myelin myelin-ledger].each do |name|
      (bin/name).write <<~EOS
        #!/bin/sh
        exec "#{node}" "#{entry}" "$@"
      EOS
      (bin/name).chmod 0755
    end
  end

  def caveats
    <<~EOS
      Get started with:
        myelin setup
    EOS
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/myelin version")
    assert_match "three", shell_output("#{bin}/myelin libs")
  end
end
