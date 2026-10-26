// Reads one /regex/flags literal out of a string, starting at index `start`.
// Handles escaped slashes (\/) and unescaped slashes inside [...] classes.
// Returns { source, flags, end } or null when the literal is not closed.
export function readRegexLiteral(s, start = 0) {
  if (s[start] !== '/') return null;
  let i = start + 1;
  let inClass = false;
  let source = '';
  while (i < s.length) {
    const c = s[i];
    if (c === '\\') {
      if (i + 1 >= s.length) return null;
      source += c + s[i + 1];
      i += 2;
      continue;
    }
    if (inClass) {
      if (c === ']') inClass = false;
      source += c;
      i++;
      continue;
    }
    if (c === '[') {
      inClass = true;
      source += c;
      i++;
      continue;
    }
    if (c === '/') {
      let j = i + 1;
      let flags = '';
      while (j < s.length && /[a-z]/.test(s[j])) {
        flags += s[j];
        j++;
      }
      return { source, flags, end: j };
    }
    source += c;
    i++;
  }
  return null;
}
