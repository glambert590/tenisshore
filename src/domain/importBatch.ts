import { parseCard } from "./catalog.ts";
import { proposeTable } from "./table.ts";
import type { ImportDraft, OcrResult } from "./types.ts";

interface SelectedImage {
  uri: string;
  width: number;
  height: number;
}
export interface ImageImportPorts {
  pick(options: {
    mediaTypes: "images"[];
    allowsMultipleSelection: boolean;
    allowsEditing: boolean;
    selectionLimit: number;
    quality: number;
  }): Promise<{ canceled: boolean; assets: SelectedImage[] | null }>;
  keepImage(image: SelectedImage): Promise<string>;
  recognize(uri: string): Promise<OcrResult>;
  makeId(): string;
  saveDraft(draft: ImportDraft): Promise<void>;
  onDraft(draft: ImportDraft): void;
  onProgress(index: number, total: number): void;
}

export async function pickAndImportImages(
  kind: ImportDraft["kind"],
  ports: ImageImportPorts,
): Promise<{ imported: number; errors: string[] }> {
  const selected = await ports.pick({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    allowsEditing: false,
    selectionLimit: 0,
    quality: 1,
  });
  if (selected.canceled || !selected.assets?.length)
    return { imported: 0, errors: [] };
  let imported = 0;
  const errors: string[] = [];
  // Keep only one full-resolution image in processing at a time, regardless of batch size.
  for (const [index, asset] of selected.assets.entries()) {
    ports.onProgress(index + 1, selected.assets.length);
    try {
      const imageUri = await ports.keepImage(asset);
      const ocr = await ports.recognize(imageUri);
      const proposal =
        kind === "table"
          ? proposeTable(ocr)
          : { columns: [], rows: [], cells: [] };
      const fields = parseCard(ocr.tokens.map((t) => t.text).join(" "));
      const draft: ImportDraft = {
        id: ports.makeId(),
        kind,
        imageUri,
        ocr,
        ...proposal,
        patch: {
          code: kind === "card" ? (fields.code ?? "") : "",
          ...(kind === "card" && fields.priceCents !== null
            ? { priceCents: fields.priceCents }
            : {}),
        },
        reviewed: false,
      };
      await ports.saveDraft(draft);
      ports.onDraft(draft);
      imported++;
    } catch (error) {
      errors.push(
        `Imagen ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { imported, errors };
}
