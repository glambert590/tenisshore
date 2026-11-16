import * as FS from "expo-file-system/legacy";
import { uuid } from "expo-modules-core";
import { nativeApi } from "../../modules/tenisshore-native";
import { stageRestore } from "../domain/restore";
import type { CatalogRepository } from "../data/repository";
import { ensureFolders, rootUri } from "./files";

export async function exportBackup(repo: CatalogRepository): Promise<string> {
  const products = await repo.list();
  const paths = products
    .flatMap((p) => [p.photoPath, p.thumbnailPath])
    .filter((p): p is string => p !== null);
  return nativeApi().createBackup(
    JSON.stringify({ version: 1, products }),
    rootUri,
    paths,
  );
}

export async function restoreBackup(
  repo: CatalogRepository,
  uri: string,
): Promise<number> {
  await ensureFolders();
  const extracted = await nativeApi().extractBackup(uri);
  try {
    const folder = extracted.folderUri.replace(/\/?$/, "/");
    return await stageRestore(
      JSON.parse(extracted.manifestJson),
      {
        validateImage: (path) => nativeApi().validateImage(folder + path),
        copyImage: async (path) => {
          const newPath = `photos/${uuid.v4()}.${path.split(".").pop()}`;
          await FS.copyAsync({ from: folder + path, to: rootUri + newPath });
          return newPath;
        },
        removeImage: (path) =>
          FS.deleteAsync(rootUri + path, { idempotent: true }),
      },
      (manifest) => repo.restore(manifest),
    );
  } finally {
    await FS.deleteAsync(extracted.folderUri, { idempotent: true }).catch(
      () => undefined,
    );
  }
}
