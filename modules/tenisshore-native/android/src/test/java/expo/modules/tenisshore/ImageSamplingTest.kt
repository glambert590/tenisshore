package expo.modules.tenisshore

import org.junit.Assert.assertEquals
import org.junit.Test

class ImageSamplingTest {
  @Test fun smallImageNeverUsesZeroSampleSize() { assertEquals(1, imageSampleSize(400, 300, 3000)) }
  @Test fun largeImageUsesBoundedPowerOfTwo() { assertEquals(4, imageSampleSize(12000, 8000, 3000)) }
}
