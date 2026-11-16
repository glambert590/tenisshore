import { validateBackup } from "./catalog.ts";
import type { BackupManifest } from "./types.ts";

interface RestoreFiles {
  validateImage(relative: string): Promise<void>;
  copyImage(relative: string): Promise<string>;
  removeImage(relative: string): Promise<void>;
}
export async function stageRestore(
  value: unknown,
  files: RestoreFiles,
  apply: (manifest: BackupManifest) => Promise<void>,
): Promise<number> {
  const manifest = validateBackup(value);
  const paths = new Set(
    manifest.products
      .flatMap((p) => [p.photoPath, p.thumbnailPath])
      .filter((p): p is string => p !== null),
  );
  const copies = new Map<string, string>();
  try {
    for (const path of paths) await files.validateImage(path);
    for (const path of paths) copies.set(path, await files.copyImage(path));
    const products = manifest.products.map((p) => ({
      ...p,
      photoPath: p.photoPath ? copies.get(p.photoPath)! : null,
      thumbnailPath: p.thumbnailPath ? copies.get(p.thumbnailPath)! : null,
    }));
    await apply({ version: 1, products });
    return products.length;
  } catch (error) {
    await Promise.all(
      [...copies.values()].map((path) =>
        files.removeImage(path).catch(() => undefined),
      ),
    );
    throw error;
  }
}
