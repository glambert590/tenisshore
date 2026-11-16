import { normalizeCode, parseMark } from './catalog.ts';
import type { AvailabilityRow, OcrResult, TableColumn, TableProposal, TableRow } from './types.ts';

function limits(centers: number[], index: number, outer: number): [number, number] {
  const c = centers[index];
  const gap = centers.length > 1 ? Math.min(...centers.slice(1).map((v, i) => v - centers[i])) : outer * 0.1;
  return [index ? (centers[index - 1] + c) / 2 : c - gap / 2, index < centers.length - 1 ? (c + centers[index + 1]) / 2 : c + gap / 2];
}

export function buildCells(ocr: OcrResult, columns: TableColumn[], rows: TableRow[]): AvailabilityRow[] {
  const sortedColumns = [...columns].sort((a, b) => a.x - b.x);
  const sortedRows = [...rows].sort((a, b) => a.y - b.y);
  return sortedColumns.flatMap((col, ci) => sortedRows.map((row, ri) => {
    const [left, right] = limits(sortedColumns.map(c => c.x), ci, ocr.width);
    const [top, bottom] = limits(sortedRows.map(r => r.y), ri, ocr.height);
    const tokens = ocr.tokens.filter(t => {
      const x = t.x + t.width / 2, y = t.y + t.height / 2;
      return x >= left && x < right && y >= top && y < bottom;
    }).sort((a, b) => a.x - b.x);
    // Missing OCR text cannot prove that the cell in the photograph is empty.
    const mark = tokens.length ? parseMark(tokens.map(t => t.text).join(' ')) : 'pending';
    return { code: col.code, brand: col.brand, baseSize: row.size, mark, reviewed: false };
  }));
}

export function proposeTable(ocr: OcrResult): TableProposal {
  const rowTokens = ocr.tokens.filter(t => /^\d{2}$/.test(t.text.trim()) && Number(t.text) >= 20 && Number(t.text) <= 60 && t.x < ocr.width * 0.15);
  const rows = rowTokens.map(t => ({ size: Number(t.text), y: t.y + t.height / 2 })).sort((a, b) => a.y - b.y);
  if (rows.length < 2) return { columns: [], rows: [], cells: [] };
  const firstRowY = rows[0].y;
  const rowStep = rows[1].y - rows[0].y;
  const candidates = ocr.tokens.filter(t => /^\d+(?:[.,]\d+)?$/.test(t.text.trim()) && t.x > ocr.width * 0.15 && t.y + t.height / 2 < firstRowY - rowStep / 2);
  // Numeric column headers are the last numeric line above the first size row.
  const bottom = Math.max(...candidates.map(t => t.y + t.height / 2));
  const columns = candidates.filter(t => Math.abs(t.y + t.height / 2 - bottom) < rowStep * 0.4)
    .map(t => ({ code: normalizeCode(t.text), brand: null, x: t.x + t.width / 2 })).sort((a, b) => a.x - b.x);
  return { columns, rows, cells: buildCells(ocr, columns, rows) };
}
