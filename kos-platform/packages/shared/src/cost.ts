import { COST_CONFIDENCE, COST_CONFIDENCE_LABELS } from './constants'
import type {
  CostLine,
  CostSimulationInput,
  CostSimulationResult,
} from './types'

const money = (value: number) => Math.round(Math.max(0, value))

export function calculateTrueCost(input: CostSimulationInput): CostSimulationResult {
  const rent = money(input.monthlyRent)
  const depositProvided = typeof input.deposit === 'number' && Number.isFinite(input.deposit)
  const deposit = depositProvided ? money(input.deposit as number) : 0
  const depositConfirmed = input.depositConfirmed ?? depositProvided
  const depositRefundable = input.depositRefundable ?? true
  const duration = input.durationMonths ?? 1

  const lines: CostLine[] = []
  const unknownCosts: string[] = []
  let fixedMonthly = 0
  let variableMonthly = 0
  let oneTimeTotal = 0

  if (!depositProvided) {
    unknownCosts.push('Deposit amount was not provided.')
  } else if (!depositConfirmed) {
    unknownCosts.push('Deposit amount has not been confirmed by the owner.')
  }

  for (const component of input.components) {
    const mandatory = component.isMandatory ?? true
    const confirmed = component.isConfirmed ?? true
    const estimated = component.isEstimated ?? false
    const amount = money(component.amount)
    const isRecurring = component.billingType === 'MONTHLY' || component.billingType === 'FIXED'
    const isVariable = component.billingType === 'VARIABLE'
    const isOneTime = component.billingType === 'ONE_TIME'

    const includedInEstimate = mandatory && confirmed
    if (mandatory && !confirmed) {
      unknownCosts.push(`${component.name} has not been confirmed.`)
    }

    lines.push({
      name: component.name,
      amount,
      billingType: component.billingType,
      kind: isVariable
        ? 'RECURRING_VARIABLE'
        : isRecurring
          ? 'RECURRING_FIXED'
          : 'ONE_TIME',
      isEstimated: estimated,
      isConfirmed: confirmed,
      isRefundable: component.isRefundable ?? false,
      isMandatory: mandatory,
      includedInEstimate,
    })

    if (!includedInEstimate) continue
    if (isVariable) variableMonthly += amount
    else if (isRecurring) fixedMonthly += amount
    else if (isOneTime) oneTimeTotal += amount
  }

  if (depositProvided) {
    lines.unshift({
      name: 'Deposit',
      amount: deposit,
      billingType: 'ONE_TIME',
      kind: 'DEPOSIT',
      isEstimated: false,
      isConfirmed: depositConfirmed,
      isRefundable: depositRefundable,
      isMandatory: true,
      includedInEstimate: depositConfirmed,
    })
  }

  const monthlyEstimated = rent + fixedMonthly + variableMonthly
  const upfrontEstimated =
    monthlyEstimated +
    (depositConfirmed ? deposit : 0) +
    oneTimeTotal

  const totals = {
    '1': money(monthlyEstimated + (depositConfirmed ? deposit : 0) + oneTimeTotal),
    '3': money(monthlyEstimated * 3 + (depositConfirmed ? deposit : 0) + oneTimeTotal),
    '6': money(monthlyEstimated * 6 + (depositConfirmed ? deposit : 0) + oneTimeTotal),
    '12': money(monthlyEstimated * 12 + (depositConfirmed ? deposit : 0) + oneTimeTotal),
  }

  const hasEstimatedMandatory = lines.some(
    (line) => line.isMandatory && line.includedInEstimate && line.isEstimated,
  )
  let confidence: CostSimulationResult['confidence']
  if (unknownCosts.length > 0) {
    confidence = COST_CONFIDENCE.NEEDS_CONFIRMATION
  } else if (hasEstimatedMandatory || input.components.length === 0) {
    confidence = COST_CONFIDENCE.PARTIAL
    if (input.components.length === 0) {
      unknownCosts.push('No utility or additional cost components were provided by the owner.')
    }
  } else {
    confidence = COST_CONFIDENCE.COMPLETE
  }

  const monthlyBudget = input.monthlyBudget ?? null
  const upfrontBudget = input.upfrontBudget ?? null
  let status: CostSimulationResult['budget']['status'] = 'NOT_EVALUATED'
  if (monthlyBudget != null || upfrontBudget != null) {
    const monthlyOver = monthlyBudget != null && monthlyEstimated > monthlyBudget
    const upfrontOver = upfrontBudget != null && upfrontEstimated > upfrontBudget
    status = monthlyOver || upfrontOver ? 'OVER_BUDGET' : 'WITHIN_BUDGET'
  }

  const formula = [
    `Monthly estimate = rent (${rent}) + fixed monthly costs (${fixedMonthly}) + variable monthly estimates (${variableMonthly})`,
    `Upfront estimate = first month (${monthlyEstimated}) + deposit (${depositConfirmed ? deposit : 0}) + one-time costs (${oneTimeTotal})`,
    `Multi-month total = monthly estimate × months + deposit + one-time costs`,
    `Deposit is not a monthly fee and ${depositRefundable ? 'is' : 'is not'} refundable according to the provided terms.`,
  ]

  return {
    monthlyRent: rent,
    deposit,
    depositRefundable,
    monthlyEstimated: money(monthlyEstimated),
    upfrontEstimated: money(upfrontEstimated),
    totals: {
      '1': money(totals['1']),
      '3': money(totals['3']),
      '6': money(totals['6']),
      '12': money(totals['12']),
    },
    fixedMonthly: money(fixedMonthly),
    variableMonthly: money(variableMonthly),
    oneTimeTotal: money(oneTimeTotal),
    lines,
    unknownCosts,
    confidence,
    confidenceLabel: COST_CONFIDENCE_LABELS[confidence],
    formula,
    budget: {
      monthlyBudget,
      upfrontBudget,
      monthlyDelta: monthlyBudget != null ? money(monthlyBudget - monthlyEstimated) : null,
      upfrontDelta: upfrontBudget != null ? money(upfrontBudget - upfrontEstimated) : null,
      status,
    },
    disclaimer:
      'This is an estimate based on owner-provided cost components. It is not a final invoice. Verify variable and unconfirmed costs with the owner before paying.',
  }
}

export function monthlyCostOf(components: Array<{ amount: number; billingType: string; isMandatory?: boolean; isConfirmed?: boolean }>): number {
  return components
    .filter((component) => (component.isMandatory ?? true) && (component.isConfirmed ?? true))
    .filter((component) => component.billingType === 'MONTHLY' || component.billingType === 'FIXED' || component.billingType === 'VARIABLE')
    .reduce((sum, component) => sum + component.amount, 0)
}
