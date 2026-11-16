import { useState } from "react";
import { Image, Text, View } from "react-native";
import { nativeApi } from "../../modules/tenisshore-native";
import { Button, colors, reportError, styles } from "./ui";

const names = [
  "superior izquierda",
  "superior derecha",
  "inferior derecha",
  "inferior izquierda",
];
export function ImageCorners({
  uri,
  width,
  height,
  onApply,
}: {
  uri: string;
  width: number;
  height: number;
  onApply: (uri: string, width: number, height: number) => Promise<void>;
}) {
  const [points, setPoints] = useState([0, 0, 1, 0, 1, 1, 0, 1]);
  const [active, setActive] = useState(0),
    [viewWidth, setViewWidth] = useState(1),
    [busy, setBusy] = useState(false);
  async function apply() {
    setBusy(true);
    try {
      const cross = Array.from({ length: 4 }, (_, i) => {
        const next = (i + 1) % 4,
          after = (i + 2) % 4;
        return (
          (points[next * 2] - points[i * 2]) *
            (points[after * 2 + 1] - points[next * 2 + 1]) -
          (points[next * 2 + 1] - points[i * 2 + 1]) *
            (points[after * 2] - points[next * 2])
        );
      });
      if (!cross.every((n) => n > 0.0001))
        throw new Error("Marca las cuatro esquinas en orden, sin cruzarlas.");
      const result = await nativeApi().rectify(uri, points);
      await onApply(result.uri, result.width, result.height);
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  const viewHeight = (viewWidth * height) / Math.max(width, 1);
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.label}>Recortar y enderezar tabla / foto</Text>
      <Text style={styles.note}>
        Selecciona una esquina y tócala en la imagen. Incluye los códigos y la
        columna de tallas al recortar una tabla.
      </Text>
      <View
        onLayout={(e) => setViewWidth(e.nativeEvent.layout.width)}
        style={{
          width: "100%",
          aspectRatio: Math.max(width, 1) / Math.max(height, 1),
          backgroundColor: "#E4E9E3",
        }}
        onStartShouldSetResponder={() => !busy}
        onResponderRelease={(e) => {
          const x = Math.max(
            0,
            Math.min(1, e.nativeEvent.locationX / viewWidth),
          );
          const y = Math.max(
            0,
            Math.min(1, e.nativeEvent.locationY / viewHeight),
          );
          setPoints((old) =>
            old.map((value, index) =>
              index === active * 2 ? x : index === active * 2 + 1 ? y : value,
            ),
          );
          setActive((active + 1) % 4);
        }}
        accessibilityLabel={`Imagen: marca esquina ${names[active]}`}
      >
        <View pointerEvents="none" style={{ width: "100%", height: "100%" }}>
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="stretch"
          />
        </View>
        {names.map((name, i) => (
          <View
            pointerEvents="none"
            key={name}
            style={{
              position: "absolute",
              left: Math.max(
                0,
                Math.min(viewWidth - 25, points[i * 2] * viewWidth - 12),
              ),
              top: Math.max(
                0,
                Math.min(viewHeight - 25, points[i * 2 + 1] * viewHeight - 12),
              ),
              borderRadius: 15,
              width: 25,
              height: 25,
              backgroundColor: i === active ? "#E77D30" : colors.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>{i + 1}</Text>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {names.map((name, i) => (
          <Button
            key={name}
            title={`${i + 1} ${active === i ? "●" : ""}`}
            secondary
            onPress={() => setActive(i)}
            disabled={busy}
          />
        ))}
      </View>
      <Text style={styles.note}>Esquina activa: {names[active]}</Text>
      <Button
        title={busy ? "Procesando recorte…" : "Aplicar recorte"}
        secondary
        onPress={apply}
        disabled={busy}
      />
    </View>
  );
}
