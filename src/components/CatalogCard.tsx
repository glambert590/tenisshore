import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { Product } from "../domain/types";
import { missingFields } from "../domain/catalog";
import { photoUri } from "../services/files";
import { colors } from "./ui";

export function CatalogCard({
  product,
  selected,
  width,
  onOpen,
  onSelect,
  onShare,
}: {
  product: Product;
  selected: boolean;
  width: number;
  onOpen: () => void;
  onSelect: () => void;
  onShare: () => void;
}) {
  const hasStock =
    product.availabilityKnown && product.availableSizes.length > 0;
  const incomplete = missingFields(product).length > 0;
  const status = !product.availabilityKnown
    ? "Por revisar"
    : !hasStock
      ? "Sin stock"
      : incomplete
        ? "Completar"
        : "Disponible";
  const statusColor =
    !hasStock && product.availabilityKnown
      ? colors.muted
      : incomplete
        ? colors.warning
        : colors.accent;
  const statusBg =
    !hasStock && product.availabilityKnown
      ? "#EDF0EE"
      : incomplete
        ? "#FFF1DA"
        : "#E5F3EB";
  return (
    <View
      style={[
        card.container,
        {
          width,
          borderColor: selected ? colors.accent : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Ver ficha ${product.brand ?? ""} ${product.code}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View style={card.photo}>
          {product.photoPath ? (
            <Image
              source={{
                uri: photoUri(product.thumbnailPath ?? product.photoPath)!,
              }}
              resizeMode="contain"
              style={card.image}
              accessibilityLabel={`Foto del modelo ${product.code}`}
            />
          ) : (
            <Text style={card.placeholder}>Foto pendiente</Text>
          )}
        </View>
        <View style={card.body}>
          <Text style={card.brand} numberOfLines={1}>
            {product.brand ?? "Marca pendiente"}
          </Text>
          <Text style={card.code} numberOfLines={1}>
            {product.code}
          </Text>
          <Text style={card.price}>
            {product.priceCents === null
              ? "Precio pendiente"
              : `$${(product.priceCents / 100).toFixed(2)}`}
            <Text style={card.currency}>
              {product.priceCents === null ? "" : " USD"}
            </Text>
          </Text>
          <View style={[card.badge, { backgroundColor: statusBg }]}>
            <Text
              style={{ color: statusColor, fontSize: 11, fontWeight: "600" }}
            >
              {status}
            </Text>
          </View>
          <Text style={card.sizes} numberOfLines={2}>
            {!product.availabilityKnown
              ? "Tallas por confirmar"
              : product.availableSizes.length
                ? `Tallas ${product.availableSizes.join(" · ")}`
                : "Sin tallas disponibles"}
          </Text>
          {product.updatedAt && (
            <Text
              style={card.updated}
              accessibilityLabel={`Disponibilidad actualizada ${new Date(product.updatedAt).toLocaleString("es")}`}
              numberOfLines={1}
            >
              Act. {new Date(product.updatedAt).toLocaleDateString("es")}
            </Text>
          )}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`Seleccionar modelo ${product.code}`}
        accessibilityState={{ checked: selected }}
        onPress={onSelect}
        style={card.selectTarget}
      >
        <View
          style={[
            card.checkbox,
            {
              backgroundColor: selected ? colors.accent : "white",
              borderColor: selected ? colors.accent : "#6B8879",
            },
          ]}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
            {selected ? "✓" : ""}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Compartir modelo ${product.code}`}
        onPress={onShare}
        style={({ pressed }) => [card.share, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Text style={card.shareText}>Compartir</Text>
      </Pressable>
    </View>
  );
}

const card = StyleSheet.create({
  container: { backgroundColor: "white", borderRadius: 18, overflow: "hidden" },
  photo: {
    height: 134,
    backgroundColor: "#F8FAF8",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  image: { width: "100%", height: "100%" },
  placeholder: { color: colors.muted, fontSize: 12 },
  body: { padding: 12, gap: 5 },
  brand: { color: colors.muted, fontSize: 12, fontWeight: "500" },
  code: { fontSize: 16, color: colors.ink, fontWeight: "700" },
  price: { fontSize: 19, fontWeight: "700", color: colors.accent },
  currency: { fontSize: 10, color: colors.muted, fontWeight: "500" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginTop: 2,
  },
  sizes: { color: colors.muted, fontSize: 11, lineHeight: 17, minHeight: 34 },
  updated: { color: colors.muted, fontSize: 10, marginTop: 2 },
  selectTarget: {
    position: "absolute",
    right: 2,
    top: 2,
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  share: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderColor: "#E9EFEB",
  },
  shareText: { color: colors.accent, fontSize: 12, fontWeight: "600" },
});
