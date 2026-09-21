export type ReceiptOcrConfidence = 'high' | 'low'

export interface ReceiptOcrResult {
  amount?: number
  confidence: ReceiptOcrConfidence
  recognitionConfidence: number
}

interface AmountCandidate {
  amount: number
  score: number
  lineIndex: number
  source: string
}

const debugOcr = (...values: unknown[]) => {
  const environment = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env
  if (environment?.DEV) console.debug('[receipt-ocr]', ...values)
}

const strongTotalLabels = [
  'გადასახდელია', 'გადასახდელი', 'საერთო', 'ჯამი', 'სულ',
  'grand total', 'amount due', 'balance due', 'total due', 'total', 'amount',
  'к оплате', 'итого', 'сумма',
  'genel toplam', 'ödenecek', 'odenecek', 'toplam',
]

const misleadingLabels = [
  'subtotal', 'sub total', 'ქვეჯამი', 'промежуточный итог', 'ara toplam',
  'discount', 'ფასდაკლება', 'скидка', 'indirim',
  'change', 'ხურდა', 'сдача', 'para üstü', 'para ustu',
  'tax', 'vat', 'დღგ', 'ндс', 'kdv',
  'cash', 'ნაღდი', 'налич', 'nakit',
]

const currencyPattern = /(?:gel|lari|₾|usd|eur|try|rub|ლარი|руб|tl)/iu
const amountPattern = /(?<![\d/.:])(?:\d{1,3}(?:[ '\u00a0.,]\d{3})+|\d+)[.,]\d{2}(?!\d)|(?<![\d/.:])\d{1,7}(?![\d/.:])/gu
const dateOrTimePattern = /\b\d{1,4}[/ .:-]\d{1,2}[/ .:-]\d{1,4}\b/u
const identifierPattern = /(?:receipt|check|invoice|order|ref|id|tin|tax id|ჩეკ|ქვითარ|ინვოის|ს\/კ|инн|чек|заказ|fiş|fis|vergi)\s*(?:no|№|#|nr|numara)?/iu

function normalizeForMatching(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

export function normalizeReceiptAmount(raw: string): number | undefined {
  let value = raw.replace(/[ '\u00a0]/g, '')
  const lastComma = value.lastIndexOf(',')
  const lastDot = value.lastIndexOf('.')
  const decimalIndex = Math.max(lastComma, lastDot)

  if (decimalIndex >= 0 && value.length - decimalIndex === 3) {
    const whole = value.slice(0, decimalIndex).replace(/[.,]/g, '')
    value = `${whole}.${value.slice(decimalIndex + 1)}`
  } else {
    value = value.replace(/[.,]/g, '')
  }

  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 && amount < 10_000_000 ? amount : undefined
}

function labelScore(line: string) {
  let score = 0
  for (const label of strongTotalLabels) {
    if (line.includes(label)) score = Math.max(score, label.length >= 8 ? 11 : 9)
  }
  if (misleadingLabels.some((label) => line.includes(label))) score -= 13
  return score
}

export function detectReceiptTotal(text: string, recognitionConfidence = 0): ReceiptOcrResult {
  const lines = text.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
  const candidates: AmountCandidate[] = []

  lines.forEach((rawLine, lineIndex) => {
    const line = normalizeForMatching(rawLine)
    const previousLine = normalizeForMatching(lines[lineIndex - 1] ?? '')
    const nextLine = normalizeForMatching(lines[lineIndex + 1] ?? '')
    const nearbyLabelScore = Math.max(labelScore(line), labelScore(previousLine) - 2, labelScore(nextLine) - 2)
    const containsDateOrTime = dateOrTimePattern.test(line)
    const looksLikeIdentifier = identifierPattern.test(line)

    for (const match of rawLine.matchAll(amountPattern)) {
      const amount = normalizeReceiptAmount(match[0])
      if (amount === undefined) continue

      let score = nearbyLabelScore
      if (currencyPattern.test(line)) score += 3
      if (lineIndex >= lines.length * 0.6) score += 2
      if (containsDateOrTime) score -= 12
      if (looksLikeIdentifier) score -= 9
      if (/\b(?:qty|quantity|რაოდ|кол-?во|adet)\b/iu.test(line)) score -= 7
      if (match[0].includes('.') || match[0].includes(',')) score += 1
      candidates.push({ amount, score, lineIndex, source: rawLine })
    }
  })

  candidates.sort((a, b) => b.score - a.score || b.lineIndex - a.lineIndex)
  const best = candidates[0]
  debugOcr('parsed candidates', candidates.map(({ amount, score, lineIndex, source }) => ({ amount, score, lineIndex, source })))
  if (!best || best.score < 5) return { confidence: 'low', recognitionConfidence }

  const runnerUp = candidates.find((candidate) => candidate.amount !== best.amount)
  const hasClearLead = !runnerUp || best.score - runnerUp.score >= 3
  const confidence = best.score >= 10 && hasClearLead && recognitionConfidence >= 35 ? 'high' : 'low'
  return { amount: best.amount, confidence, recognitionConfidence }
}

let workerPromise: Promise<import('tesseract.js').Worker> | undefined
let activeProgressListener: ((progress: number) => void) | undefined

async function getWorker() {
  if (!workerPromise) {
    debugOcr('initializing Tesseract worker with kat+eng')
    workerPromise = import('tesseract.js').then(({ createWorker }) => createWorker(
      ['kat', 'eng'],
      undefined,
      { logger: (message) => {
        debugOcr('progress', message.status, message.progress)
        if (message.status === 'recognizing text') activeProgressListener?.(message.progress)
      } },
    )).catch((error) => {
      workerPromise = undefined
      console.error('[receipt-ocr] Worker initialization failed', error)
      throw error
    })
  }
  return workerPromise
}

export async function readReceiptAmount(imageUrl: string, onProgress?: (progress: number) => void): Promise<ReceiptOcrResult> {
  activeProgressListener = onProgress
  try {
    debugOcr('recognition started')
    const worker = await getWorker()
    const result = await worker.recognize(imageUrl, { rotateAuto: true })
    debugOcr('recognized text', result.data.text)
    const parsed = detectReceiptTotal(result.data.text, result.data.confidence)
    debugOcr('selected total', parsed)
    return parsed
  } catch (error) {
    console.error('[receipt-ocr] Recognition failed', error)
    throw error
  } finally {
    activeProgressListener = undefined
  }
}

const loadOrientedImage = async (file: File) => {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image) }
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Unable to load receipt image')) }
    image.src = objectUrl
  })
}

/** Creates a high-contrast OCR image from the original file; this is never persisted. */
export async function prepareReceiptImageForOcr(file: File): Promise<string> {
  const image = await loadOrientedImage(file)
  const sourceWidth = 'naturalWidth' in image ? image.naturalWidth : image.width
  const sourceHeight = 'naturalHeight' in image ? image.naturalHeight : image.height
  const minimumShortEdge = 1400
  const maximumLongEdge = 3200
  const shortEdge = Math.min(sourceWidth, sourceHeight)
  const longEdge = Math.max(sourceWidth, sourceHeight)
  const upscale = shortEdge < minimumShortEdge ? minimumShortEdge / shortEdge : 1
  const scale = Math.min(upscale, maximumLongEdge / longEdge)
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas unavailable')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  if ('close' in image && typeof image.close === 'function') image.close()

  const pixels = context.getImageData(0, 0, width, height)
  const histogram = new Uint32Array(256)
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = Math.round(pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114)
    histogram[gray] += 1
  }
  const pixelCount = width * height
  const percentile = (fraction: number) => {
    const target = pixelCount * fraction
    let count = 0
    for (let value = 0; value < histogram.length; value += 1) {
      count += histogram[value]
      if (count >= target) return value
    }
    return 255
  }
  const low = percentile(0.02)
  const high = Math.max(low + 24, percentile(0.98))
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114
    const contrasted = Math.max(0, Math.min(255, (gray - low) * 255 / (high - low)))
    pixels.data[index] = contrasted
    pixels.data[index + 1] = contrasted
    pixels.data[index + 2] = contrasted
  }
  context.putImageData(pixels, 0, 0)
  debugOcr('preprocessed original image', { sourceWidth, sourceHeight, width, height, low, high })
  return canvas.toDataURL('image/jpeg', 0.94)
}
