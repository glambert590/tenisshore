import { test } from "node:test";
import assert from "node:assert/strict";
import {
  draftPriceText,
  editDraftPrice,
  approveCardPatch,
  editDraftBrand,
} from "../src/domain/draft.ts";
import type { ImportDraft } from "../src/domain/types.ts";
const draft: ImportDraft = {
  id: "a",
  kind: "card",
  imageUri: "file://test",
  ocr: { width: 1, height: 1, tokens: [], elapsedMs: 0 },
  columns: [],
  rows: [],
  cells: [],
  patch: { code: "71.10", priceCents: 3500 },
  reviewed: false,
};
test('multiword brands preserve the typed space until approval', () => {
  assert.equal(editDraftBrand(draft, 'New ').patch.brand, 'New ');
  assert.equal(approveCardPatch(editDraftBrand(draft, ' New Balance ')).brand, 'New Balance');
});
test("raw price survives serialized draft edits and is applied exactly on approval", () => {
  const changed = JSON.parse(
    JSON.stringify(editDraftPrice(draft, "39,50")),
  ) as ImportDraft;
  assert.equal(draftPriceText(changed), "39,50");
  assert.equal(approveCardPatch(changed).priceCents, 3950);
  assert.equal(changed.reviewed, false);
});
test("incomplete price persists but cannot be approved; clearing it preserves existing catalog price", () => {
  const changed = editDraftPrice(draft, "39,");
  assert.equal(draftPriceText(changed), "39,");
  assert.throws(() => approveCardPatch(changed));
  assert.equal(
    approveCardPatch(editDraftPrice(draft, "")).priceCents,
    undefined,
  );
});
