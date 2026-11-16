import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proposeTable, buildCells } from '../src/domain/table.ts';
import type { OcrResult } from '../src/domain/types.ts';
const image: OcrResult = { width: 1000, height: 500, elapsedMs: 20, tokens: [
  { text: '37', x: 20, y: 200, width: 30, height: 20 },
  { text: '38', x: 20, y: 250, width: 30, height: 20 },
  { text: '64.10', x: 180, y: 100, width: 45, height: 20 },
  { text: '65.1', x: 280, y: 100, width: 45, height: 20 },
  { text: 'X', x: 190, y: 200, width: 12, height: 20 },
  { text: '½', x: 204, y: 200, width: 12, height: 20 },
  { text: 'X', x: 290, y: 250, width: 12, height: 20 },
] };
test('geometric proposal associates whole and split half tokens to the correct row and column', () => {
  const proposal = proposeTable(image);
  assert.deepEqual(proposal.columns.map(c => c.code), ['64.10', '65.1']);
  assert.deepEqual(proposal.rows.map(r => r.size), [37, 38]);
  assert.equal(proposal.cells.find(c => c.code === '64.10' && c.baseSize === 37)?.mark, 'half');
  assert.equal(proposal.cells.find(c => c.code === '65.1' && c.baseSize === 38)?.mark, 'whole');
  assert.ok(proposal.cells.every(c => !c.reviewed));
});
test('absence of OCR tokens is pending, never automatic empty', () => {
  const cells = buildCells(image, [{ code: '65.1', brand: 'Adidas', x: 300 }], [{ size: 37, y: 210 }]);
  assert.equal(cells[0].mark, 'pending');
  assert.equal(cells[0].reviewed, false);
});
test('unrecognized tables are editable but do not invent data', () => {
  assert.deepEqual(proposeTable({ ...image, tokens: [] }).cells, []);
});
