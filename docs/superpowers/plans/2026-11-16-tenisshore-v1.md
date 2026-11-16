# Tenisshore Implementation Plan

**Goal:** catálogo Android offline, importación asistida por OCR, búsqueda y compartir por WhatsApp.
**Architecture:** Expo Router/TypeScript, expo-sqlite y archivos privados; módulo local Kotlin para ML Kit, corrección de perspectiva, exportación de imágenes y ZIP.
**Spec:** ../specs/2026-11-16-tenisshore-design.md

## Entregas

- [ ] 1. Base Expo y OCR nativo: texto con coordenadas, perspectiva, diagnóstico de tiempos y cuadrícula editable. Validación en teléfono/fotos reales obligatoria antes de considerar reconocimiento aceptado.
- [ ] 2. Dominio y catálogo: códigos de texto únicos, tallas exactas, precio en centavos, consultas, edición y persistencia transaccional.
- [ ] 3. Importación: varias imágenes, borradores persistentes, revisión de celdas/etiquetas, conflictos, resumen y aplicación atómica de alcance parcial.
- [ ] 4. Compartir: imágenes de datos actuales, selección/lotes de 20 y WhatsApp con confirmación humana.
- [ ] 5. Copia ZIP/restauración validada, CI y perfil EAS APK; documentación y PR a development.

## Verificación

Pruebas de dominio y persistencia: X/37, X½/37.5, vacío vs incierto, códigos 64.10/64.1, precios, Adidas sin cambiar Nike, filas fuera de alcance, duplicados, rollback, backups inválidos y filtros. TypeScript y lint; prebuild Android; build si hay SDK. Pruebas físicas: OCR real, modo avión, compartir en WhatsApp, rendimiento con 500 productos, cierre/reapertura y copia/restauración.

## Estructura

app/ contiene navegación y pantallas; src/domain/ lógica pura; src/data/ persistencia; src/services/ integración nativa y archivos; src/components/ revisión de imágenes y controles. modules/tenisshore-native/ es el módulo Expo local. tests/ cubre lógica y persistencia real.

## Estado de implementación

Funciones de las cinco entregas implementadas en `feature/tenisshore-v1`: catálogo, OCR nativo y revisión geométrica, borradores, actualización transaccional, búsqueda, WhatsApp, copias y configuración APK/CI. Los checks anteriores se mantienen pendientes de aceptación integral hasta ejecutar la guía física en `docs/acceptance.md` y publicar la PR.

Revisión independiente realizada. Se corrigieron escalado nativo con divisor cero, persistencia de precios sin confirmar, validación de fotos restauradas y contradicciones entre marcas de fichas/tablas. Hay pruebas de regresión para esas reglas; los tests de archivos/SQL no sustituyen la prueba física de OCR ni WhatsApp.

Expo SDK 55 se eligió para poder compilar con Android SDK 36 disponible, en lugar de la plantilla SDK 58 que exigía API 37 no disponible en el entorno. El repositorio solo tenía README y no existía una base de pruebas previa.
