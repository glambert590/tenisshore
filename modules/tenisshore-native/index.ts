import { requireOptionalNativeModule } from "expo-modules-core";
import type { OcrResult } from "../../src/domain/types";

export interface NativeApi {
  recognize(uri: string): Promise<OcrResult>;
  validateImage(uri: string): Promise<void>;
  rectify(
    uri: string,
    corners: number[],
  ): Promise<{ uri: string; width: number; height: number }>;
  renderCard(
    uri: string,
    brand: string,
    code: string,
    price: string,
    sizes: string,
  ): Promise<string>;
  createBackup(
    manifest: string,
    rootUri: string,
    relativePaths: string[],
  ): Promise<string>;
  extractBackup(
    zipUri: string,
  ): Promise<{ folderUri: string; manifestJson: string }>;
}
export function nativeApi(): NativeApi {
  const module = requireOptionalNativeModule<NativeApi>("TenisshoreNative");
  if (!module)
    throw new Error(
      "Instala la compilación Android de Tenisshore. Esta función no está disponible en Expo Go.",
    );
  return module;
}
