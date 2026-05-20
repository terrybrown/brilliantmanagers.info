import type { Connection } from '@/lib/db/connections'
import type { DirectReportRoundSummary } from '@/lib/db/direct-reports'

export type EnrichedConnection = Connection & {
  manager: { id: string; email: string; display_name: string }
  direct_report: { id: string; email: string; display_name: string }
}

export type { DirectReportRoundSummary }
