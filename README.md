# Tenisshore

Catálogo Android para un gestor de ventas de tenis. Desarrollado con Expo SDK 55, React Native y TypeScript. Datos y fotos locales, sin servidor ni API de IA de pago.

## Funciones

- Crear y editar modelos con código único, marca, foto, precio en USD y tallas exactas.
- Buscar por marca, talla o código y compartir uno, varios o todos los resultados por WhatsApp, en lotes de 20.
- Importar varias fotos de fichas o tablas mediante OCR local con revisión obligatoria.
- Corregir perspectiva, calibrar filas/columnas y editar las celdas antes de aplicar cambios.
- Guardar borradores, exportar una copia ZIP con fotos y restaurarla tras validar datos e imágenes.

En una fila **37**, `X` significa solo **37** y `X ½` significa solo **37.5**. Una celda vacía confirmada elimina ambas. Lo ilegible queda pendiente. Importar Adidas no modifica Nike; tampoco se borran filas fuera de las revisadas. Los códigos son texto: `64.10` y `64.1` son distintos.

## Estado de validación

La implementación incluye pruebas de dominio y SQLite, comprobación de tipos, lint, exportación JavaScript para Android y CI. La aceptación del OCR requiere las fotografías originales en un teléfono: las imágenes mostradas en la conversación no estaban disponibles como archivos locales. No se ha medido precisión, batería o memoria en un teléfono real. Tampoco se ha confirmado el flujo real de WhatsApp. No considerar esas capacidades aceptadas hasta completar [la guía de pruebas](docs/acceptance.md).

## Desarrollo

Se necesita Node.js **24**, npm, JDK **17** y las herramientas Android que solicite la plantilla (API 36). Expo Go no incluye el módulo Kotlin de Tenisshore: usa una compilación de desarrollo o la APK.

```sh
npm ci
npm test
npm run typecheck
npm run lint
npx expo prebuild --platform android
npm run android
```

El módulo local `modules/tenisshore-native` usa ML Kit latino incluido en la APK, sin descargar el modelo al primer uso. No infiere marcas desde logos. La detección geométrica propone filas/columnas, no garantiza interpretar automáticamente cualquier tabla. Puedes ajustar códigos, marcas y centros de filas/columnas desde la revisión.

En el catálogo, las tallas manuales se separan con espacios: `36 37.5 38`. Una disponibilidad sin confirmar se muestra como pendiente y no aparece en búsquedas por talla. Las fichas impresas no actualizan automáticamente la disponibilidad.

## Generar una APK con Expo EAS

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile preview
```

`eas init` vincula el proyecto con tu cuenta y agrega su identificador a la configuración. Usa las credenciales de firma administradas por EAS o las de tu organización. La cuota y disponibilidad de compilaciones dependen de Expo; no hay suscripción de IA necesaria. No se guardan tokens en el repositorio. El perfil `production` genera un AAB para Google Play; `preview` genera APK instalable.

También puedes compilar localmente después de `expo prebuild`:

```sh
cd android
./gradlew :app:assembleDebug :tenisshore-native:testDebugUnitTest
```

La APK debug necesita el servidor de desarrollo. Para una APK independiente, usa el perfil EAS `preview`; no distribuyas una firma debug como versión de producción.

## Copias y WhatsApp

Los datos están solo en el teléfono. Exporta y guarda el ZIP fuera de la app antes de desinstalar o cambiar de dispositivo. Restaurar sustituye catálogo y borradores; exporta antes si quieres conservar los anteriores. La copia incluye fotos del catálogo, no borradores de importación.

Las imágenes para WhatsApp incluyen los datos actuales. Recorta las etiquetas antiguas de las fotos para evitar información contradictoria. El usuario elige contacto y confirma el envío dentro de WhatsApp; volver a Tenisshore no certifica envío ni entrega. Sin WhatsApp, se abre el selector de compartir de Android.

## Ramas

`feature/<nombre>` → PR a `development` → PR a `main`.

No subir cambios directamente a ramas compartidas. La rama de esta implementación es `feature/tenisshore-v1`, creada desde `development`. Si la integración devuelve 403, habilitar escritura de contenidos para el repositorio antes de hacer push o abrir la PR.
