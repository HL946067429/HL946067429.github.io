/**
 * Photo processing utilities for compressing, thumbnailing, and extracting EXIF data.
 */

/**
 * Compress an image file by resizing it on a canvas.
 * Only compresses if the file exceeds 2MB; otherwise returns the original as a Blob.
 * @param file - The source image File
 * @param maxWidth - Maximum width in pixels (default 1920)
 * @returns A JPEG Blob at 0.85 quality
 */
export async function compressImage(file: File, maxWidth: number = 1920): Promise<Blob> {
  // If already under 2MB, return as-is
  if (file.size <= 2 * 1024 * 1024) {
    return file
  }

  const imageBitmap = await createImageBitmap(file)
  const { width, height } = imageBitmap

  let targetWidth = width
  let targetHeight = height

  if (width > maxWidth) {
    targetWidth = maxWidth
    targetHeight = Math.round(height * (maxWidth / width))
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context')
  }

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  imageBitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob returned null'))
        }
      },
      'image/jpeg',
      0.85,
    )
  })
}

/**
 * Generate a square thumbnail by center-cropping the source image.
 * @param blob - The source image Blob
 * @param size - The thumbnail dimension in pixels (default 300)
 * @returns A JPEG Blob at 0.7 quality
 */
export async function generateThumbnail(blob: Blob, size: number = 300): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob)
  const { width, height } = imageBitmap

  // Determine the center crop region (square)
  const cropSize = Math.min(width, height)
  const cropX = Math.round((width - cropSize) / 2)
  const cropY = Math.round((height - cropSize) / 2)

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context')
  }

  ctx.drawImage(imageBitmap, cropX, cropY, cropSize, cropSize, 0, 0, size, size)
  imageBitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob returned null'))
        }
      },
      'image/jpeg',
      0.7,
    )
  })
}

/**
 * Read EXIF DateTimeOriginal from a JPEG file by manually parsing binary EXIF data.
 * No external library is used. Returns an ISO date string or null if not found.
 * @param file - The source JPEG File
 * @returns ISO date string (e.g. "2024-06-15T14:30:00") or null
 */
export async function extractExifDate(file: File): Promise<string | null> {
  try {
    // Read the first 128KB which is more than enough for EXIF headers
    const slice = file.slice(0, 128 * 1024)
    const buffer = await slice.arrayBuffer()
    const view = new DataView(buffer)

    // Check for JPEG SOI marker
    if (view.getUint16(0) !== 0xffd8) {
      return null
    }

    let offset = 2
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset)

      // APP1 marker (EXIF)
      if (marker === 0xffe1) {
        return parseExifBlock(view, offset + 4)
      }

      // Skip non-EXIF APP markers
      if ((marker & 0xff00) !== 0xff00) {
        break
      }

      const segmentLength = view.getUint16(offset + 2)
      offset += 2 + segmentLength
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse the EXIF block starting at the given offset to find DateTimeOriginal.
 */
function parseExifBlock(view: DataView, exifStart: number): string | null {
  // Check for "Exif\0\0" header
  const exifHeader =
    String.fromCharCode(view.getUint8(exifStart)) +
    String.fromCharCode(view.getUint8(exifStart + 1)) +
    String.fromCharCode(view.getUint8(exifStart + 2)) +
    String.fromCharCode(view.getUint8(exifStart + 3))

  if (exifHeader !== 'Exif') {
    return null
  }

  const tiffStart = exifStart + 6
  const byteOrder = view.getUint16(tiffStart)
  const littleEndian = byteOrder === 0x4949 // "II" = Intel = little-endian

  // Verify TIFF magic number 0x002A
  if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
    return null
  }

  // Offset to first IFD
  const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian)

  // Search IFD0 for the ExifIFD pointer (tag 0x8769)
  const exifIfdPointer = findTagValue(view, tiffStart, tiffStart + ifd0Offset, littleEndian, 0x8769)
  if (exifIfdPointer === null) {
    return null
  }

  // Search ExifIFD for DateTimeOriginal (tag 0x9003)
  const dateTimeOriginal = findTagString(
    view,
    tiffStart,
    tiffStart + exifIfdPointer,
    littleEndian,
    0x9003,
  )

  if (!dateTimeOriginal) {
    return null
  }

  // EXIF date format: "YYYY:MM:DD HH:MM:SS" -> convert to ISO
  return exifDateToISO(dateTimeOriginal)
}

/**
 * Search an IFD for a tag and return its 4-byte value as a uint32.
 */
function findTagValue(
  view: DataView,
  _tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  targetTag: number,
): number | null {
  try {
    const entryCount = view.getUint16(ifdOffset, littleEndian)

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, littleEndian)

      if (tag === targetTag) {
        return view.getUint32(entryOffset + 8, littleEndian)
      }
    }
  } catch {
    // Ignore out-of-bounds reads
  }

  return null
}

/**
 * Search an IFD for a string tag (ASCII type) and return the string value.
 */
function findTagString(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  targetTag: number,
): string | null {
  try {
    const entryCount = view.getUint16(ifdOffset, littleEndian)

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdOffset + 2 + i * 12
      const tag = view.getUint16(entryOffset, littleEndian)

      if (tag === targetTag) {
        const type = view.getUint16(entryOffset + 2, littleEndian)
        const count = view.getUint32(entryOffset + 4, littleEndian)

        // Type 2 = ASCII
        if (type !== 2) {
          return null
        }

        let stringOffset: number
        if (count <= 4) {
          // Value is stored inline in the value field
          stringOffset = entryOffset + 8
        } else {
          // Value is stored at an offset from the TIFF header
          stringOffset = tiffStart + view.getUint32(entryOffset + 8, littleEndian)
        }

        let result = ''
        for (let j = 0; j < count - 1; j++) {
          // count includes null terminator
          result += String.fromCharCode(view.getUint8(stringOffset + j))
        }

        return result
      }
    }
  } catch {
    // Ignore out-of-bounds reads
  }

  return null
}

/**
 * Convert EXIF date format "YYYY:MM:DD HH:MM:SS" to ISO format.
 */
function exifDateToISO(exifDate: string): string | null {
  // Expected format: "2024:06:15 14:30:00"
  const match = exifDate.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second] = match
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

/**
 * Create an object URL for a Blob. Wrapper around URL.createObjectURL.
 * @param blob - The source Blob
 * @returns An object URL string
 */
export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * Revoke a previously created object URL. Wrapper around URL.revokeObjectURL.
 * @param url - The object URL to revoke
 */
export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}
