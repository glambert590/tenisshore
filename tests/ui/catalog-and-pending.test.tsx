import React from "react";
import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  renderAsync,
  screen,
  fireEventAsync,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import CatalogScreen from "../../app/index";
import ImportsScreen from "../../app/imports";
import type { Product, ImportDraft } from "../../src/domain/types";

const mockRepo = {
  list: jest.fn<() => Promise<Product[]>>(),
  listDrafts: jest.fn<() => Promise<ImportDraft[]>>(),
};
const mockPick = jest.fn<() => Promise<{ canceled: true; assets: null }>>();

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: () => ({ autoPick: "card" }),
    useFocusEffect: (effect: () => void | (() => void)) =>
      React.useEffect(effect, [effect]),
  };
});
jest.mock("../../src/data/context", () => ({ useCatalog: () => mockRepo }));
jest.mock("expo-image-picker", () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockPick(...(args as [])),
}));
jest.mock("../../modules/tenisshore-native", () => ({ nativeApi: () => ({}) }));
jest.mock("../../src/services/files", () => ({
  photoUri: (path: string | null) => (path ? `file:///catalog/${path}` : null),
}));
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView:
    jest.requireActual<typeof import("react-native")>("react-native").View,
}));

const product: Product = {
  code: "71.10",
  brand: "Nike",
  priceCents: 3500,
  photoPath: "photos/nike.jpg",
  thumbnailPath: null,
  availableSizes: [37.5],
  availabilityKnown: true,
  updatedAt: null,
};
const draft: ImportDraft = {
  id: "pending-1",
  kind: "card",
  imageUri: "file:///pending.jpg",
  ocr: { width: 800, height: 1000, elapsedMs: 1, tokens: [] },
  columns: [],
  rows: [],
  cells: [],
  patch: { code: "67.1" },
  reviewed: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.list.mockResolvedValue([
    product,
    { ...product, code: "64.10", brand: "Adidas", availableSizes: [36] },
  ]);
  mockRepo.listDrafts.mockResolvedValue([draft]);
  mockPick.mockResolvedValue({ canceled: true, assets: null });
});

test("entering pending photos restores drafts without opening the gallery, including old autoPick links", async () => {
  await renderAsync(<ImportsScreen />);
  expect(await screen.findByText(/67.1 pendiente/)).toBeTruthy();
  await waitFor(() => expect(mockRepo.listDrafts).toHaveBeenCalledTimes(1));
  expect(mockPick).not.toHaveBeenCalled();
});

test("the gallery opens only after the user presses add photos", async () => {
  await renderAsync(<ImportsScreen />);
  await screen.findByText(/67.1 pendiente/);
  await fireEventAsync.press(
    screen.getByRole("button", { name: /Cargar varios modelos|Añadir fotos/ }),
  );
  await waitFor(() => expect(mockPick).toHaveBeenCalledTimes(1));
  expect(screen.getByText(/67.1 pendiente/)).toBeTruthy();
});

test("the main screen shows pending imports and opens them without launching the gallery", async () => {
  await renderAsync(<CatalogScreen />);
  const pending = await screen.findByRole("button", {
    name: "Revisar pendientes (1)",
  });
  await fireEventAsync.press(pending);
  expect(router.push).toHaveBeenCalledWith("/imports");
  expect(mockPick).not.toHaveBeenCalled();
});

test("catalog selection sends only the selected model to WhatsApp", async () => {
  await renderAsync(<CatalogScreen />);
  const select = await screen.findByRole("checkbox", {
    name: "Seleccionar modelo 71.10",
  });
  await fireEventAsync.press(select);
  await fireEventAsync.press(
    screen.getByRole("button", { name: "Compartir 1 por WhatsApp" }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/share",
    params: { codes: '["71.10"]' },
  });
});

test("compact filters preserve exact half sizes and can be cleared", async () => {
  await renderAsync(<CatalogScreen />);
  await screen.findByText("71.10");
  await fireEventAsync.changeText(
    screen.getByLabelText("Talla exacta"),
    "37.5",
  );
  expect(screen.getByText("71.10")).toBeTruthy();
  expect(screen.queryByText("64.10")).toBeNull();
  await fireEventAsync.press(
    screen.getByRole("button", { name: "Limpiar filtros" }),
  );
  expect(await screen.findByText("64.10")).toBeTruthy();
});
