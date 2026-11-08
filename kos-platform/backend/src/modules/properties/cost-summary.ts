/**
 * TrueCost Simulator, perhitungan estimasi biaya kos.
 *
 * Aturan yang dipegang (per `tempelan-1.txt` 4.4):
 * - Deposit BUKAN biaya bulanan dan tidak dihitung sebagai pengeluaran hilang.
 * - Biaya VARIABLE diberi label estimasi, tidak pernah diklaim pasti.
 * - Jika ada komponen yang belum dikonfirmasi, total tidak disimpulkan pasti
 *   dan komponen tersebut dicantumkan pada daftar `unknowns`.
 * - Rumus ditampilkan apa adanya agar pengguna bisa memeriksa sendiri.
 */

export type BillingType = 'FIXED' | 'VARIABLE' | 'ONE_TIME' | 'MONTHLY'
export type CostConfidenceLevel = 'COMPLETE' | 'PARTIAL' | 'NEEDS_CONFIRMATION'

export interface CostComponentInput {
  id: string
  name: string
  amount: number
  billingType: BillingType
  isMandatory: boolean
  isRefundable: boolean
  confidence: CostConfidenceLevel
  description: string | null
}

export interface CostProjection {
  months: number
  total: number
}

export interface CostSummary {
  monthlyRent: number | null
  monthlyFixed: number
  monthlyEstimated: number
  monthlyTotalMin: number
  monthlyTotalEstimated: number
  depositAmount: number
  oneTimeOther: number
  upfrontTotal: number
  projections: CostProjection[]
  confidence: CostConfidenceLevel
  unknowns: string[]
  formulas: {
    monthly: string
    upfront: string
    projection: string
  }
}

const WORST_FIRST: CostConfidenceLevel[] = ['NEEDS_CONFIRMATION', 'PARTIAL', 'COMPLETE']

const worstOf = (levels: CostConfidenceLevel[]): CostConfidenceLevel => {
  for (const level of WORST_FIRST) {
    if (levels.includes(level)) return level
  }
  return 'NEEDS_CONFIRMATION'
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

export function buildCostSummary(
  components: CostComponentInput[],
  monthlyRent: number | null,
): CostSummary {
  // MONTHLY dan FIXED diperlakukan sama: nominal tetap per bulan.
  // VARIABLE juga bulanan, tetapi nominalnya estimasi.
  const monthlyFixed = sum(
    components.filter((c) => c.billingType === 'MONTHLY' || c.billingType === 'FIXED').map((c) => c.amount),
  )
  const monthlyEstimated = sum(components.filter((c) => c.billingType === 'VARIABLE').map((c) => c.amount))

  const oneTime = components.filter((c) => c.billingType === 'ONE_TIME')
  const depositAmount = sum(oneTime.filter((c) => c.isRefundable).map((c) => c.amount))
  const oneTimeOther = sum(oneTime.filter((c) => !c.isRefundable).map((c) => c.amount))

  const rent = monthlyRent ?? 0
  const monthlyTotalMin = rent + monthlyFixed
  const monthlyTotalEstimated = rent + monthlyFixed + monthlyEstimated
  const upfrontTotal = rent + depositAmount + oneTimeOther

  const projections: CostProjection[] = [3, 6, 12].map((months) => ({
    months,
    total: rent * months + monthlyFixed * months + monthlyEstimated * months + depositAmount + oneTimeOther,
  }))

  const confidence =
    components.length === 0
      ? 'NEEDS_CONFIRMATION'
      : worstOf(components.map((c) => c.confidence))

  const unknowns = components
    .filter((c) => c.confidence !== 'COMPLETE' || c.billingType === 'VARIABLE')
    .map((c) => c.name)

  return {
    monthlyRent,
    monthlyFixed,
    monthlyEstimated,
    monthlyTotalMin,
    monthlyTotalEstimated,
    depositAmount,
    oneTimeOther,
    upfrontTotal,
    projections,
    confidence,
    unknowns,
    formulas: {
      monthly: 'Sewa bulanan + biaya tetap bulanan (+ biaya variabel sebagai estimasi)',
      upfront: 'Sewa bulan pertama + deposit + biaya satu kali lainnya',
      projection: 'Sewa × jumlah bulan + biaya bulanan × jumlah bulan + deposit + biaya satu kali',
    },
  }
}
