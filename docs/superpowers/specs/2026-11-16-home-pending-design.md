# Pantalla principal y revisión de pendientes

Solicitud: mejorar el inicio y permitir entrar a revisar pendientes sin abrir la galería. Se mantiene el catálogo local, las reglas de disponibilidad y la navegación existente.

## Decisiones de presentación

Se conserva el color verde de la app. El inicio presenta contadores de modelos, modelos con tallas y fotos pendientes de guardar; este último da acceso directo a las importaciones. Búsqueda por código y talla comparten fila, con marcas desplazables debajo. Las tarjetas muestran foto, marca, código, precio, disponibilidad y fecha. Selección por casilla y acción de WhatsApp visible cuando hay modelos seleccionados. Dos columnas en pantallas normales; una en pantallas estrechas o con texto ampliado.

Frente a mantener tarjetas anchas con todos los controles arriba o introducir un panel administrativo nuevo, se compacta el catálogo existente para mantener la consulta y venta como tarea principal. Estas son decisiones de implementación para la mejora solicitada, sin añadir cuentas, servidor ni nuevas reglas de negocio.

## Comportamiento de fotos

Entrar a «Fotos y pendientes», desde el inicio o «Nuevo modelo», solo restaura los borradores. No se lanza el selector durante el montaje ni al volver a la pantalla, aunque se reciba el antiguo parámetro autoPick. «Añadir fotos» y «Añadir tablas» abren explícitamente el selector múltiple. Los borradores revisados pero aún sin aplicar siguen contando como pendientes.

## Verificación

Pruebas de pantalla: entrada con autoPick antiguo sin apertura, apertura al pulsar, acceso desde contador, selección para WhatsApp y filtros de media talla con limpieza. Se conservan las 30 pruebas de dominio/SQLite. Revisar visualmente en el teléfono los tamaños de letra, dos columnas, ampliación de texto y actualización de contadores.

## Distribución

Versión 0.1.2 / Android versionCode 3. Los nombres se derivan de app.json: tenisshore-0.1.2-arm64.apk y tenisshore-0.1.2-arm64.zip, con checksum también versionado. El workflow conserva permiso contents: read y publica únicamente un artefacto de pruebas. Rama feature/tenisshore-v1 y PR a development.
