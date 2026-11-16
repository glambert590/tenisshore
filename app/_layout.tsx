import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CatalogProvider } from "../src/data/context";
export default function Layout() {
  return (
    <CatalogProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: "#183832",
          headerStyle: { backgroundColor: "#F4F6F1" },
          contentStyle: { backgroundColor: "#F4F6F1" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Tenisshore" }} />
        <Stack.Screen
          name="product"
          options={{ title: "Ficha del producto" }}
        />
        <Stack.Screen name="imports" options={{ title: "Importaciones" }} />
        <Stack.Screen
          name="settings"
          options={{ title: "Copias de seguridad" }}
        />
        <Stack.Screen
          name="share"
          options={{ title: "Compartir por WhatsApp" }}
        />
      </Stack>
    </CatalogProvider>
  );
}
