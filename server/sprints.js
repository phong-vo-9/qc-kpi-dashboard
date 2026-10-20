/**
 * Trích xuất ngày kết thúc (end date) từ chuỗi tên sprint.
 * Hỗ trợ các định dạng:
 * - GMS 20/10/2026 - 02/11/2026 (hoặc 2/11/2026)
 * - GMS 20/10/26 - 02/11/26
 * - ASO Sprint 63 (11/8 - 24/8)
 * - Các biến thể gạch nối: -, –, —, to, đến
 */
export function parseSprintEndDate(sprint) {
  if (!sprint) return null
  const str = String(sprint).trim()

  // 1. Dạng có năm 4 chữ số sau dấu gạch: e.g. - 02/11/2026, - 2/11/2026
  const fullMatch = str.match(/(?:[-–—]|to|đến)\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i)
  if (fullMatch) {
    const [, d, m, y] = fullMatch
    return Date.UTC(Number(y), Number(m) - 1, Number(d))
  }

  // 2. Dạng năm 2 chữ số: e.g. - 02/11/26
  const shortYearMatch = str.match(/(?:[-–—]|to|đến)\s*(\d{1,2})\/(\d{1,2})\/(\d{2})\b/i)
  if (shortYearMatch) {
    const [, d, m, y] = shortYearMatch
    return Date.UTC(2000 + Number(y), Number(m) - 1, Number(d))
  }

  // 3. Dạng không có năm ở cuối (e.g. ASO Sprint 63 (11/8 - 24/8))
  const noYearMatch = str.match(/(?:[-–—]|to|đến)\s*(\d{1,2})\/(\d{1,2})\b/i)
  if (noYearMatch) {
    const [, d, m] = noYearMatch
    const yearMatch = str.match(/\b(20\d{2})\b/)
    const y = yearMatch ? Number(yearMatch[1]) : 2026
    return Date.UTC(y, Number(m) - 1, Number(d))
  }

  // 4. Single date nếu không có dấu nối
  const singleDateMatch = str.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (singleDateMatch) {
    const [, d, m, y] = singleDateMatch
    return Date.UTC(Number(y), Number(m) - 1, Number(d))
  }

  return null
}

/**
 * Trích xuất ngày bắt đầu (start date) từ chuỗi tên sprint nếu có.
 */
export function parseSprintStartDate(sprint) {
  if (!sprint) return null
  const str = String(sprint).trim()
  const match = str.match(/(?:^|[^\d])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*(?:[-–—]|to|đến)/i)
  if (match) {
    const [, d, m, rawY] = match
    let y = 2026
    if (rawY) {
      y = rawY.length === 2 ? 2000 + Number(rawY) : Number(rawY)
    } else {
      const yearMatch = str.match(/\b(20\d{2})\b/)
      if (yearMatch) y = Number(yearMatch[1])
    }
    return Date.UTC(y, Number(m) - 1, Number(d))
  }
  return null
}

/**
 * So sánh 2 sprint:
 * 1. Ưu tiên Sprint của GMS lên trước.
 * 2. Sprint GMS được sắp xếp GIẢM DẦN theo ngày end (sprint mới nhất lên đầu).
 *    Nếu cùng ngày end, so sánh ngày start giảm dần.
 * 3. Sprint GMS có ngày xếp trước sprint GMS không có ngày.
 * 4. Các sprint khác (ASO...): sắp xếp giảm dần theo ngày end (hoặc số sprint).
 * 5. Các mục backlog hoặc không ngày xếp cuối cùng.
 */
export function compareSprints(a, b) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  if (a === b) return 0

  const isGmsA = /^GMS(?:\s|$)/i.test(a)
  const isGmsB = /^GMS(?:\s|$)/i.test(b)

  // 1. Ưu tiên GMS sprint lên đầu
  if (isGmsA && !isGmsB) return -1
  if (!isGmsA && isGmsB) return 1

  const endA = parseSprintEndDate(a)
  const endB = parseSprintEndDate(b)

  // 2. Cả hai đều có ngày end: sắp xếp giảm dần (mới nhất lên trước)
  if (endA !== null && endB !== null) {
    if (endA !== endB) return endB - endA
    const startA = parseSprintStartDate(a)
    const startB = parseSprintStartDate(b)
    if (startA !== null && startB !== null && startA !== startB) {
      return startB - startA
    }
  }

  // 3. Sprint có ngày đứng trước sprint không có ngày
  if (endA !== null && endB === null) return -1
  if (endA === null && endB !== null) return 1

  // 4. Fallback tự nhiên giảm dần (ví dụ Sprint 63 trước Sprint 62)
  return b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Sắp xếp danh sách sprint
 */
export function sortSprints(sprints) {
  if (!Array.isArray(sprints)) return []
  return [...sprints].sort(compareSprints)
}
