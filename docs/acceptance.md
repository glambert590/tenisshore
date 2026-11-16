# Aceptación en Android

## Pendiente antes de dar por validado el reconocimiento

Ejecutar en el teléfono real del gestor (referencia: Android con 4 GB RAM). Usar las tablas y fichas originales proporcionadas por el usuario; no sustituirlas por capturas sintéticas para afirmar precisión.

1. Importar las tablas Adidas, New Balance y marcas agrupadas. Medir el tiempo mostrado por imagen, revisar el mapa de códigos/filas y corregir perspectiva si es necesario.
2. Comparar cada celda con la foto: X/37 → 37; X½/37 → 37.5; vacío → ninguna. Confirmar que ? nunca se aplica sin revisión. Registrar celdas correctamente propuestas, corregidas y no reconocidas; no publicar un porcentaje antes de medirlo.
3. Probar códigos con sufijos: 64.10 no puede combinarse con 64.1. Las comas del encabezado pueden normalizarse a punto, conservando los dígitos.
4. En una tabla con varias marcas, ajustar marca por columna. Una marca desconocida queda pendiente, no se infiere por el número del código.
5. Importar fichas con código/precio y fotos sin texto. Guardar una edición de precio sin aprobar, cambiar de borrador, cerrar/reabrir y verificar que se conserva.
6. Probar cancelar, foto borrosa, perspectiva extrema y recorte sin encabezados. El catálogo existente debe mantenerse; las correcciones manuales deben seguir disponibles.

Si la lectura no aporta suficiente ahorro frente a transcribir, detener la aceptación del OCR y revisar el enfoque con el usuario. El catálogo manual permite comprobar las demás funciones sin afirmar que el OCR está aceptado.

## Catálogo y disponibilidad

- Cargar 500 modelos con fotos. Medir búsqueda, desplazamiento y memoria con Android Studio Profiler; comprobar que las importaciones procesan una imagen a la vez.
- Buscar Adidas talla 36 y comparar resultados con la tabla confirmada. Probar 36.5 sin incluir talla 36.
- Importar solo Adidas y solo algunas filas: conservar Nike y filas fuera de alcance. Verificar que fotos y precios existentes no se borran.
- Confirmar vacío y X½ sobre disponibilidad anterior: quitar únicamente las tallas correspondientes. Comprobar resumen antes de guardar.
- Forzar una contradicción entre ficha Nike y tabla Adidas con el mismo código. Debe bloquearse hasta corregir.
- Cerrar/reabrir y usar modo avión: datos, miniaturas, OCR y filtros deben funcionar. Registrar modelo/versión Android, duración y resultado.

## Copias

- Exportar, guardar fuera de la app y restaurar: comprobar productos, tallas y todas las fotos.
- Probar ZIP truncado, foto referenciada ausente, imagen vacía/texto con extensión JPG, versión incompatible, código duplicado y ruta ../.
- En cada fallo, conservar catálogo, fotos y borradores anteriores; no anunciar éxito.

## WhatsApp

- Probar un producto, 20 y más de 20. Seleccionar todos los resultados y comprobar que todos los lotes son accesibles.
- Revisar las imágenes generadas: código, marca, precio actual y todas las tallas disponibles. Probar muchas tallas y foto vertical.
- Excluir fichas incompletas, cancelar selector/contacto y volver sin enviar; no mostrar confirmación de entrega.
- Probar WhatsApp normal, Business y ninguno instalado. Confirmar permisos temporales de lectura de adjuntos.

## Registro

Para cada prueba: fecha, APK/commit, dispositivo, Android, imágenes usadas, pasos, resultado, tiempo y evidencia. Precisión, tamaño de APK y consumo real se reportan solo después de medirlos.
