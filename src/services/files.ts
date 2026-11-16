import * as FS from "expo-file-system/legacy";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { uuid } from "expo-modules-core";

export const rootUri = FS.documentDirectory ?? "";
export function photoUri(relative: string | null): string | null {
  return relative ? rootUri + relative : null;
}
export async function ensureFolders(): Promise<void> {
  if (!rootUri)
    throw new Error("No se puede abrir el almacenamiento del teléfono.");
  await FS.makeDirectoryAsync(rootUri + "photos", { intermediates: true });
  await FS.makeDirectoryAsync(rootUri + "imports", { intermediates: true });
}
export async function keepImage(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  await ensureFolders();
  const result = await manipulateAsync(
    uri,
    [
      {
        resize:
          width >= height
            ? { width: Math.min(width, 3000) }
            : { height: Math.min(height, 3000) },
      },
    ],
    { compress: 0.95, format: SaveFormat.JPEG },
  );
  const dest = `${rootUri}imports/${uuid.v4()}.jpg`;
  await FS.copyAsync({ from: result.uri, to: dest });
  return dest;
}
export async function savePhoto(
  uri: string,
): Promise<{ photoPath: string; thumbnailPath: string }> {
  await ensureFolders();
  const source = await manipulateAsync(uri, [], {
    compress: 0.9,
    format: SaveFormat.JPEG,
  });
  const main = await manipulateAsync(
    source.uri,
    [
      {
        resize:
          source.width >= source.height
            ? { width: Math.min(1400, source.width) }
            : { height: Math.min(1400, source.height) },
      },
    ],
    { compress: 0.88, format: SaveFormat.JPEG },
  );
  const thumb = await manipulateAsync(
    main.uri,
    [{ resize: { width: Math.min(320, main.width) } }],
    { compress: 0.8, format: SaveFormat.JPEG },
  );
  const id = uuid.v4(),
    photoPath = `photos/${id}.jpg`,
    thumbnailPath = `photos/${id}-thumb.jpg`;
  await FS.copyAsync({ from: main.uri, to: rootUri + photoPath });
  await FS.copyAsync({ from: thumb.uri, to: rootUri + thumbnailPath });
  return { photoPath, thumbnailPath };
}
export async function removeFile(uri: string): Promise<void> {
  await FS.deleteAsync(uri, { idempotent: true });
}
