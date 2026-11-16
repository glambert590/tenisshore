import Share, { Social } from "react-native-share";
import { nativeApi } from "../../modules/tenisshore-native";
import type { Product } from "../domain/types";
import { photoUri } from "./files";

export async function prepareShare(products: Product[]): Promise<string[]> {
  const uris: string[] = [];
  for (const p of products) {
    if (p.priceCents === null || !p.photoPath || !p.brand)
      throw new Error("Completa la ficha antes de compartir.");
    uris.push(
      await nativeApi().renderCard(
        photoUri(p.photoPath)!,
        p.brand,
        p.code,
        (p.priceCents / 100).toFixed(2),
        p.availableSizes.join(" · "),
      ),
    );
  }
  return uris;
}

export async function openWhatsApp(uris: string[]): Promise<void> {
  const regular = await Share.isPackageInstalled("com.whatsapp");
  const business = regular.isInstalled
    ? false
    : (await Share.isPackageInstalled("com.whatsapp.w4b")).isInstalled;
  try {
    if (regular.isInstalled || business) {
      await Share.shareSingle({
        social: regular.isInstalled ? Social.Whatsapp : Social.Whatsappbusiness,
        urls: uris,
        type: "image/jpeg",
      });
    } else {
      await Share.open({
        urls: uris,
        type: "image/jpeg",
        title: "Compartir productos",
        failOnCancel: false,
      });
    }
  } catch (error) {
    if (
      error instanceof Error &&
      /cancel|dismiss|not share/i.test(error.message)
    )
      return;
    throw error;
  }
}
