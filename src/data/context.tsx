import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as SQLite from "expo-sqlite";
import { CatalogRepository } from "./repository";
import { ensureFolders } from "../services/files";
import { ActivityIndicator, Text, View } from "react-native";

const Context = createContext<CatalogRepository | null>(null);
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<CatalogRepository | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    (async () => {
      await ensureFolders();
      const db = await SQLite.openDatabaseAsync("tenisshore.db");
      const repository = new CatalogRepository({
        exec: (sql) => db.execAsync(sql),
        run: async (sql, params = []) => {
          await db.runAsync(sql, params);
        },
        all: (sql, params = []) => db.getAllAsync(sql, params),
      });
      await repository.init();
      if (mounted) setRepo(repository);
    })().catch((e) => {
      if (mounted) setError(e instanceof Error ? e.message : String(e));
    });
    return () => {
      mounted = false;
    };
  }, []);
  if (error)
    return (
      <View style={{ padding: 24, paddingTop: 80 }}>
        <Text accessibilityRole="alert">
          No se pudo abrir el catálogo: {error}
        </Text>
        <Text>No borres los datos de la app. Cierra y vuelve a abrir.</Text>
      </View>
    );
  if (!repo)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <ActivityIndicator
          size="large"
          accessibilityLabel="Abriendo catálogo"
        />
      </View>
    );
  return <Context.Provider value={repo}>{children}</Context.Provider>;
}
export function useCatalog(): CatalogRepository {
  const value = useContext(Context);
  if (!value) throw new Error("Catálogo no disponible.");
  return value;
}
