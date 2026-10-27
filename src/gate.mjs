// Render a ledger as text for a model. No model-specific syntax, plain text only.

const lit = (x) => `/${x.source}/${x.flags}`;

// L0: the tiny header a host can keep in every prompt.
export function renderHeader(ledger) {
  const h = ledger.header;
  const out = [`myelin ${ledger.version}${ledger.minor ? '.' + ledger.minor : ''}`, `id      ${h.id}`, `about   ${h.about}`, `fires   ${h.fires.join(' | ')}`];
  if (h.status) out.push(`status  ${h.status}`);
  return out.join('\n');
}

// L0 + L1 (+ chosen L2 snippets): what a model without tools should read.
//   snippets: [] | 'all' | ['rng', 'boot']
export function renderGate(ledger, { snippets = [] } = {}) {
  const h = ledger.header;
  const bans = ledger.rules.filter((r) => r.kind === 'ban');
  const reqs = ledger.rules.filter((r) => r.kind === 'require');
  const ids = snippets === 'all' ? Object.keys(ledger.snippets) : snippets;
  const out = [];

  out.push(`PROJECT RULES (myelin ledger "${h.id}"). These are project conventions: follow them over your defaults.`);
  out.push(h.about);
  if (h.status) out.push(`Status: ${h.status}`);

  if (ledger.facts.length) {
    out.push('', 'FACTS');
    for (const f of ledger.facts) out.push(`- ${f.key}: ${f.value}`);
  }
  if (bans.length && h.render === 'brief') {
    // Generated ledgers (myelin derive) carry hundreds of machine-made regexes. A model needs the
    // sentence, not the pattern; the checker still has the pattern.
    out.push('', 'MUST NOT (do not write any of these; each line names the API and what to use instead):');
    for (const r of bans) out.push(`- ${r.message}`);
  } else if (bans.length) {
    out.push('', 'MUST NOT (your output must not match):');
    for (const r of bans) {
      let line = `- ${r.id}: ${lit(r)} - ${r.message}`;
      if (r.when) line += ` (only applies to code that matches ${lit(r.when)})`;
      if (r.unless) line += ` (allowed only if the output also matches ${lit(r.unless)})`;
      if (r.ref) line += ` [code: ${r.ref}]`;
      out.push(line);
    }
  }
  if (reqs.length) {
    out.push('', 'MUST (your output, taken together, must match):');
    for (const r of reqs) {
      let line = `- ${r.id}: ${lit(r)} - ${r.message}`;
      if (r.ref) line += ` [code: ${r.ref}]`;
      out.push(line);
    }
  }
  if (ledger.prefs.length) {
    out.push('', 'PREFER (not checked; follow unless it conflicts with a MUST or MUST NOT):');
    for (const p of ledger.prefs) out.push(`- ${p.id}: ${p.message}`);
  }
  const all = Object.keys(ledger.snippets);
  if (all.length) {
    out.push('', `COPY-EXACT CODE AVAILABLE BY ID: ${all.join(', ')}`);
  }
  for (const id of ids) {
    const s = ledger.snippets[id];
    if (!s) continue;
    out.push('', `$ ${id}`, s.code, '$$');
  }
  out.push(
    '',
    'BEFORE YOU ANSWER: check every MUST NOT and MUST line against your output and fix any violation. ' +
      'Do not narrate the check. If the user asks which rules applied, say so plainly.',
  );
  return out.join('\n');
}
