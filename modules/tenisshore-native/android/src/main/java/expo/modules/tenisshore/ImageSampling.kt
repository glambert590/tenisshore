package expo.modules.tenisshore

internal fun imageSampleSize(width: Int, height: Int, edge: Int): Int {
  require(width > 0 && height > 0 && edge > 0)
  var sample = 1
  while (kotlin.math.max(width, height) / sample > edge) sample *= 2
  return sample
}
