export interface Product {
  code: string;
  brand: string | null;
  priceCents: number | null;
  photoPath: string | null;
  thumbnailPath: string | null;
  availableSizes: number[];
  availabilityKnown: boolean;
  updatedAt: string | null;
}
export type CellMark = "whole" | "half" | "empty" | "pending";
export interface AvailabilityRow {
  code: string;
  brand: string | null;
  baseSize: number;
  mark: CellMark;
  reviewed: boolean;
}
export interface OcrToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface OcrResult {
  width: number;
  height: number;
  tokens: OcrToken[];
  elapsedMs: number;
}
export interface TableColumn {
  code: string;
  brand: string | null;
  x: number;
}
export interface TableRow {
  size: number;
  y: number;
}
export interface TableProposal {
  columns: TableColumn[];
  rows: TableRow[];
  cells: AvailabilityRow[];
}
export interface ProductPatch {
  code: string;
  brand?: string | null;
  priceCents?: number | null;
  photoPath?: string | null;
  thumbnailPath?: string | null;
}
export interface ImportDraft {
  id: string;
  kind: "table" | "card";
  imageUri: string;
  ocr: OcrResult;
  columns: TableColumn[];
  rows: TableRow[];
  cells: AvailabilityRow[];
  patch: ProductPatch;
  priceText?: string;
  reviewed: boolean;
}
export interface BackupManifest {
  version: 1;
  products: Product[];
}
