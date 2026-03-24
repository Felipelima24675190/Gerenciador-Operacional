import { Viagem } from '../types';

/**
 * Builds flexible lookup maps for matching reports against the viagens base.
 * Returns a function that tries multiple strategies:
 *   1. Exact match by numeroLinha
 *   2. Exact match by servico code
 *   3. Partial match by nomeLinha (contains city names)
 */
export function buildLinhaLookup(viagens: Viagem[]) {
  // Map by numeroLinha (line identifier)
  const byNumero = new Map<string, string>();
  // Map by servico code
  const byServico = new Map<string, string>();
  // Set of unique nomeLinha values for fuzzy match
  const nomeLinhas: { nome: string; numero: string }[] = [];

  const seen = new Set<string>();
  for (const v of viagens) {
    const key = v.numeroLinha.trim();
    if (!byNumero.has(key)) {
      byNumero.set(key, v.nomeLinha);
    }
    if (v.servico && !byServico.has(v.servico.trim())) {
      byServico.set(v.servico.trim(), v.nomeLinha);
    }
    if (!seen.has(v.nomeLinha)) {
      seen.add(v.nomeLinha);
      nomeLinhas.push({ nome: v.nomeLinha, numero: key });
    }
  }

  /**
   * Attempts to resolve a code/name to a nomeLinha from the base.
   * Tries: exact numero match → exact servico match → partial name match.
   */
  return function resolve(codeOrName: string): string | undefined {
    const trimmed = codeOrName.trim();
    // 1. Exact match by numero
    if (byNumero.has(trimmed)) return byNumero.get(trimmed);
    // 2. Exact match by servico
    if (byServico.has(trimmed)) return byServico.get(trimmed);
    // 3. Check if the input contains a dash separating code from name (e.g. "16056-RECIFE(PE)...")
    const dashIdx = trimmed.indexOf('-');
    if (dashIdx > 0) {
      const code = trimmed.substring(0, dashIdx).trim();
      if (byNumero.has(code)) return byNumero.get(code);
      if (byServico.has(code)) return byServico.get(code);
    }
    // 4. Partial name match — extract city names and check
    const upper = trimmed.toUpperCase();
    for (const { nome } of nomeLinhas) {
      if (nome.toUpperCase().includes(upper) || upper.includes(nome.toUpperCase())) {
        return nome;
      }
    }
    // 5. Try matching individual city names from the query
    const cities = extractCities(upper);
    if (cities.length >= 2) {
      for (const { nome } of nomeLinhas) {
        const nomeUpper = nome.toUpperCase();
        if (cities.every(c => nomeUpper.includes(c))) return nome;
      }
    }
    return undefined;
  };
}

/** Extracts city names from strings like "RECIFE(PE) X PETROLINA(PE)" or "16056-RECIFE(PE) - PETROLINA(PE)" */
function extractCities(s: string): string[] {
  // Remove codes, parenthetical state abbrevs, and common separators
  return s
    .replace(/\([A-Z]{2}\)/g, '')
    .replace(/^\d[\d.\-]*/g, '')
    .split(/\s*[-xX]\s*/)
    .map(c => c.trim())
    .filter(c => c.length > 2);
}
