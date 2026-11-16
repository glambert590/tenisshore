# Diseño aprobado: Tenisshore Android

Un gestor, un teléfono Android, hasta 500 modelos. Aplicación Expo en español con SQLite y fotos privadas locales; consultas y OCR sin internet ni API de pago. Precio en USD igual al del dueño, editable. No incluye cuentas, nube, pedidos ni cantidades de unidades.

El código identifica globalmente un producto y se conserva como texto: 64.10 no es 64.1. Marca, foto, precio y disponibilidad se editan manualmente o mediante importaciones revisadas. Hay fichas con código/precio y fotos sin etiquetas. La disponibilidad de tablas prevalece sobre las tallas impresas en las fichas.

Importación de múltiples imágenes desde galería, secuencial, con revisión obligatoria. En fila 37: X = solo 37; X ½ = solo 37.5; vacío confirmado = ninguna de esas dos tallas. Lo ilegible queda pendiente y nunca equivale automáticamente a vacío. Solo se actualizan los modelos y filas revisados; los demás se conservan. Cambios transaccionales, cancelación sin cambios y conflictos resueltos antes de confirmar.

Búsqueda combinada por marca, talla exacta y código; miniaturas, datos faltantes y fecha de actualización visibles. WhatsApp recibe imágenes con datos actuales: uno, selección o todos los resultados; lotes de 20. El gestor elige contacto y confirma. No se afirma entrega. Foto recortable para excluir etiquetas antiguas.

Exportar/restaurar ZIP versionado con datos y fotos; validar antes de sustituir y conservar catálogo anterior ante fallos. Compilación APK con EAS depende de credenciales/cuota Expo. Trabajar en feature/* desde development; PR a development; promoción posterior a main por PR.

## Enfoques considerados

OCR local con revisión (elegido) reduce transcripción sin pagar APIs. Carga manual es más simple pero costosa para catálogos grandes. No se eligió modelo multimodal remoto por dependencia de servidor/coste. Validar primero lectura y geometría con fotos reales; no prometer exactitud ni rendimiento sin dispositivo.

## Validación

Probar medias tallas, códigos decimales como texto, importaciones parciales, conflictos, lecturas inciertas, rollback, modo avión, persistencia, 500 modelos, compartir y restaurar. Teléfono de referencia: Android con 4 GB RAM; falta conocer dispositivo real.
