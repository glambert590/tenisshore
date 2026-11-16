package expo.modules.tenisshore

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.os.SystemClock
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.net.URI
import java.util.UUID
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

class TenisshoreModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private fun localFile(uri: String): File {
    val file = File(URI(uri)).canonicalFile
    val allowed = listOf(context.filesDir, context.cacheDir).map { it.canonicalPath }
    require(allowed.any { file.path == it || file.path.startsWith(it + File.separator) }) { "El archivo debe estar en el almacenamiento privado de la app." }
    return file
  }
  private fun output(extension: String): File = File(context.cacheDir, "tenisshore-${UUID.randomUUID()}.$extension")
  private fun bitmap(uri: String, edge: Int = 3000): Bitmap {
    val file = localFile(uri)
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(file.path, bounds)
    require(bounds.outWidth > 0 && bounds.outHeight > 0) { "No se pudo leer la imagen." }
    val options = BitmapFactory.Options().apply { inSampleSize = imageSampleSize(bounds.outWidth, bounds.outHeight, edge) }
    val source = requireNotNull(BitmapFactory.decodeFile(file.path, options))
    val factor = min(1f, edge.toFloat() / max(source.width, source.height))
    if (factor == 1f) return source
    return Bitmap.createScaledBitmap(source, (source.width * factor).toInt(), (source.height * factor).toInt(), true).also { source.recycle() }
  }
  private fun writeJpeg(bitmap: Bitmap): File {
    val file = output("jpg")
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it) }
    return file
  }

  override fun definition() = ModuleDefinition {
    Name("TenisshoreNative")

    AsyncFunction("validateImage") { uri: String ->
      val file = localFile(uri)
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, bounds)
      require(bounds.outWidth in 1..12000 && bounds.outHeight in 1..12000 && bounds.outWidth.toLong() * bounds.outHeight <= 40_000_000) { "La copia contiene una foto inválida o demasiado grande." }
      val source = bitmap(uri, 1024)
      source.recycle()
    }

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val start = SystemClock.elapsedRealtime()
      val source = bitmap(uri)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(InputImage.fromBitmap(source, 0))
        .addOnSuccessListener { result ->
          val tokens = result.textBlocks.flatMap { block -> block.lines.flatMap { line -> line.elements.mapNotNull { element ->
            element.boundingBox?.let { box -> mapOf("text" to element.text, "x" to box.left, "y" to box.top, "width" to box.width(), "height" to box.height()) }
          } } }
          promise.resolve(mapOf("width" to source.width, "height" to source.height, "tokens" to tokens, "elapsedMs" to SystemClock.elapsedRealtime() - start))
        }
        .addOnFailureListener { error -> promise.reject("OCR_FAILED", error.message, error) }
        .addOnCompleteListener { source.recycle(); recognizer.close() }
    }

    // Coordinates are normalized, clockwise: top-left, top-right, bottom-right, bottom-left.
    AsyncFunction("rectify") { uri: String, corners: List<Double> ->
      require(corners.size == 8 && corners.all { it.isFinite() && it in 0.0..1.0 }) { "Selecciona cuatro esquinas válidas." }
      val source = bitmap(uri)
      try {
        val src = corners.mapIndexed { i, v -> (v * if (i % 2 == 0) source.width else source.height).toFloat() }.toFloatArray()
        val width = max(hypot(src[2] - src[0], src[3] - src[1]), hypot(src[4] - src[6], src[5] - src[7])).toInt().coerceIn(32, 3000)
        val height = max(hypot(src[6] - src[0], src[7] - src[1]), hypot(src[4] - src[2], src[5] - src[3])).toInt().coerceIn(32, 3000)
        val dst = floatArrayOf(0f, 0f, width.toFloat(), 0f, width.toFloat(), height.toFloat(), 0f, height.toFloat())
        val matrix = Matrix()
        require(matrix.setPolyToPoly(src, 0, dst, 0, 4)) { "Las esquinas no forman un área válida." }
        val target = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        try {
          val canvas = Canvas(target)
          canvas.drawColor(Color.WHITE)
          canvas.drawBitmap(source, matrix, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
          mapOf("uri" to writeJpeg(target).toURI().toString(), "width" to width, "height" to height)
        } finally { target.recycle() }
      } finally { source.recycle() }
    }

    AsyncFunction("renderCard") { uri: String, brand: String, code: String, price: String, sizes: String ->
      val source = bitmap(uri, 1080)
      val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 34f; color = Color.rgb(24, 41, 43) }
      val sizeLines = mutableListOf<String>()
      var line = "Tallas:"
      for (word in sizes.split(" ")) {
        if (paint.measureText("$line $word") > 980) { sizeLines.add(line); line = word } else line += " $word"
      }
      sizeLines.add(line)
      val photoHeight = min(900, (source.height * (1080f / source.width)).toInt())
      val target = Bitmap.createBitmap(1080, photoHeight + 250 + sizeLines.size * 46, Bitmap.Config.ARGB_8888)
      try {
        val canvas = Canvas(target)
        canvas.drawColor(Color.WHITE)
        val ratio = min(1080f / source.width, photoHeight.toFloat() / source.height)
        val w = source.width * ratio; val h = source.height * ratio
        canvas.drawBitmap(source, null, RectF((1080 - w) / 2, (photoHeight - h) / 2, (1080 + w) / 2, (photoHeight + h) / 2), paint)
        paint.textSize = 42f
        canvas.drawText(brand.take(40), 50f, photoHeight + 64f, paint)
        paint.textSize = 34f
        canvas.drawText("Código: ${code.take(60)}", 50f, photoHeight + 120f, paint)
        canvas.drawText("Precio: $price USD", 50f, photoHeight + 172f, paint)
        sizeLines.forEachIndexed { index, text -> canvas.drawText(text, 50f, photoHeight + 228f + index * 46, paint) }
        writeJpeg(target).toURI().toString()
      } finally { source.recycle(); target.recycle() }
    }

    AsyncFunction("createBackup") { manifest: String, rootUri: String, paths: List<String> ->
      val root = localFile(rootUri)
      val zip = output("zip")
      try {
        ZipOutputStream(zip.outputStream().buffered()).use { out ->
          out.putNextEntry(ZipEntry("manifest.json")); out.write(manifest.toByteArray(Charsets.UTF_8)); out.closeEntry()
          for (path in paths.distinct()) {
            require(Regex("photos/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png)").matches(path)) { "Ruta de foto inválida." }
            val file = File(root, path).canonicalFile
            require(file.path.startsWith(root.canonicalPath + File.separator) && file.isFile) { "Falta una foto del catálogo: $path" }
            out.putNextEntry(ZipEntry(path)); file.inputStream().use { it.copyTo(out) }; out.closeEntry()
          }
        }
        zip.toURI().toString()
      } catch (error: Throwable) { zip.delete(); throw error }
    }

    AsyncFunction("extractBackup") { zipUri: String ->
      val zip = localFile(zipUri)
      val folder = File(context.cacheDir, "restore-${UUID.randomUUID()}").apply { mkdirs() }
      try {
        val names = mutableSetOf<String>()
        var total = 0L
        ZipInputStream(zip.inputStream().buffered()).use { input ->
          var entry = input.nextEntry
          val buffer = ByteArray(8192)
          while (entry != null) {
            val name = entry.name
            require(names.add(name) && names.size <= 5000) { "La copia contiene entradas duplicadas o demasiados archivos." }
            require(name == "manifest.json" || Regex("photos/[a-zA-Z0-9_-]+\\.(jpg|jpeg|png)").matches(name)) { "La copia contiene una ruta no permitida." }
            val file = File(folder, name).canonicalFile
            require(file.path.startsWith(folder.canonicalPath + File.separator))
            file.parentFile?.mkdirs()
            var entryBytes = 0L
            file.outputStream().use { out ->
              var count = input.read(buffer)
              while (count != -1) {
                total += count; entryBytes += count
                require(total <= 1024L * 1024 * 1024 && entryBytes <= 20L * 1024 * 1024) { "La copia supera el tamaño permitido." }
                out.write(buffer, 0, count); count = input.read(buffer)
              }
            }
            input.closeEntry(); entry = input.nextEntry
          }
        }
        val manifest = File(folder, "manifest.json")
        require(manifest.isFile && manifest.length() <= 8L * 1024 * 1024) { "La copia no tiene un manifiesto válido." }
        mapOf("folderUri" to folder.toURI().toString(), "manifestJson" to manifest.readText(Charsets.UTF_8))
      } catch (error: Throwable) { folder.deleteRecursively(); throw error }
    }
  }
}
