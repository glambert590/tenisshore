import { useCallback, useState } from "react";
import { Image, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCatalog } from "../src/data/context";
import { shareBatches } from "../src/domain/catalog";
import type { Product } from "../src/domain/types";
import { openWhatsApp, prepareShare } from "../src/services/share";
import { Button, Screen, reportError, styles } from "../src/components/ui";

export default function ShareScreen() {
  const { codes } = useLocalSearchParams<{ codes?: string }>();
  const repo = useCatalog();
  const [batches, setBatches] = useState<Product[][]>([]),
    [excluded, setExcluded] = useState<Product[]>([]);
  const [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [images, setImages] = useState<string[]>([]);
  useFocusEffect(
    useCallback(() => {
      repo
        .list()
        .then((products) => {
          const keys = new Set<string>(JSON.parse(codes ?? "[]"));
          const result = shareBatches(products.filter((p) => keys.has(p.code)));
          setBatches(result.batches);
          setExcluded(result.excluded);
        })
        .catch(reportError);
    }, [repo, codes]),
  );
  async function prepare() {
    setBusy(true);
    try {
      setImages(await prepareShare(batches[index]));
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    setBusy(true);
    try {
      await openWhatsApp(images);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Listos para el cliente</Text>
      {excluded.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>
            Sin incluir: {excluded.map((p) => p.code).join(", ")}
          </Text>
          <Text style={styles.note}>
            Completa foto, marca, precio y disponibilidad antes de compartir
            estos modelos.
          </Text>
        </View>
      )}
      {!batches.length ? (
        <Text style={styles.subtitle}>
          No hay productos completos con disponibilidad para compartir.
        </Text>
      ) : (
        <>
          <Text style={styles.subtitle}>
            Lote {index + 1} de {batches.length} · {batches[index]?.length ?? 0}{" "}
            productos
          </Text>
          <Text style={styles.note}>
            Elegirás el contacto y confirmarás el envío dentro de WhatsApp.
            Puedes revisar aquí las imágenes preparadas.
          </Text>
          <Button
            title={busy ? "Preparando…" : "Preparar imágenes de este lote"}
            onPress={prepare}
            disabled={busy}
          />
          {images.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={{ width: "100%", height: 300 }}
              resizeMode="contain"
              accessibilityLabel="Vista previa del producto para compartir"
            />
          ))}
          <Button
            title="Abrir WhatsApp con este lote"
            onPress={send}
            disabled={busy || !images.length}
          />
          {index + 1 < batches.length && (
            <Button
              title="Pasar al siguiente lote"
              secondary
              onPress={() => {
                setIndex(index + 1);
                setImages([]);
              }}
              disabled={busy}
            />
          )}
          <Text style={styles.note}>
            Volver de WhatsApp no confirma que el mensaje se haya enviado o
            entregado.
          </Text>
        </>
      )}
    </Screen>
  );
}
