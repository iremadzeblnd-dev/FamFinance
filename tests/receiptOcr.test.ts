import assert from 'node:assert/strict'
import test from 'node:test'
import { detectReceiptTotal, normalizeReceiptAmount } from '../src/services/receiptOcr'

test('normalizes common decimal and thousands formats', () => {
  assert.equal(normalizeReceiptAmount('47.80'), 47.8)
  assert.equal(normalizeReceiptAmount('47,80'), 47.8)
  assert.equal(normalizeReceiptAmount('1 247.80'), 1247.8)
  assert.equal(normalizeReceiptAmount('1,247.80'), 1247.8)
  assert.equal(normalizeReceiptAmount('1 247,80'), 1247.8)
})

test('detects the required multilingual total-label examples', () => {
  const examples = [
    ['TOTAL 47.80', 47.8],
    ['სულ 32.50', 32.5],
    ['ИТОГО 105,40', 105.4],
    ['TOPLAM 78,90', 78.9],
  ] as const
  for (const [receiptText, expected] of examples) {
    assert.equal(detectReceiptTotal(receiptText, 90).amount, expected)
  }
})

test('detects a total when OCR splits the value and label across adjacent lines', () => {
  assert.equal(detectReceiptTotal('GRAND 47.80\nTOTAL GEL', 95).amount, 47.8)
})

test('rejects dates, phone/card numbers, and long receipt identifiers as totals', () => {
  const result = detectReceiptTotal(`
    DATE 20/09/2026 14:35
    RECEIPT #998877665544
    PHONE +995 555 123 456
    CARD 4761 2300 9988 4242
  `, 92)
  assert.equal(result.amount, undefined)
})

test('prioritizes a Georgian total over products, date, tax, and change', () => {
  const result = detectReceiptTotal(`
    20/09/2026 14:35
    პური             4.50
    რძე              5.20
    ქვეჯამი          47.00
    დღგ               8.00
    სულ:             47.80 GEL
    ნაღდი            50.00
    ხურდა             2.20
  `, 88)
  assert.equal(result.amount, 47.8)
  assert.equal(result.confidence, 'high')
})

test('handles English thousands and ignores card/change values', () => {
  const result = detectReceiptTotal(`
    Receipt #887120
    SUBTOTAL 1,300.00
    DISCOUNT 52.20
    GRAND TOTAL: 1,247.80 GEL
    CARD **** 4242 1,247.80
    CHANGE 0.00
  `, 91)
  assert.equal(result.amount, 1247.8)
  assert.equal(result.confidence, 'high')
})

test('reads a Russian total printed on the following line', () => {
  const result = detectReceiptTotal(`
    ТОВАР 1  12,30
    НДС       2,05
    К ОПЛАТЕ
    47,80 RUB
  `, 80)
  assert.equal(result.amount, 47.8)
  assert.equal(result.confidence, 'high')
})

test('reads Turkish decimal totals', () => {
  const result = detectReceiptTotal(`
    ARA TOPLAM 1 300,00
    İNDİRİM 52,20
    GENEL TOPLAM 1 247,80 TL
  `, 84)
  assert.equal(result.amount, 1247.8)
  assert.equal(result.confidence, 'high')
})

test('does not claim certainty for unrelated line-item prices', () => {
  const result = detectReceiptTotal('ELMA 12.20\nEKMEK 4.50\n20/09/2026', 90)
  assert.equal(result.amount, undefined)
  assert.equal(result.confidence, 'low')
})
