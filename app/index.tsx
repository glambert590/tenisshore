import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useCatalog } from "../src/data/context";
import type { Product } from "../src/domain/types";
import { filterProducts } from "../src/domain/catalog";
import { CatalogCard } from "../src/components/CatalogCard";
import { Button, Screen, colors, reportError } from "../src/components/ui";

export default function CatalogScreen() {
  const repo = useCatalog();
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 350 || fontScale >= 1.4 ? 1 : 2;
  const cardWidth = (width - 36 - (columns - 1) * 12) / columns;
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [code, setCode] = useState(""),
    [brand, setBrand] = useState(""),
    [size, setSize] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([repo.list(), repo.listDrafts()])
        .then(([models, drafts]) => {
          if (active) {
            setProducts(models);
            setPendingCount(drafts.length);
          }
        })
        .catch(reportError);
      return () => {
        active = false;
      };
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
  const availableCount = products.filter(
    (p) => p.availabilityKnown && p.availableSizes.length > 0,
  ).length;
  const selectedCodes = visible
    .filter((p) => selected.has(p.code))
    .map((p) => p.code);
  const allSelected =
    visible.length > 0 && selectedCodes.length === visible.length;
  const hasFilters = !!(code || brand || size);
  function clearFilters() {
    setCode("");
    setBrand("");
    setSize("");
    setSelected(new Set());
  }
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
        key={columns}
        numColumns={columns}
        data={visible}
        keyExtractor={(p) => p.code}
        style={{ flex: 1 }}
        contentContainerStyle={home.list}
        columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={home.header}>
            <View style={home.headingRow}>
              <View style={{ flex: 1 }}>
                <Text style={home.title}>Tu catálogo</Text>
                <Text style={home.subtitle}>Busca, selecciona y comparte.</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Copias de seguridad"
                onPress={() => router.push("/settings")}
                style={home.utility}
              >
                <Text style={home.utilityText}>Copias</Text>
              </Pressable>
            </View>
            <View style={home.metrics}>
              <View style={home.metric}>
                <Text style={home.metricValue}>{products.length}</Text>
                <Text style={home.metricLabel}>Modelos</Text>
              </View>
              <View style={home.metric}>
                <Text style={home.metricValue}>{availableCount}</Text>
                <Text style={home.metricLabel}>Con tallas</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Revisar pendientes (${pendingCount})`}
                onPress={() => router.push("/imports")}
                style={[home.metric, home.pendingMetric]}
              >
                <Text style={[home.metricValue, { color: "#8A4B08" }]}>
                  {pendingCount}
                </Text>
                <Text style={[home.metricLabel, { color: "#8A4B08" }]}>
                  Pendientes ›
                </Text>
              </Pressable>
            </View>
            <View style={home.actions}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Añadir fotos"
                  onPress={() => router.push("/imports")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Nuevo modelo"
                  secondary
                  onPress={() => router.push("/product")}
                />
              </View>
            </View>
            <View style={home.searchRow}>
              <TextInput
                accessibilityLabel="Buscar por código"
                placeholder="Buscar por código"
                placeholderTextColor="#71867B"
                style={[home.input, { flex: 1 }]}
                value={code}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                onChangeText={(value) => {
                  setCode(value);
                  setSelected(new Set());
                }}
              />
              <TextInput
                accessibilityLabel="Talla exacta"
                placeholder="Talla"
                placeholderTextColor="#71867B"
                style={[home.input, { width: 90 }]}
                value={size}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                onChangeText={(value) => {
                  setSize(value);
                  setSelected(new Set());
                }}
              />
            </View>
            {invalidSize && (
              <Text accessibilityRole="alert" style={home.warning}>
                Introduce una talla entera o media talla, por ejemplo 37.5.
              </Text>
            )}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={home.brands}
            >
              {["", ...brands].map((b) => (
                <Pressable
                  key={b || "all"}
                  accessibilityRole="button"
                  accessibilityState={{ selected: brand === b }}
                  onPress={() => {
                    setBrand(b);
                    setSelected(new Set());
                  }}
                  style={[home.brand, brand === b && home.activeBrand]}
                >
                  <Text
                    style={[home.brandText, brand === b && { color: "white" }]}
                  >
                    {b || "Todas las marcas"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={home.resultsRow}>
              <Text style={home.resultCount}>{visible.length} modelos</Text>
              {hasFilters && (
                <Pressable
                  accessibilityRole="button"
                  onPress={clearFilters}
                  style={home.textTarget}
                >
                  <Text style={home.textAction}>Limpiar filtros</Text>
                </Pressable>
              )}
              {visible.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    setSelected(
                      allSelected
                        ? new Set()
                        : new Set(visible.map((p) => p.code)),
                    )
                  }
                  style={home.textTarget}
                >
                  <Text style={home.textAction}>
                    {allSelected ? "Quitar selección" : "Seleccionar todos"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={home.empty}>
            <Text style={home.emptyTitle}>
              {products.length
                ? "No encontramos modelos"
                : "Tu catálogo empieza aquí"}
            </Text>
            <Text style={home.emptyText}>
              {products.length
                ? "Prueba otra marca o talla, o limpia los filtros."
                : "Añade las fotos de tus modelos o crea una ficha manual. Los pendientes quedarán guardados para revisarlos después."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <CatalogCard
            product={item}
            selected={selected.has(item.code)}
            width={cardWidth}
            onOpen={() =>
              router.push({ pathname: "/product", params: { code: item.code } })
            }
            onSelect={() => toggle(item.code)}
            onShare={() => share([item.code])}
          />
        )}
      />
      {selectedCodes.length > 0 && (
        <View style={home.selectionBar}>
          <View style={{ flex: 1 }}>
            <Button
              title={`Compartir ${selectedCodes.length} por WhatsApp`}
              onPress={() => share(selectedCodes)}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar selección"
            onPress={() => setSelected(new Set())}
            style={home.clearSelection}
          >
            <Text style={home.textAction}>Quitar</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const home = StyleSheet.create({
  list: { padding: 18, gap: 12, paddingBottom: 28 },
  header: { gap: 12, paddingBottom: 4 },
  headingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: {
    fontSize: 25,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 12, color: colors.muted, marginTop: 4 },
  utility: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  utilityText: { fontSize: 12, fontWeight: "600", color: colors.ink },
  metrics: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#DCE6DF",
    minHeight: 76,
    justifyContent: "center",
  },
  pendingMetric: { backgroundColor: "#FFF3DF", borderColor: "#EDD6B1" },
  metricValue: { fontSize: 23, fontWeight: "700", color: colors.accent },
  metricLabel: { fontSize: 11, color: colors.muted, marginTop: 3 },
  actions: { flexDirection: "row", gap: 10 },
  searchRow: { flexDirection: "row", gap: 10 },
  input: {
    height: 48,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 15,
    color: colors.ink,
  },
  warning: { fontSize: 12, color: colors.warning },
  brands: { gap: 8 },
  brand: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
  },
  activeBrand: { backgroundColor: colors.accent, borderColor: colors.accent },
  brandText: { fontSize: 12, color: colors.ink, fontWeight: "500" },
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 12,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
    marginRight: "auto",
  },
  textTarget: { minHeight: 44, justifyContent: "center" },
  textAction: { color: colors.accent, fontSize: 12, fontWeight: "600" },
  empty: {
    padding: 24,
    backgroundColor: "white",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.ink },
  emptyText: { fontSize: 14, lineHeight: 22, color: colors.muted },
  selectionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  clearSelection: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
