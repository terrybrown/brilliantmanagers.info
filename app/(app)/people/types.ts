import type { Connection } from '@/lib/db/connections'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

export type EnrichedConnection = Connection & {
  manager: { id: string; email: string; display_name: string } | null
  direct_report: { id: string; email: string; display_name: string } | null
}

export type { DirectReportRoundSummary }
