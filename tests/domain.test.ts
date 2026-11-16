import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCode,
  parsePrice,
  parseMark,
  applyRows,
  reviewIssues,
  shareBatches,
  filterProducts,
  parseCard,
  validateBackup,
} from "../src/domain/catalog.ts";
import type { Product, AvailabilityRow } from "../src/domain/types.ts";

const product = (code = "64.10"): Product => ({
  code,
  brand: "Adidas",
  priceCents: 3500,
  photoPath: "photos/a.jpg",
  thumbnailPath: null,
  availableSizes: [36, 37, 37.5, 46],
  availabilityKnown: true,
  updatedAt: null,
});
const row = (
  mark: AvailabilityRow["mark"],
  reviewed = true,
): AvailabilityRow => ({
  code: "64.10",
  baseSize: 37,
  mark,
  reviewed,
  brand: "Adidas",
});

test("codes stay strings including trailing zero and comma separator", () => {
  assert.equal(normalizeCode(" 64,10 "), "64.10");
  assert.notEqual(normalizeCode("64.10"), normalizeCode("64.1"));
  assert.throws(() => normalizeCode(""));
});
test("prices are exact cents, with USD suffix and comma decimal", () => {
  assert.equal(parsePrice("35USD"), 3500);
  assert.equal(parsePrice("35,50"), 3550);
  assert.equal(parsePrice("0"), 0);
  for (const value of ["-1", "3.555", "NaN", "3abc", ""])
    assert.throws(() => parsePrice(value));
});
test("OCR marks distinguish half from whole and unknown from empty", () => {
  assert.equal(parseMark("X"), "whole");
  assert.equal(parseMark("X ½"), "half");
  assert.equal(parseMark("X 1/2"), "half");
  assert.equal(parseMark("½"), "pending");
  assert.equal(parseMark(""), "empty");
  assert.equal(parseMark("?"), "pending");
});
test("X means whole only and leaves rows outside scope alone", () => {
  const result = applyRows(product(), [row("whole")], "now");
  assert.deepEqual(result.availableSizes, [36, 37, 46]);
});
test("X half means half only, not both sizes", () => {
  assert.deepEqual(
    applyRows(product(), [row("half")], "now").availableSizes,
    [36, 37.5, 46],
  );
});
test("confirmed empty removes both sizes in that row only", () => {
  assert.deepEqual(
    applyRows(product(), [row("empty")], "now").availableSizes,
    [36, 46],
  );
});
test("unreviewed or illegible cells cannot overwrite availability", () => {
  assert.throws(() => applyRows(product(), [row("empty", false)], "now"));
  assert.throws(() => applyRows(product(), [row("pending")], "now"));
});
test("contradictory duplicate cells require resolution", () => {
  assert.ok(reviewIssues([row("whole"), row("half")]).length > 0);
  assert.equal(reviewIssues([row("whole"), row("whole")]).length, 0);
});
test("filters combine brand, exact size, and code", () => {
  const products = [product(), { ...product("71.10"), brand: "Nike" }];
  assert.equal(
    filterProducts(products, { brand: "adidas", size: 37.5, code: "64" })
      .length,
    1,
  );
  assert.equal(filterProducts(products, { size: 35 }).length, 0);
  assert.equal(
    filterProducts([{ ...product(), availabilityKnown: false }], { size: 37 })
      .length,
    0,
  );
});
test("share excludes incomplete products and batches 20 without dropping any", () => {
  const products = Array.from({ length: 43 }, (_, i) => product(String(i)));
  products.push({ ...product("bad"), photoPath: null });
  const result = shareBatches(products);
  assert.deepEqual(
    result.batches.map((b) => b.length),
    [20, 20, 3],
  );
  assert.equal(result.excluded[0].code, "bad");
  assert.equal(
    shareBatches([{ ...product(), availableSizes: [] }]).batches.length,
    0,
  );
});
test("card parser extracts code and USD price without inferring logo or availability", () => {
  const card = parseCard("CÓDIGO 71.10\nTALLA 44.5 45\n35USD");
  assert.equal(card.code, "71.10");
  assert.equal(card.priceCents, 3500);
  assert.equal(parseCard("tenis sin etiqueta").code, null);
});
test("backup validation rejects duplicate codes, invalid prices and path traversal", () => {
  const manifest = { version: 1, products: [product()] };
  assert.equal(validateBackup(manifest).products.length, 1);
  assert.throws(() => validateBackup({ ...manifest, version: 99 }));
  assert.throws(() =>
    validateBackup({ ...manifest, products: [product(), product()] }),
  );
  assert.throws(() =>
    validateBackup({
      ...manifest,
      products: [{ ...product(), photoPath: "../outside.jpg" }],
    }),
  );
  assert.throws(() =>
    validateBackup({
      ...manifest,
      products: [{ ...product(), priceCents: -1 }],
    }),
  );
});
