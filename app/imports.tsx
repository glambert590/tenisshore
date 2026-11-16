import { useCallback, useState } from "react";
import { Alert, Image, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Picker from "expo-image-picker";
import * as FS from "expo-file-system/legacy";
import { uuid } from "expo-modules-core";
import { nativeApi } from "../modules/tenisshore-native";
import { useCatalog } from "../src/data/context";
import type { ImportDraft, ProductPatch } from "../src/domain/types";
import { normalizeCode } from "../src/domain/catalog";
import { pickAndImportImages } from "../src/domain/importBatch";
import {
  approveCardPatch,
  draftPriceText,
  editDraftPrice,
  editDraftBrand,
} from "../src/domain/draft";
import { proposeTable } from "../src/domain/table";
import { keepImage, rootUri, savePhoto } from "../src/services/files";
import { ImageCorners } from "../src/components/ImageCorners";
import { TableEditor } from "../src/components/TableEditor";
import {
  Button,
  Field,
  Screen,
  confirm,
  reportError,
  styles,
} from "../src/components/ui";

export default function ImportsScreen() {
  const repo = useCatalog();
  const [drafts, setDrafts] = useState<ImportDraft[]>([]),
    [activeId, setActiveId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(""),
    [crop, setCrop] = useState(false);
  const active = drafts.find((d) => d.id === activeId);
  function update(draft: ImportDraft) {
    setDrafts((old) => old.map((d) => (d.id === draft.id ? draft : d)));
    repo.saveDraft(draft).catch(reportError);
  }
  const add = useCallback(
    async (kind: ImportDraft["kind"]) => {
      setBusy(true);
      try {
        nativeApi(); // Fail before opening the picker if this is Expo Go.
        const { errors } = await pickAndImportImages(kind, {
          pick: (options) => Picker.launchImageLibraryAsync(options),
          keepImage: (asset) => keepImage(asset.uri, asset.width, asset.height),
          recognize: (uri) => nativeApi().recognize(uri),
          makeId: () => uuid.v4(),
          saveDraft: (draft) => repo.saveDraft(draft),
          onDraft: (draft) => {
            setDrafts((old) => [...old, draft]);
            setActiveId(draft.id);
          },
          onProgress: (index, total) =>
            setProgress(`Leyendo imagen ${index} de ${total}…`),
        });
        setCrop(false);
        if (errors.length)
          Alert.alert(
            "Algunas imágenes no se pudieron leer",
            errors.join("\n"),
          );
      } catch (error) {
        reportError(error);
      } finally {
        setBusy(false);
        setProgress("");
      }
    },
    [repo],
  );
  useFocusEffect(
    useCallback(() => {
      let canceled = false;
      (async () => {
        const stored = await repo.listDrafts();
        if (canceled) return;
        setDrafts(stored);
      })().catch(reportError);
      return () => {
        canceled = true;
      };
    }, [repo]),
  );
  async function applyCrop(uri: string, width: number, height: number) {
    if (!active) return;
    setBusy(true);
    try {
      if (active.kind === "card") {
        const photos = await savePhoto(uri);
        update({
          ...active,
          patch: { ...active.patch, ...photos },
          reviewed: false,
        });
      } else {
        const dest = `${rootUri}imports/${uuid.v4()}.jpg`;
        await FS.copyAsync({ from: uri, to: dest });
        const ocr = await nativeApi().recognize(dest);
        update({
          ...active,
          imageUri: dest,
          ocr,
          ...proposeTable(ocr),
          reviewed: false,
        });
      }
      setCrop(false);
    } finally {
      setBusy(false);
    }
  }
  async function discard(id: string) {
    if (
      !(await confirm(
        "Descartar imagen",
        "Se eliminará este borrador sin cambiar el catálogo.",
      ))
    )
      return;
    try {
      await repo.deleteDraft(id);
      setDrafts((old) => old.filter((d) => d.id !== id));
      if (id === activeId) setActiveId(null);
    } catch (error) {
      reportError(error);
    }
  }
  async function apply() {
    setBusy(true);
    try {
      const ready = drafts.filter((d) => d.reviewed);
      if (!ready.length)
        throw new Error("Confirma primero la revisión de al menos una imagen.");
      const current = await repo.list();
      const patches: ProductPatch[] = ready
        .filter((d) => d.kind === "card")
        .map((d) => ({ ...d.patch, code: normalizeCode(d.patch.code) }));
      const cells = ready
        .filter((d) => d.kind === "table")
        .flatMap((d) => d.cells);
      const codes = new Set([
        ...patches.map((p) => p.code),
        ...cells.map((c) => c.code),
      ]);
      const added = [...codes].filter(
        (code) => !current.some((p) => p.code === code),
      ).length;
      const removing = cells
        .filter((c) => {
          const p = current.find((p) => p.code === c.code);
          return (
            p &&
            ((p.availableSizes.includes(c.baseSize) && c.mark !== "whole") ||
              (p.availableSizes.includes(c.baseSize + 0.5) &&
                c.mark !== "half"))
          );
        })
        .map((c) => `${c.code} / fila ${c.baseSize}`);
      if (
        !(await confirm(
          "Aplicar importación revisada",
          `${ready.length} imágenes revisadas.\n${added} modelos nuevos y ${codes.size - added} existentes.\n${cells.filter((c) => c.mark === "empty").length} celdas confirmadas vacías.\n${removing.length} filas quitarán tallas anteriores.${removing.length ? "\n" + [...new Set(removing)].slice(0, 20).join(", ") : ""}\n\nLos modelos y filas no incluidos se conservan. Las imágenes sin revisar quedarán pendientes.`,
        ))
      )
        return;
      await repo.applyImport(
        patches,
        cells,
        ready.map((d) => d.id),
      );
      setDrafts((old) => old.filter((d) => !ready.some((r) => r.id === d.id)));
      setActiveId(null);
      Alert.alert(
        "Catálogo actualizado",
        "Se aplicaron todos los cambios confirmados.",
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Fotos y pendientes</Text>
      <Text style={styles.subtitle}>
        Revisa las fotos guardadas o añade un nuevo lote cuando lo necesites. La
        galería se abre al pulsar uno de los botones de abajo.
      </Text>
      <View style={styles.row}>
        <Button
          title="Añadir tablas"
          onPress={() => add("table")}
          disabled={busy}
        />
        <Button
          title="Añadir fotos"
          secondary
          onPress={() => add("card")}
          disabled={busy}
        />
      </View>
      {progress ? (
        <Text accessibilityLiveRegion="polite" style={styles.label}>
          {progress}
        </Text>
      ) : null}
      <Text style={styles.note}>
        Los borradores quedan guardados si cierras la app. Puedes importar
        marcas por separado. Selecciona varias fotos y confirma la selección en
        la galería. Android puede limitar cuántas fotos permite elegir por lote;
        puedes añadir más después sin perder las anteriores.
      </Text>
      {drafts.map((draft, i) => (
        <View key={draft.id} style={styles.row}>
          <Button
            title={`${i + 1}. ${draft.kind === "table" ? "Tabla" : draft.patch.code || "Ficha"} ${draft.reviewed ? "✓" : "pendiente"}`}
            secondary={activeId !== draft.id}
            onPress={() => {
              setActiveId(draft.id);
              setCrop(false);
            }}
            disabled={busy}
          />
          <Button
            title="Descartar"
            secondary
            onPress={() => discard(draft.id)}
            disabled={busy}
          />
        </View>
      ))}
      {active && (
        <View style={styles.card} key={active.id}>
          <Text style={styles.label}>
            {active.kind === "table" ? "Revisar tabla" : "Revisar ficha"}
          </Text>
          <Image
            source={{ uri: active.imageUri }}
            style={{
              width: "100%",
              aspectRatio: active.ocr.width / Math.max(1, active.ocr.height),
            }}
            resizeMode="contain"
            accessibilityLabel="Imagen original de la importación"
          />
          <Text style={styles.note}>
            OCR: {active.ocr.elapsedMs} ms · {active.ocr.tokens.length}{" "}
            fragmentos · {active.ocr.width}×{active.ocr.height}. La lectura aún
            requiere revisión.
          </Text>
          <Button
            title={
              crop
                ? "Ocultar recorte"
                : active.kind === "table"
                  ? "Recortar / enderezar y volver a leer"
                  : "Recortar foto para el catálogo"
            }
            secondary
            onPress={() => setCrop(!crop)}
            disabled={busy}
          />
          {crop && (
            <ImageCorners
              uri={active.imageUri}
              width={active.ocr.width}
              height={active.ocr.height}
              onApply={applyCrop}
            />
          )}
          {!busy &&
            (active.kind === "table" ? (
              <TableEditor
                key={`${active.id}-${active.imageUri}`}
                draft={active}
                onChange={update}
              />
            ) : (
              <CardEditor draft={active} onChange={update} />
            ))}
        </View>
      )}
      <Button
        title={
          busy
            ? "Procesando…"
            : `Aplicar ${drafts.filter((d) => d.reviewed).length} imágenes revisadas`
        }
        disabled={busy || !drafts.some((d) => d.reviewed)}
        onPress={apply}
      />
    </Screen>
  );
}

function CardEditor({
  draft,
  onChange,
}: {
  draft: ImportDraft;
  onChange: (draft: ImportDraft) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function approve() {
    setBusy(true);
    try {
      const patch = approveCardPatch(draft);
      const photo = draft.patch.photoPath
        ? {}
        : await savePhoto(draft.imageUri);
      onChange({ ...draft, patch: { ...patch, ...photo }, reviewed: true });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 10 }}>
      <Field
        label="Código de la ficha"
        value={draft.patch.code}
        onChangeText={(code) =>
          onChange({
            ...draft,
            patch: { ...draft.patch, code },
            reviewed: false,
          })
        }
        editable={!busy}
      />
      <Field
        label="Marca (no se deduce del logo)"
        value={draft.patch.brand ?? ""}
        onChangeText={(brand) => onChange(editDraftBrand(draft, brand))}
        editable={!busy}
      />
      <Field
        label="Precio USD (vacío conserva el existente)"
        value={draftPriceText(draft)}
        onChangeText={(value) => onChange(editDraftPrice(draft, value))}
        keyboardType="decimal-pad"
        editable={!busy}
      />
      <Text style={styles.note}>
        Las tallas impresas en la ficha no sustituyen las de las tablas. Si no
        recortas la imagen, se usará la ficha completa como foto.
      </Text>
      <Button
        title={
          busy
            ? "Guardando foto…"
            : draft.reviewed
              ? "✓ Ficha revisada"
              : "Confirmar revisión de ficha"
        }
        onPress={approve}
        disabled={busy}
      />
    </View>
  );
}
