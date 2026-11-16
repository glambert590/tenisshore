import { useState } from "react";
import { Alert, Text } from "react-native";
import * as Picker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { useCatalog } from "../src/data/context";
import { exportBackup, restoreBackup } from "../src/services/backup";
import {
  Button,
  Screen,
  confirm,
  reportError,
  styles,
} from "../src/components/ui";
export default function SettingsScreen() {
  const repo = useCatalog();
  const [busy, setBusy] = useState(false);
  async function backup() {
    setBusy(true);
    try {
      const uri = await exportBackup(repo);
      if (!(await Sharing.isAvailableAsync()))
        throw new Error(
          "No hay una aplicación disponible para guardar o compartir la copia.",
        );
      await Sharing.shareAsync(uri, {
        mimeType: "application/zip",
        dialogTitle: "Guardar copia de Tenisshore",
      });
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    try {
      const result = await Picker.getDocumentAsync({
        type: [
          "application/zip",
          "application/x-zip-compressed",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      if (
        !(await confirm(
          "Sustituir el catálogo",
          "La copia elegida sustituirá todos los modelos y descartará los borradores de importación. Exporta primero una copia del catálogo actual si quieres conservarlo.",
        ))
      )
        return;
      setBusy(true);
      const count = await restoreBackup(repo, result.assets[0].uri);
      Alert.alert(
        "Copia restaurada",
        `Se recuperaron ${count} modelos con sus fotos.`,
      );
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Text style={styles.title}>Protege tu catálogo</Text>
      <Text style={styles.subtitle}>
        Los datos están en este teléfono. Guarda una copia fuera de la app antes
        de cambiar de teléfono o desinstalarla.
      </Text>
      <Button
        title={busy ? "Procesando…" : "Exportar copia con fotos"}
        onPress={backup}
        disabled={busy}
      />
      <Button
        title="Restaurar una copia"
        secondary
        onPress={restore}
        disabled={busy}
      />
      <Text style={styles.note}>
        La restauración valida los datos y las fotos antes de sustituir el
        catálogo. Cancelar el selector de compartir no guarda una copia.
      </Text>
    </Screen>
  );
}
