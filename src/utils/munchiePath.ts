export function deriveMunchieCandidates(input: { filePath?: string | null; modelUrl?: string | null; id?: string | null; name?: string | null }): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const fp = input.filePath || undefined;
  const mu = input.modelUrl || undefined;

  function pushIfNew(s: string | undefined) {
    if (!s) return;
    if (!seen.has(s)) {
      seen.add(s);
      candidates.push(s);
    }
  }

  if (typeof fp === 'string') {
    let rel = fp.replace(/\\/g, '/');
    rel = rel.replace(/^\/?models\//, '');
    if (rel.endsWith('.3mf')) rel = rel.replace(/\.3mf$/i, '-munchie.json');
    else if (/\.stl$/i.test(rel)) rel = rel.replace(/\.stl$/i, '-stl-munchie.json');
    else if (!(rel.endsWith('-munchie.json') || rel.endsWith('-stl-munchie.json'))) rel = `${rel}-munchie.json`;
    pushIfNew(rel);
  }

  if (typeof mu === 'string') {
    let rel = mu.replace(/^\/?models\//, '');
    if (rel.endsWith('.3mf')) rel = rel.replace(/\.3mf$/i, '-munchie.json');
    else if (/\.stl$/i.test(rel)) rel = rel.replace(/\.stl$/i, '-stl-munchie.json');
    else if (!(rel.endsWith('-munchie.json') || rel.endsWith('-stl-munchie.json'))) rel = `${rel}-munchie.json`;
    pushIfNew(rel);
  }

  const nameBase = (input.name || input.id || '').trim();
  if (nameBase) {
    pushIfNew(`${nameBase}-munchie.json`);
    pushIfNew(`${nameBase}-stl-munchie.json`);
  }

  return candidates;
}
