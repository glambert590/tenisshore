import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCatalog } from "../src/data/context";
import type { Product } from "../src/domain/types";
import { filterProducts, missingFields } from "../src/domain/catalog";
import { photoUri } from "../src/services/files";
import {
  Button,
  Field,
  Screen,
  colors,
  reportError,
  styles,
} from "../src/components/ui";

export default function CatalogScreen() {
  const repo = useCatalog();
  const [products, setProducts] = useState<Product[]>([]);
  const [code, setCode] = useState(""),
    [brand, setBrand] = useState(""),
    [size, setSize] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      repo.list().then(setProducts).catch(reportError);
    }, [repo]),
  );
  const sizeNumber = size.trim() ? Number(size.replace(",", ".")) : undefined;
  const invalidSize =
    sizeNumber !== undefined &&
    (!Number.isFinite(sizeNumber) ||
      sizeNumber <= 0 ||
      !Number.isInteger(sizeNumber * 2));
  const visible = useMemo(
    () =>
      invalidSize
        ? []
        : filterProducts(products, { code, brand, size: sizeNumber }),
    [products, code, brand, sizeNumber, invalidSize],
  );
  const brands = [
    ...new Set(products.map((p) => p.brand).filter((b): b is string => !!b)),
  ].sort();
  function toggle(value: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }
  function share(codes: string[]) {
    router.push({
      pathname: "/share",
      params: { codes: JSON.stringify(codes) },
    });
  }
  return (
    <Screen scroll={false}>
      <FlatList
        data={visible}
        keyExtractor={(p) => p.code}
        contentContainerStyle={styles.body}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        ListHeaderComponent={
          <View style={{ gap: 14 }}>
            <Text style={styles.title}>Encuentra el par ideal</Text>
            <Text style={styles.subtitle}>
              Tu catálogo, listo para consultar y compartir.
            </Text>
            <View style={styles.row}>
              <Button
                title="Importar fotos"
                onPress={() => router.push("/imports")}
              />
              <Button
                title="Nuevo modelo"
                secondary
                onPress={() => router.push("/product")}
              />
              <Button
                title="Copias"
                secondary
                onPress={() => router.push("/settings")}
              />
            </View>
            <Field
              label="Buscar código"
              value={code}
              onChangeText={(value) => {
                setCode(value);
                setSelected(new Set());
              }}
              placeholder="Ej. 64.10"
              autoCapitalize="none"
            />
            <Field
              label="Talla exacta"
              value={size}
              onChangeText={(value) => {
                setSize(value);
                setSelected(new Set());
              }}
              placeholder="Ej. 36 o 37.5"
              keyboardType="decimal-pad"
            />
            {invalidSize && (
              <Text accessibilityRole="alert" style={{ color: colors.warning }}>
                Introduce una talla entera o media talla.
              </Text>
            )}
            <Text style={styles.label}>Marca</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {["", ...brands].map((b) => (
                <Pressable
                  key={b || "all"}
                  onPress={() => {
                    setBrand(b);
                    setSelected(new Set());
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: brand === b }}
                  style={{
                    padding: 12,
                    borderRadius: 24,
                    backgroundColor: b === brand ? colors.accent : "white",
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ color: b === brand ? "white" : colors.ink }}>
                    {b || "Todas"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.label}>
              {visible.length} modelos · {selected.size} seleccionados
            </Text>
            <View style={styles.row}>
              <Button
                title={
                  selected.size === visible.length && selected.size > 0
                    ? "Quitar selección"
                    : "Seleccionar todos"
                }
                secondary
                disabled={!visible.length}
                onPress={() =>
                  setSelected(
                    selected.size === visible.length
                      ? new Set()
                      : new Set(visible.map((p) => p.code)),
                  )
                }
              />
              <Button
                title="WhatsApp"
                disabled={!selected.size}
                onPress={() =>
                  share(
                    visible
                      .filter((p) => selected.has(p.code))
                      .map((p) => p.code),
                  )
                }
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.card, { marginTop: 14 }]}>
            <Text style={styles.subtitle}>
              {products.length
                ? "No hay modelos que coincidan. Prueba otra talla o marca."
                : "Tu catálogo está vacío. Añade un modelo o importa las fotos del dueño."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { marginTop: 14 }]}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/product",
                  params: { code: item.code },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Editar ${item.brand ?? "modelo"} ${item.code}`}
            >
              {item.photoPath ? (
                <Image
                  source={{
                    uri: photoUri(item.thumbnailPath ?? item.photoPath)!,
                  }}
                  style={{ width: "100%", height: 190, borderRadius: 8 }}
                  resizeMode="contain"
                  accessibilityLabel={`Foto del modelo ${item.code}`}
                />
              ) : (
                <View style={{ height: 100, justifyContent: "center" }}>
                  <Text style={styles.note}>Foto pendiente</Text>
                </View>
              )}
              <Text
                style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}
              >
                {item.brand ?? "Marca pendiente"} · {item.code}
              </Text>
              <Text style={styles.subtitle}>
                {item.priceCents === null
                  ? "Precio pendiente"
                  : `${(item.priceCents / 100).toFixed(2)} USD`}
              </Text>
              <Text style={styles.note}>
                {!item.availabilityKnown
                  ? "Disponibilidad pendiente"
                  : item.availableSizes.length
                    ? `Tallas: ${item.availableSizes.join(" · ")}`
                    : "Sin disponibilidad"}
              </Text>
              {item.updatedAt && (
                <Text style={styles.note}>
                  Disponibilidad:{" "}
                  {new Date(item.updatedAt).toLocaleString("es")}
                </Text>
              )}
              {missingFields(item).length > 0 && (
                <Text style={{ color: colors.warning }}>
                  Pendiente: {missingFields(item).join(", ")}
                </Text>
              )}
            </Pressable>
            <View style={styles.row}>
              <Button
                title={
                  selected.has(item.code) ? "✓ Seleccionado" : "Seleccionar"
                }
                secondary
                onPress={() => toggle(item.code)}
              />
              <Button title="Compartir" onPress={() => share([item.code])} />
            </View>
          </View>
        )}
      />
    </Screen>
  );
}
