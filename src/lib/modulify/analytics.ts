export type AnalyticsPeriod = 'day' | '7d' | '30d' | 'month' | '6mo' | '12mo' | 'all'
export type AnalyticsMetric = 'visitors' | 'visits' | 'pageviews' | 'viewsPerVisit' | 'bounceRate' | 'visitDuration'
export type AnalyticsBreakdownMetric = Exclude<AnalyticsMetric, 'viewsPerVisit'>
export type AnalyticsInterval = 'hour' | 'day' | 'month'
export type AnalyticsDimension = 'page' | 'source' | 'country' | 'browser' | 'os' | 'device'
export type AnalyticsFilterOperator = 'is' | 'isNot' | 'contains'
export type AnalyticsExportFormat = 'json' | 'csv'
export type AnalyticsErrorData = Record<string, unknown>
export interface AnalyticsFilter {
  dimension: AnalyticsDimension
  operator?: AnalyticsFilterOperator
  value: string | Array<string>
}
export interface AnalyticsRangeOptions {
  period?: AnalyticsPeriod
  from?: string
  to?: string
  filters?: Array<AnalyticsFilter>
}
export interface AnalyticsStatsOptions<M extends AnalyticsMetric = AnalyticsMetric> extends AnalyticsRangeOptions {
  metrics?: Array<M>
}
export interface AnalyticsTimeseriesOptions extends AnalyticsRangeOptions {
  interval?: AnalyticsInterval
}
export interface AnalyticsBreakdownOptions<
  M extends AnalyticsBreakdownMetric = 'visitors',
> extends AnalyticsRangeOptions {
  metrics?: Array<M>
  limit?: number
  page?: number
}
export interface AnalyticsOverviewOptions extends AnalyticsRangeOptions {
  interval?: AnalyticsInterval
  limit?: number
}
export interface AnalyticsExportOptions {
  format?: AnalyticsExportFormat
}
export interface AnalyticsRange {
  period: AnalyticsPeriod | 'custom'
  from: string | null
  to: string | null
}
export interface AnalyticsStatus {
  enabled: boolean
  collecting: boolean
  installed: boolean
  published: boolean
  lastPublishedAt: string | null
}
export interface AnalyticsRealtime {
  visitors: number
  published: boolean
}
export interface AnalyticsTotals {
  visitors: number
  visits: number
  pageviews: number
  viewsPerVisit: number
}
