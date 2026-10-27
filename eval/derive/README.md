# Derived-ledger benchmark

Measures what `myelin derive` is worth, and where it is not. Four measurements, each with the way it can mislead:

| # | measurement | misleads when |
|---|---|---|
| 1 | **Labelled corpus.** The derived ledger against the 177 stale and 129 current files in `libs/*/bench`. | the corpus is mostly removed or changed APIs, which no deprecation tag can describe. Low recall here is expected, and it is why curated ledgers still matter. |
| 2 | **Ceiling.** The same corpus against *every* deprecated name, matched loosely. | it is an upper bound for any approach built on `@deprecated`, not something derive tries to reach: it flags a quarter of the current files. |
| 3 | **Official examples.** Old and current example code from `eval/wild`, derived against curated ledgers. | the curated ledger is the one place a derived finding can be called "extra". Neither is ground truth. |
| 4 | **Real apps.** Two open-source apps, pinned to a commit, linted as text. Every finding printed with its line, to be read. | two apps are two apps. They show what kind of thing it finds, not how often. |

```bash
sh eval/derive/fetch.sh            # once; installs eval/derive/package.json (about 1 GB) into .derive/
node eval/derive/run.mjs           # all four, with every flagged line printed
node eval/derive/run.mjs --write   # also refreshes results.json
```

`fetch.sh` installs only the libraries pinned in `package.json` / `package-lock.json`. The two apps are cloned at a fixed commit and **read as text**: their dependencies are never installed and none of their code runs. A derived ledger reads whatever is installed, so the numbers move when the pins move; that is the point of pinning.

Reading the findings is part of the benchmark. For every hit in section 4 the question is whether the line really uses the API that the declaration marks `@deprecated`. At the commit pinned here, all 30 do. The first run of this benchmark found two false positives, a local variable named like a deprecated export (`const rangeFog = …`) and a `resolution:` key in an unrelated options object, plus one real design gap (a name deprecated on `ai/test` and live on `ai`). Each was fixed in the generator, not by editing the corpus, and the cases are now unit tests in `test/derive.test.mjs`.
