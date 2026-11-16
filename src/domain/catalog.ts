import type { AvailabilityRow, BackupManifest, CellMark, Product } from './types.ts';

export function normalizeCode(raw: string): string {
  const code = raw.trim().replace(/,/g, '.');
  if (!code || code.length > 80 || !/^[\p{L}\p{N}._-]+$/u.test(code)) throw new Error('Introduce un código válido, sin espacios.');
  return code;
}

export function parsePrice(raw: string): number {
  const value = raw.trim().replace(/USD|\$/gi, '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Introduce un precio en USD con hasta dos decimales.');
  const [whole, decimals = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('El precio es demasiado grande.');
  return cents;
}

export function parseMark(text: string): CellMark {
  const compact = text.toUpperCase().replace(/\s/g, '');
  if (compact === '') return 'empty';
  if (/^X(?:½|1\/2)$/.test(compact)) return 'half';
  if (compact === 'X') return 'whole';
  return 'pending';
}

export function reviewIssues(rows: AvailabilityRow[]): string[] {
  const issues: string[] = [];
  const seen = new Map<string, string>();
  for (const row of rows) {
    try { normalizeCode(row.code); } catch { issues.push('Hay un código inválido.'); }
    if (!Number.isInteger(row.baseSize) || row.baseSize <= 0 || row.baseSize > 100) issues.push('Hay una fila de talla inválida.');
    if (!row.reviewed || row.mark === 'pending') issues.push(`Revisa ${row.code}, talla ${row.baseSize}.`);
    const key = `${row.code}\0${row.baseSize}`;
    const previous = seen.get(key);
    if (previous && previous !== row.mark) issues.push(`Conflicto en ${row.code}, talla ${row.baseSize}.`);
    seen.set(key, row.mark);
  }
  return [...new Set(issues)];
}

export function applyRows(product: Product, rows: AvailabilityRow[], at: string): Product {
  const ownRows = rows.filter(r => normalizeCode(r.code) === product.code);
  const issues = reviewIssues(ownRows);
  if (issues.length) throw new Error(issues.join('\n'));
  const sizes = new Set(product.availableSizes);
  for (const row of ownRows) {
    sizes.delete(row.baseSize);
    sizes.delete(row.baseSize + 0.5);
    if (row.mark === 'whole') sizes.add(row.baseSize);
    if (row.mark === 'half') sizes.add(row.baseSize + 0.5);
  }
  return { ...product, availableSizes: [...sizes].sort((a, b) => a - b), availabilityKnown: product.availabilityKnown || ownRows.length > 0, updatedAt: ownRows.length ? at : product.updatedAt };
}

export function filterProducts(products: Product[], filters: { brand?: string; size?: number; code?: string }): Product[] {
  return products.filter(p => (!filters.brand || p.brand?.toLocaleLowerCase() === filters.brand.toLocaleLowerCase())
    && (!filters.code || p.code.toLocaleLowerCase().includes(filters.code.trim().replace(',', '.').toLocaleLowerCase()))
    && (filters.size === undefined || (p.availabilityKnown && p.availableSizes.includes(filters.size))));
}

export function missingFields(p: Product): string[] {
  return [!p.brand && 'marca', !p.photoPath && 'foto', p.priceCents === null && 'precio', !p.availabilityKnown && 'disponibilidad', p.availabilityKnown && p.availableSizes.length === 0 && 'tallas disponibles'].filter((s): s is string => typeof s === 'string');
}

export function shareBatches(products: Product[]): { batches: Product[][]; excluded: Product[] } {
  const valid = products.filter(p => missingFields(p).length === 0);
  const batches: Product[][] = [];
  for (let i = 0; i < valid.length; i += 20) batches.push(valid.slice(i, i + 20));
  return { batches, excluded: products.filter(p => missingFields(p).length > 0) };
}

export function parseCard(text: string): { code: string | null; priceCents: number | null } {
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const codeMatch = normalized.match(/CODIGO\s*[:#-]?\s*([\w]+(?:[.,][\w]+)*)/i);
  const priceMatch = normalized.match(/(\d+(?:[.,]\d{1,2})?)\s*USD/i) ?? normalized.match(/\$\s*(\d+(?:[.,]\d{1,2})?)/);
  return { code: codeMatch ? normalizeCode(codeMatch[1]) : null, priceCents: priceMatch ? parsePrice(priceMatch[1]) : null };
}

export function blankProduct(code: string): Product {
  return { code: normalizeCode(code), brand: null, priceCents: null, photoPath: null, thumbnailPath: null, availableSizes: [], availabilityKnown: false, updatedAt: null };
}

export function validateProduct(p: Product): Product {
  if (normalizeCode(p.code) !== p.code) throw new Error('Código sin normalizar.');
  if (p.brand !== null && (typeof p.brand !== 'string' || !p.brand.trim())) throw new Error('Marca inválida.');
  if (p.priceCents !== null && (!Number.isSafeInteger(p.priceCents) || p.priceCents < 0)) throw new Error('Precio inválido.');
  if (!Array.isArray(p.availableSizes) || p.availableSizes.some(s => !Number.isFinite(s) || s <= 0 || s > 100 || !Number.isInteger(s * 2)) || new Set(p.availableSizes).size !== p.availableSizes.length) throw new Error('Tallas inválidas.');
  if (typeof p.availabilityKnown !== 'boolean' || (!p.availabilityKnown && p.availableSizes.length > 0)) throw new Error('Disponibilidad inválida.');
  if (p.updatedAt !== null && (typeof p.updatedAt !== 'string' || !Number.isFinite(Date.parse(p.updatedAt)))) throw new Error('Fecha inválida.');
  for (const path of [p.photoPath, p.thumbnailPath]) {
    if (path !== null && (typeof path !== 'string' || !/^photos\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png)$/.test(path))) throw new Error('Ruta de foto inválida.');
  }
  return p;
}

export function validateBackup(value: unknown): BackupManifest {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('products' in value) || !Array.isArray(value.products)) throw new Error('Copia incompatible. Se necesita formato versión 1.');
  const seen = new Set<string>();
  const products = value.products.map(raw => {
    if (!raw || typeof raw !== 'object') throw new Error('Producto inválido.');
    const p = validateProduct(raw as Product);
    if (seen.has(p.code)) throw new Error(`Código duplicado: ${p.code}.`);
    seen.add(p.code);
    return p;
  });
  return { version: 1, products };
}
