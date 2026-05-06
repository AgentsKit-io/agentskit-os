/**
 * Pure cron preview helper for the visual cron UI.
 *
 * Supports the standard 5-field cron syntax (min hour dom month dow):
 *   - `*` wildcard
 *   - integer literals
 *   - `*\/N` step (every N units)
 *   - comma lists `1,5,10`
 *   - dash ranges `9-17`
 *   - dow accepts both `0` and `7` for Sunday
 *
 * Returns the next N firing times after `from` (UTC). Returns an empty
 * list if the expression is invalid or never fires inside the search horizon.
 */

export type CronPreviewResult =
  | { readonly ok: true; readonly fields: ParsedCron; readonly nextRuns: readonly Date[] }
  | { readonly ok: false; readonly error: string }

export type ParsedCron = {
  readonly minute: ReadonlySet<number>
  readonly hour: ReadonlySet<number>
  readonly dayOfMonth: ReadonlySet<number>
  readonly month: ReadonlySet<number>
  readonly dayOfWeek: ReadonlySet<number>
}

const FIELD_RANGES: ReadonlyArray<{ readonly min: number; readonly max: number }> = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
]

const parseInteger = (raw: string, range: { min: number; max: number }): number | null => {
  if (!/^-?\d+$/.test(raw)) return null
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value)) return null
  if (value < range.min || value > range.max) return null
  return value
}

const expandRange = (
  raw: string,
  range: { min: number; max: number },
): readonly number[] | null => {
  const [startRaw, endRaw] = raw.split('-')
  if (startRaw === undefined || endRaw === undefined) return null
  const start = parseInteger(startRaw, range)
  const end = parseInteger(endRaw, range)
  if (start === null || end === null || start > end) return null
  const out: number[] = []
  for (let i = start; i <= end; i += 1) out.push(i)
  return out
}

const expandStep = (
  raw: string,
  range: { min: number; max: number },
): readonly number[] | null => {
  const [base, stepRaw] = raw.split('/')
  if (base === undefined || stepRaw === undefined) return null
  const step = Number.parseInt(stepRaw, 10)
  if (!Number.isFinite(step) || step <= 0) return null
  const baseList = expandPart(base, range)
  if (baseList === null) return null
  return baseList.filter((value) => (value - range.min) % step === 0)
}

const expandWildcard = (range: { min: number; max: number }): readonly number[] => {
  const out: number[] = []
  for (let i = range.min; i <= range.max; i += 1) out.push(i)
  return out
}

const expandList = (
  raw: string,
  range: { min: number; max: number },
): readonly number[] | null => {
  const parts = raw.split(',')
  const all: number[] = []
  for (const part of parts) {
    const expanded = expandPart(part, range)
    if (expanded === null) return null
    all.push(...expanded)
  }
  return all
}

const expandPart = (
  raw: string,
  range: { min: number; max: number },
): readonly number[] | null => {
  if (raw === '*') return expandWildcard(range)
  if (raw.includes(',')) return expandList(raw, range)
  if (raw.includes('/')) return expandStep(raw, range)
  if (raw.includes('-')) return expandRange(raw, range)
  const single = parseInteger(raw, range)
  return single === null ? null : [single]
}

const normalizeDayOfWeek = (values: readonly number[]): readonly number[] =>
  values.map((value) => (value === 7 ? 0 : value))

const expandField = (
  raw: string,
  range: { min: number; max: number },
  isDayOfWeek: boolean,
): ReadonlySet<number> | null => {
  const dowRange = isDayOfWeek ? { min: 0, max: 7 } : range
  const expanded = expandPart(raw, dowRange)
  if (expanded === null) return null
  const cleaned = isDayOfWeek ? normalizeDayOfWeek(expanded) : expanded
  return new Set(cleaned)
}

export const parseCron = (expression: string): ParsedCron | null => {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) return null
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields
  if (
    minute === undefined ||
    hour === undefined ||
    dayOfMonth === undefined ||
    month === undefined ||
    dayOfWeek === undefined
  )
    return null

  const minuteSet = expandField(minute, FIELD_RANGES[0]!, false)
  const hourSet = expandField(hour, FIELD_RANGES[1]!, false)
  const domSet = expandField(dayOfMonth, FIELD_RANGES[2]!, false)
  const monthSet = expandField(month, FIELD_RANGES[3]!, false)
  const dowSet = expandField(dayOfWeek, FIELD_RANGES[4]!, true)

  if (
    minuteSet === null ||
    hourSet === null ||
    domSet === null ||
    monthSet === null ||
    dowSet === null
  )
    return null

  return {
    minute: minuteSet,
    hour: hourSet,
    dayOfMonth: domSet,
    month: monthSet,
    dayOfWeek: dowSet,
  }
}

const matches = (fields: ParsedCron, candidate: Date): boolean => {
  if (!fields.minute.has(candidate.getUTCMinutes())) return false
  if (!fields.hour.has(candidate.getUTCHours())) return false
  if (!fields.dayOfMonth.has(candidate.getUTCDate())) return false
  if (!fields.month.has(candidate.getUTCMonth() + 1)) return false
  if (!fields.dayOfWeek.has(candidate.getUTCDay())) return false
  return true
}

const SEARCH_HORIZON_MINUTES = 60 * 24 * 366

export const cronPreview = (
  expression: string,
  count: number,
  from: Date = new Date(),
): CronPreviewResult => {
  const fields = parseCron(expression)
  if (!fields) return { ok: false, error: 'invalid cron expression' }
  const requested = Math.max(0, Math.min(count, 50))

  const start = new Date(from.getTime())
  start.setUTCSeconds(0, 0)
  start.setUTCMinutes(start.getUTCMinutes() + 1)

  const next: Date[] = []
  const cursor = new Date(start.getTime())
  for (let step = 0; step < SEARCH_HORIZON_MINUTES && next.length < requested; step += 1) {
    if (matches(fields, cursor)) {
      next.push(new Date(cursor.getTime()))
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1)
  }

  return { ok: true, fields, nextRuns: next }
}
