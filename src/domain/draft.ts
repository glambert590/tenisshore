import { normalizeCode, parsePrice } from "./catalog.ts";
import type { ImportDraft, ProductPatch } from "./types.ts";

export function draftPriceText(draft: ImportDraft): string {
  return (
    draft.priceText ??
    (draft.patch.priceCents === undefined || draft.patch.priceCents === null
      ? ""
      : (draft.patch.priceCents / 100).toFixed(2))
  );
}
export function editDraftPrice(draft: ImportDraft, text: string): ImportDraft {
  return { ...draft, priceText: text, reviewed: false };
}
export function editDraftBrand(draft: ImportDraft, text: string): ImportDraft {
  return { ...draft, patch: { ...draft.patch, brand: text }, reviewed: false };
}
export function approveCardPatch(draft: ImportDraft): ProductPatch {
  const patch = { ...draft.patch, code: normalizeCode(draft.patch.code) };
  patch.brand = patch.brand?.trim() || undefined;
  delete patch.priceCents;
  const price = draftPriceText(draft).trim();
  if (price) patch.priceCents = parsePrice(price);
  return patch;
}
