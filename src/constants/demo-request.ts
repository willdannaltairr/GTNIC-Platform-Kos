export const roleOptions = ['Operations', 'Trading', 'Asset management', 'Engineering', 'Leadership', 'Other'] as const
export const portfolioOptions = ['Under 50 MW', '50 to 250 MW', '250 MW to 1 GW', 'Over 1 GW'] as const
export const interestOptions = ['Forecasting', 'Storage dispatch', 'Market trading', 'Curtailment'] as const
export const demoRequestLimits = { fullName: 100, workEmail: 200, company: 120, message: 2000 } as const
export type DemoRequestField = 'fullName' | 'workEmail' | 'company' | 'role' | 'portfolioSize' | 'interests' | 'message'
export type DemoRequestErrors = Partial<Record<DemoRequestField, string>>
export interface DemoRequestPayload {
  fullName: string
  workEmail: string
  company: string
  role: string
  portfolioSize: string
  interests: string[]
  message: string
  website?: string
}
const EMAIL_PATTERN = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/
const isSingleLine = (value: string): boolean => !/[\r\n]/.test(value) && !CONTROL_CHARACTERS.test(value)
export const validateDemoRequest = (payload: DemoRequestPayload): DemoRequestErrors => {
  const errors: DemoRequestErrors = {}
  if (payload.fullName.length < 2) errors.fullName = 'Please enter your full name.'
  else if (payload.fullName.length > demoRequestLimits.fullName || !isSingleLine(payload.fullName))
    errors.fullName = 'Please enter a shorter name on one line.'
  if (!EMAIL_PATTERN.test(payload.workEmail)) errors.workEmail = 'Please enter a valid work email.'
  else if (payload.workEmail.length > demoRequestLimits.workEmail) errors.workEmail = 'This email address is too long.'
  if (payload.company.length < 2) errors.company = 'Please enter your company name.'
  else if (payload.company.length > demoRequestLimits.company || !isSingleLine(payload.company))
    errors.company = 'Please enter a shorter company name on one line.'

  return errors
}
