import type { ReceiptAttachment } from '../types/app'

const MAX_SOURCE_BYTES = 12 * 1024 * 1024
// Keep each attachment modest because the current persistence layer is localStorage.
const MAX_STORED_BYTES = 650 * 1024
const MAX_DIMENSION = 1800

export type ReceiptImageError = 'notImage' | 'tooLarge' | 'processingFailed'

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Invalid image')) }
    image.src = objectUrl
  })
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
  return canvas.toDataURL('image/jpeg', quality)
}

function dataUrlBytes(dataUrl: string) {
  return Math.ceil((dataUrl.length - (dataUrl.indexOf(',') + 1)) * 0.75)
}

export async function processReceiptImage(file: File): Promise<ReceiptAttachment> {
  if (!file.type.startsWith('image/')) throw new Error('notImage' satisfies ReceiptImageError)
  if (file.size > MAX_SOURCE_BYTES) throw new Error('tooLarge' satisfies ReceiptImageError)

  try {
    const image = await loadImage(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    let quality = 0.82
    let url = canvasToDataUrl(canvas, quality)
    while (dataUrlBytes(url) > MAX_STORED_BYTES && quality > 0.48) {
      quality -= 0.08
      url = canvasToDataUrl(canvas, quality)
    }
    if (dataUrlBytes(url) > MAX_STORED_BYTES) throw new Error('tooLarge')

    return {
      url,
      fileName: file.name,
      mimeType: 'image/jpeg',
      size: dataUrlBytes(url),
      width: canvas.width,
      height: canvas.height,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'tooLarge') throw error
    throw new Error('processingFailed' satisfies ReceiptImageError)
  }
}
