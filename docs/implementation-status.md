# Estado de la primera versión

## Código y verificación

Implementados catálogo local, búsqueda por marca/talla/código, edición manual, OCR latino incluido, revisión de fichas y tablas, corrección de perspectiva, borradores persistentes, aplicación transaccional parcial, imágenes para WhatsApp y copias ZIP con restauración validada.

Verificados 27 tests de TypeScript/SQLite y 2 tests Kotlin, tipos y lint. La exportación JavaScript Android y la compilación nativa release se ejecutaron en este entorno. La APK local de prueba usa arm64-v8a, mínimo Android API 24 y firma Android Debug. El perfil EAS preview está configurado; no se realizó una compilación en la cuenta Expo del usuario.

Revisión independiente: corregidos divisor cero al decodificar imágenes, pérdida de precio sin aprobar, aceptación de fotos corruptas durante restauración y contradicciones entre marcas de fichas y tablas. También se corrigió la escritura de marcas con espacios, como New Balance. Las pruebas cubren regresiones; los tests de puertos nativos no sustituyen la aceptación física.

## Decisiones de ejecución

- Clon separado y rama `feature/tenisshore-v1` desde `development`, sin otro worktree: no había un checkout existente. El código queda conservado localmente hasta poder subirlo.
- Expo SDK 55 con Android SDK 36: la plantilla más reciente requería SDK 37 no disponible. Se conserva el alcance, con una base de dependencias anterior.
- Tests Node con `--test-isolation=none`: el aislamiento por proceso del entorno no ejecutaba los subtests. Con este ajuste se enumeran y ejecutan las 27 pruebas reales.
- No se atribuye precisión OCR ni rendimiento físico: los adjuntos de la conversación no estaban accesibles como archivos y no había un teléfono conectado. La aceptación continúa pendiente.

## Publicación

El acceso de escritura quedó habilitado. La rama `feature/tenisshore-v1` está publicada y la [PR #1](https://github.com/glambert590/tenisshore/pull/1) está abierta como borrador hacia `development`. El bloqueo 403 registrado durante la implementación quedó resuelto.

## Pendientes

- Completar [aceptación física](acceptance.md): fotos originales, modo avión, WhatsApp real, rendimiento y recuperación en el dispositivo del gestor.
- Vincular EAS con la cuenta del usuario y gestionar firma propia para distribuir versiones estables. La APK de prueba usa otra firma; exportar copia de datos antes de cambiar instalaciones.

No se fusionaron cambios a `development` ni a `main`.
