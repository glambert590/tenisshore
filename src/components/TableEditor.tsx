import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type {
  CellMark,
  ImportDraft,
  TableColumn,
  TableRow,
} from "../domain/types";
import { buildCells } from "../domain/table";
import { normalizeCode } from "../domain/catalog";
import { Button, Field, colors, confirm, reportError, styles } from "./ui";

const labels: Record<CellMark, string> = {
  whole: "X",
  half: "X ½",
  empty: "—",
  pending: "?",
};
const cycle: CellMark[] = ["pending", "whole", "half", "empty"];
export function TableEditor({
  draft,
  onChange,
}: {
  draft: ImportDraft;
  onChange: (draft: ImportDraft) => void;
}) {
  const [calibrate, setCalibrate] = useState(false);
  const [colText, setColText] = useState(
    draft.columns
      .map(
        (c) =>
          `${c.code}|${c.brand ?? ""}|${((c.x / draft.ocr.width) * 100).toFixed(2)}`,
      )
      .join("\n"),
  );
  const [rowText, setRowText] = useState(
    draft.rows
      .map((r) => `${r.size}|${((r.y / draft.ocr.height) * 100).toFixed(2)}`)
      .join("\n"),
  );
  const [brand, setBrand] = useState("");
  function rebuild() {
    try {
      const columns: TableColumn[] = colText
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [code, brand = "", x] = line.split("|");
          return {
            code: normalizeCode(code),
            brand: brand.trim() || null,
            x: (Number(x) * draft.ocr.width) / 100,
          };
        })
        .sort((a, b) => a.x - b.x);
      const rows: TableRow[] = rowText
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [size, y] = line.split("|");
          return {
            size: Number(size),
            y: (Number(y) * draft.ocr.height) / 100,
          };
        })
        .sort((a, b) => a.y - b.y);
      if (
        !columns.length ||
        !rows.length ||
        columns.some(
          (c) => !Number.isFinite(c.x) || c.x <= 0 || c.x >= draft.ocr.width,
        ) ||
        rows.some(
          (r) =>
            !Number.isInteger(r.size) ||
            r.size <= 0 ||
            r.size > 100 ||
            !Number.isFinite(r.y) ||
            r.y <= 0 ||
            r.y >= draft.ocr.height,
        )
      )
        throw new Error(
          "Revisa códigos, tallas y posiciones (entre 0 y 100%).",
        );
      if (
        new Set(columns.map((c) => c.code)).size !== columns.length ||
        new Set(rows.map((r) => r.size)).size !== rows.length ||
        new Set(columns.map((c) => c.x)).size !== columns.length ||
        new Set(rows.map((r) => r.y)).size !== rows.length
      )
        throw new Error("No repitas códigos, tallas ni posiciones.");
      if (rows.length * columns.length > 1500)
        throw new Error("Recorta la tabla en partes más pequeñas.");
      onChange({
        ...draft,
        columns,
        rows,
        cells: buildCells(draft.ocr, columns, rows),
        reviewed: false,
      });
      setCalibrate(false);
    } catch (error) {
      reportError(error);
    }
  }
  async function confirmAll() {
    if (draft.cells.some((c) => c.mark === "pending")) {
      reportError(
        new Error(
          "Quedan celdas ?. Corrígelas: la ausencia de texto OCR no confirma que estén vacías.",
        ),
      );
      return;
    }
    if (
      await confirm(
        "Confirmar tabla revisada",
        "Compara todos los códigos, marcas y tallas con la foto. Las celdas — quitarán la talla entera y media de esa fila; X ½ conservará únicamente la media talla.",
      )
    )
      onChange({
        ...draft,
        reviewed: true,
        cells: draft.cells.map((c) => ({ ...c, reviewed: true })),
      });
  }
  async function emptyPending() {
    if (
      await confirm(
        "Confirmar celdas vacías",
        "Usa esta opción solo si comprobaste en la foto que TODAS las celdas ? están vacías. Una X o una media talla que el OCR no detectó se perdería.",
      )
    )
      onChange({
        ...draft,
        reviewed: false,
        cells: draft.cells.map((c) =>
          c.mark === "pending" ? { ...c, mark: "empty", reviewed: true } : c,
        ),
      });
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.note}>
        Toca una celda para cambiar: ? → X → X ½ → —. X ½ significa solo la
        media talla. — significa sin disponibilidad.
      </Text>
      <Button
        title={
          calibrate
            ? "Ocultar ajuste de tabla"
            : "Ajustar códigos, marcas y posiciones"
        }
        secondary
        onPress={() => setCalibrate(!calibrate)}
      />
      {calibrate && (
        <View style={styles.card}>
          <Text style={styles.note}>
            Una columna por línea: código|marca|posición horizontal %. Una fila
            por línea: talla|posición vertical %. Las posiciones son el centro
            de la columna o fila en la imagen corregida. Aplicar recalcula todas
            las celdas.
          </Text>
          <Field
            label="Columnas"
            multiline
            value={colText}
            onChangeText={setColText}
            placeholder={"64.10|Adidas|25\n65.1|Adidas|50"}
          />
          <Field
            label="Filas"
            multiline
            value={rowText}
            onChangeText={setRowText}
            placeholder={"36|40\n37|50\n38|60"}
          />
          <Button title="Recalcular cuadrícula" onPress={rebuild} />
        </View>
      )}
      <Field
        label="Asignar marca a todas las columnas (opcional)"
        value={brand}
        onChangeText={setBrand}
        placeholder="Ej. Adidas"
      />
      <Button
        title="Aplicar marca"
        secondary
        disabled={!brand.trim()}
        onPress={() =>
          onChange({
            ...draft,
            reviewed: false,
            columns: draft.columns.map((c) => ({ ...c, brand: brand.trim() })),
            cells: draft.cells.map((c) => ({ ...c, brand: brand.trim() })),
          })
        }
      />
      {draft.cells.length === 0 ? (
        <Text style={{ color: colors.warning }}>
          No se pudo reconstruir la tabla. Ajusta sus filas y columnas o recorta
          y endereza la imagen.
        </Text>
      ) : (
        <ScrollView horizontal>
          <View>
            <View style={{ flexDirection: "row" }}>
              <Text style={{ width: 60, padding: 10 }}>Talla</Text>
              {draft.columns.map((col, i) => (
                <View
                  key={`${col.code}-${i}`}
                  style={{ width: 110, padding: 6 }}
                >
                  <Text style={styles.label}>{col.code}</Text>
                  <Text style={styles.note}>
                    {col.brand ?? "Marca pendiente"}
                  </Text>
                </View>
              ))}
            </View>
            {draft.rows.map((r, ri) => (
              <View key={`${r.size}-${ri}`} style={{ flexDirection: "row" }}>
                <Text style={{ width: 60, padding: 15 }}>{r.size}</Text>
                {draft.columns.map((col, ci) => {
                  const index = draft.cells.findIndex(
                    (c) => c.code === col.code && c.baseSize === r.size,
                  );
                  const cell = draft.cells[index];
                  return (
                    <Pressable
                      key={`${col.code}-${ci}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${col.code}, talla ${r.size}: ${cell ? labels[cell.mark] : "?"}`}
                      onPress={() => {
                        if (index < 0) return;
                        onChange({
                          ...draft,
                          reviewed: false,
                          cells: draft.cells.map((c, i) =>
                            i === index
                              ? {
                                  ...c,
                                  mark: cycle[
                                    (cycle.indexOf(c.mark) + 1) % cycle.length
                                  ],
                                  reviewed: true,
                                }
                              : c,
                          ),
                        });
                      }}
                      style={{
                        width: 110,
                        minHeight: 48,
                        padding: 13,
                        borderWidth: 0.5,
                        borderColor: colors.border,
                        backgroundColor:
                          cell?.mark === "pending"
                            ? "#FFF0D9"
                            : cell?.reviewed
                              ? "#E3F1E8"
                              : "white",
                      }}
                    >
                      <Text style={{ textAlign: "center" }}>
                        {cell ? labels[cell.mark] : "?"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      {draft.cells.length > 0 && (
        <>
          <Text style={styles.note}>
            {draft.cells.filter((c) => c.mark === "pending").length} celdas
            pendientes · {draft.cells.filter((c) => c.reviewed).length}/
            {draft.cells.length} revisadas
          </Text>
          <Button
            title="He comprobado que todas las ? están vacías"
            secondary
            onPress={emptyPending}
          />
          <Button
            title={
              draft.reviewed
                ? "✓ Tabla revisada"
                : "Confirmar revisión de esta tabla"
            }
            onPress={confirmAll}
          />
        </>
      )}
    </View>
  );
}
