import { useEffect, useState } from "react";
import { Image, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Picker from "expo-image-picker";
import { useCatalog } from "../src/data/context";
import { blankProduct, normalizeCode, parsePrice } from "../src/domain/catalog";
import type { Product } from "../src/domain/types";
import { photoUri, savePhoto } from "../src/services/files";
import {
  Button,
  Field,
  Screen,
  reportError,
  styles,
} from "../src/components/ui";

export default function ProductScreen() {
  const { code: existingCode } = useLocalSearchParams<{ code?: string }>();
  const repo = useCatalog();
  const [original, setOriginal] = useState<Product | null>(null);
  const [code, setCode] = useState(""),
    [brand, setBrand] = useState(""),
    [price, setPrice] = useState(""),
    [sizes, setSizes] = useState("");
  const [known, setKnown] = useState(false),
    [image, setImage] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(!existingCode);
  useEffect(() => {
    if (existingCode)
      repo
        .list()
        .then((products) => {
          const p = products.find((p) => p.code === existingCode);
          if (!p) throw new Error("No se encontró el modelo.");
          setOriginal(p);
          setCode(p.code);
          setBrand(p.brand ?? "");
          setPrice(
            p.priceCents === null ? "" : (p.priceCents / 100).toFixed(2),
          );
          setSizes(p.availableSizes.join(" "));
          setKnown(p.availabilityKnown);
          setLoaded(true);
        })
        .catch(reportError);
  }, [existingCode, repo]);
  async function choosePhoto() {
    try {
      const result = await Picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) setImage(result.assets[0].uri);
    } catch (error) {
      reportError(error);
    }
  }
  async function save() {
    setBusy(true);
    try {
      const key = normalizeCode(code);
      if (!existingCode && (await repo.list()).some((p) => p.code === key))
        throw new Error("Ese código ya existe. Abre su ficha para editarlo.");
      const parsedSizes = [
        ...new Set(
          sizes.trim()
            ? sizes
                .trim()
                .split(/\s+/)
                .map((s) => Number(s.replace(",", ".")))
            : [],
        ),
      ].sort((a, b) => a - b);
      if (
        parsedSizes.some(
          (n) =>
            !Number.isFinite(n) ||
            n <= 0 ||
            n > 100 ||
            !Number.isInteger(n * 2),
        )
      )
        throw new Error("Separa las tallas con espacios. Ejemplo: 36 37.5 38.");
      if (!known && parsedSizes.length)
        throw new Error(
          "Activa «Disponibilidad confirmada» para guardar tallas.",
        );
      const photos = image ? await savePhoto(image) : {};
      const changed =
        known !== original?.availabilityKnown ||
        parsedSizes.join(",") !== (original?.availableSizes ?? []).join(",");
      await repo.save({
        ...(original ?? blankProduct(key)),
        ...photos,
        code: key,
        brand: brand.trim() || null,
        priceCents: price.trim() ? parsePrice(price) : null,
        availableSizes: known ? parsedSizes : [],
        availabilityKnown: known,
        updatedAt:
          changed && known
            ? new Date().toISOString()
            : (original?.updatedAt ?? null),
      });
      router.back();
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  const displayed = image ?? photoUri(original?.photoPath ?? null);
  return (
    <Screen>
      <Text style={styles.title}>
        {existingCode ? `Modelo ${existingCode}` : "Nuevo modelo"}
      </Text>
      {!existingCode && (
        <View style={styles.card}>
          <Button
            title="Fotos y pendientes"
            onPress={() => router.replace("/imports")}
            disabled={busy}
          />
          <Text style={styles.note}>
            Revisa lo que falta por guardar o entra para añadir varias fotos de
            tu catálogo. Tú eliges cuándo abrir la galería.
          </Text>
        </View>
      )}
      {!existingCode && (
        <Text style={styles.label}>O añadir un solo modelo manualmente</Text>
      )}
      {displayed && (
        <Image
          source={{ uri: displayed }}
          style={{ width: "100%", height: 230 }}
          resizeMode="contain"
          accessibilityLabel="Foto del producto"
        />
      )}
      <Button
        title="Elegir foto de este modelo"
        secondary
        onPress={choosePhoto}
        disabled={busy || !loaded}
      />
      <Text style={styles.note}>
        Recorta las etiquetas antiguas de precio o tallas para compartir solo
        los datos actuales.
      </Text>
      <Field
        label="Código único"
        value={code}
        editable={!existingCode && !busy}
        onChangeText={setCode}
        autoCapitalize="none"
      />
      <Field
        label="Marca"
        value={brand}
        onChangeText={setBrand}
        editable={!busy}
        placeholder="Ej. Adidas"
      />
      <Field
        label="Precio de venta (USD)"
        value={price}
        onChangeText={setPrice}
        editable={!busy}
        keyboardType="decimal-pad"
        placeholder="Ej. 35.00"
      />
      <View style={styles.row}>
        <Switch
          value={known}
          onValueChange={setKnown}
          disabled={busy}
          accessibilityLabel="Disponibilidad confirmada"
        />
        <Text style={styles.label}>Disponibilidad confirmada</Text>
      </View>
      {original?.updatedAt && (
        <Text style={styles.note}>
          Última actualización:{" "}
          {new Date(original.updatedAt).toLocaleString("es")}
        </Text>
      )}
      <Field
        label="Tallas disponibles, separadas por espacios"
        value={sizes}
        onChangeText={setSizes}
        editable={!busy && known}
        placeholder="36 37.5 38"
      />
      <Text style={styles.note}>
        Si la disponibilidad está confirmada y dejas las tallas vacías, el
        modelo queda sin existencias.
      </Text>
      <Button
        title={busy ? "Guardando…" : "Guardar modelo"}
        onPress={save}
        disabled={busy || !loaded}
      />
    </Screen>
  );
}
