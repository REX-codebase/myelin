# express ledger: sources

Researched 2026-10-26. Current stable: **express 5.3.0** (npm `latest`, published ~2026-10-09; `latest-4` = 4.22.3). Node 18+.

Primary source for every rule: Express "Upgrade to Express v5" migration guide, https://expressjs.com/en/guide/migrating-5.html
Version: https://www.npmjs.com/package/express and https://registry.npmjs.org/express (dist-tags).
Behaviour spot-checked on express@5.3.0 in a sandbox: `app.get('*')`, `'/:id?'` and `'/posts/:id(\\d+)'` throw path-to-regexp errors at registration; `app.del`, `res.sendfile`, `req.param` are undefined; all snippets serve the expected responses.

| ID | Change | Source anchor |
|---|---|---|
| E1 | `app.del()` removed; use `app.delete()` | migrating-5.html#appdel |
| E2 | `req.param(name)` removed; use `req.params` / `req.body` / `req.query` | #reqparamname |
| E3 | `res.send(status)` with a number removed; use `res.sendStatus()` | #ressendstatus |
| E4 | `res.json(obj, status)`, `res.jsonp(obj, status)`, `res.send(body, status)` removed; use `res.status(s).json(obj)` | #resjsonobj-status, #resjsonpobj-status, #ressendbody-status |
| E5 | `res.redirect(url, status)` removed; use `res.redirect(status, url)` | #resredirecturl-status |
| E6 | magic `'back'` in `res.redirect` / `res.location` removed; use `req.get('Referrer') \|\| '/'` | #resredirectback-and-reslocationback |
| E7 | `res.sendfile()` replaced by `res.sendFile()` | #ressendfile |
| E8 | `req.acceptsCharset/Encoding/Language` removed; pluralised names | #pluralized-method-names |
| E9 | wildcard `*` must be named: `/*splat`, `/{*splat}` to include root | #path-route-matching-syntax |
| E10 | optional `?` no longer supported; use braces `/:file{.:ext}` | #path-route-matching-syntax |
| E11 | "Regexp characters are not supported"; `()[]?+!` reserved | #path-route-matching-syntax |
| E12 | `express.static.mime` removed; use `mime-types` | #expressstaticmime |
| E13 | `app.param(fn)` and `router.param(fn)` signatures removed; router.param name must be a string | #appparamfn, #routerparamfn, #routerparam-with-an-array-of-names |
| E14 | `req.query` is a getter, no longer writable | #reqquery |
| P1 | rejected promises from handlers forwarded to error middleware | #rejected-promises-handled-from-middleware-and-handlers |
| P2 | `express.urlencoded` `extended` defaults to false | #expressurlencoded |
| P3 | `app.listen` passes server errors to the callback | #applisten |
| P4 | `dotfiles` defaults to `"ignore"`, also for hidden directories | #expressstatic-dotfiles, #expressstatic-options |
| P5 | wildcard params are arrays; unmatched params omitted | #reqparams |
| P6 | `req.host` keeps the port | #reqhost |

Left out on purpose:
- `app.router`: the guide says it is *back* in v5 (reference to the base router), so it is not banned.
- `body-parser`: still works (it is an Express dependency), so only a preference (P2), not a ban.
- `res.sendFile/express.static` `hidden`/`from` options: removed, but a regex on `hidden:` would hit unrelated objects; left out.
- `res.clearCookie` ignoring `maxAge`/`expires`, `res.status` range check, `res.vary()` without args: behaviour changes that rarely appear in generated code.
