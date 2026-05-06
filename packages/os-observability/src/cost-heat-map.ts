// Per #110 + #196 — cost heat-map aggregator.
// Pure: turns a stream of cost samples (with timestamp + tags) into a 2-D
// heat-map: rows partitioned by Principal.tag (or any tag dimension), columns
// bucketed by time. The runtime layer wires the live stream; this module
// only does the bucketing.

export type HeatMapBucket = 'minute' | 'hour' | 'day'

export type CostHeatSample = {
  /** Unix epoch milliseconds. */
  readonly at: number
  readonly costUsd: number
  /** Tags propagated from the Principal / agent / workspace. */
  readonly tags: readonly string[]
}

export type CostHeatCell = {
  readonly tag: string
  readonly bucketStart: number
  readonly costUsd: number
  readonly sampleCount: number
}

export type CostHeatMap = {
  readonly bucket: HeatMapBucket
  readonly partitionTag: string
  readonly cells: readonly CostHeatCell[]
}

const BUCKET_MS: Readonly<Record<HeatMapBucket, number>> = {
  minute: 60_000,
  hour: 60 * 60_000,
  day: 24 * 60 * 60_000,
}

const bucketFor = (at: number, bucket: HeatMapBucket): number => {
  const span = BUCKET_MS[bucket]
  return Math.floor(at / span) * span
}

/**
 * Build a partitioned cost heat map (#110 + #196). `partitionTagPrefix`
 * filters which tag values become rows — e.g. pass `'team:'` to bucket by
 * Principal team tag and ignore all other tags. `bucket` controls column
 * granularity. Pure; deterministic given the inputs.
 */
export const buildCostHeatMap = (
  samples: readonly CostHeatSample[],
  args: {
    readonly bucket: HeatMapBucket
    /** Only tags starting with this prefix become rows; pass `''` to allow all. */
    readonly partitionTagPrefix: string
  },
): CostHeatMap => {
  const cells = new Map<string, CostHeatCell>()
  const key = (tag: string, bucketStart: number): string => `${tag}|${bucketStart}`

  for (const sample of samples) {
    const matchedTags = sample.tags.filter((t) => t.startsWith(args.partitionTagPrefix))
    if (matchedTags.length === 0) continue
    const bucketStart = bucketFor(sample.at, args.bucket)
    for (const tag of matchedTags) {
      const k = key(tag, bucketStart)
      const existing = cells.get(k)
      if (existing === undefined) {
        cells.set(k, {
          tag,
          bucketStart,
          costUsd: sample.costUsd,
          sampleCount: 1,
        })
      } else {
        cells.set(k, {
          tag,
          bucketStart,
          costUsd: existing.costUsd + sample.costUsd,
          sampleCount: existing.sampleCount + 1,
        })
      }
    }
  }

  const out = [...cells.values()].sort((a, b) => {
    if (a.tag !== b.tag) return a.tag.localeCompare(b.tag)
    return a.bucketStart - b.bucketStart
  })

  return {
    bucket: args.bucket,
    partitionTag: args.partitionTagPrefix,
    cells: out,
  }
}

/** Sum costs across all cells for a single tag (#110). */
export const totalCostForTag = (heat: CostHeatMap, tag: string): number =>
  heat.cells.filter((c) => c.tag === tag).reduce((n, c) => n + c.costUsd, 0)
