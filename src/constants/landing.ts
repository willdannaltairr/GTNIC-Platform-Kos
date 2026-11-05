import { Cable, Compass, Gauge, ShieldCheck, Sparkles, Wind } from 'lucide-react'

export interface CustomerLogo {
  name: string
  icon: 'wind' | 'sun' | 'zap' | 'mountain' | 'battery' | 'waves'
}

export interface Stat {
  value: string
  label: string
  detail: string
}

export interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  initials: string
}

export interface Step {
  number: string
  when: string
  title: string
  text: string
}

export interface Faq {
  question: string
  answer: string
}

export interface Fact {
  value: string
  label: string
}

export interface Principle {
  icon: typeof Wind
  title: string
  text: string
}

export const customers: CustomerLogo[] = [
  { name: 'Northvale Energy', icon: 'wind' },
  { name: 'Solenne Power', icon: 'sun' },
  { name: 'Kestrel Grid', icon: 'zap' },
  { name: 'Brightmoor', icon: 'mountain' },
  { name: 'Aurelia Storage', icon: 'battery' },
  { name: 'Fjordline', icon: 'waves' },
]

export const stats: Stat[] = [
  { value: '38%', label: 'less energy curtailed', detail: 'Surplus is stored or sold instead of switched off.' },
  {
    value: '96.4%',
    label: 'day-ahead forecast accuracy',
    detail: 'Averaged across wind, solar and load after calibration.',
  },
  { value: '2.3x', label: 'faster dispatch decisions', detail: 'From forecast to approved plan, measured per shift.' },
  { value: '€6.8M', label: 'added market revenue', detail: 'Across customer portfolios in their first year.' },
]

export const featuredTestimonial: Testimonial = {
  quote:
    'We used to learn about curtailment the morning after. Now the evening plan is ready before lunch and the batteries are already charging when the sun overdelivers.',
  name: 'Maren Holt',
  role: 'Head of Operations',
  company: 'Northvale Energy',
  initials: 'MH',
}

export const testimonials: Testimonial[] = [
  {
    quote:
      'The forecasts held up through our first winter of icing alerts. That was the week our trading desk stopped keeping its own spreadsheet.',
    name: 'Tomas Reyes',
    role: 'Trading Lead',
    company: 'Kestrel Grid',
    initials: 'TR',
  },
  {
    quote:
      'Our control room and our traders finally look at the same picture of the day. Fewer phone calls, and faster ones.',
    name: 'Ines Kovac',
    role: 'Grid Integration Manager',
    company: 'Solenne Power',
    initials: 'IK',
  },
]

export const steps: Step[] = [
  {
    number: '01',
    when: 'Week 1',
    title: 'Connect your sites',
    text: 'Plug in SCADA, meters, battery systems and market feeds over the protocols you already use. No new hardware on site.',
  },
  {
    number: '02',
    when: 'Week 2',
    title: 'Calibrate the forecasts',
    text: "Gridora learns from two years of your history and local weather, tuning a forecast for every asset's quirks.",
  },
  {
    number: '03',
    when: 'Week 3',
    title: 'Act with confidence',
    text: 'Approve dispatch plans in one click, or let autopilot run inside the limits you set for charge, cycles and risk.',
  },
]

export const stepEpilogue = 'Live by day 21. Your first plan is approved, and the forecasts keep learning.'

export const integrations: string[] = [
  'Modbus TCP',
  'DNP3',
  'IEC 61850',
  'OPC UA',
  'MQTT',
  'Day-ahead and intraday market feeds',
  'Numerical weather models',
  'CSV and SFTP drops',
]

export const faqs: Faq[] = [
  {
    question: 'Which assets does Gridora support?',
    answer:
      'Wind, solar, battery storage, hydro and flexible loads. Hybrid sites are modelled as one portfolio, with every asset forecast on its own so you can see exactly where a surplus will come from.',
  },
  {
    question: 'How accurate are the forecasts?',
    answer:
      'After calibration, day-ahead accuracy typically lands between 94% and 97% depending on the asset mix and climate. Live accuracy is shown per site, so you never have to take our word for it.',
  },
  {
    question: 'Do we need new hardware on site?',
    answer:
      'No. Gridora reads from the systems you already run, including SCADA, meters, battery management systems and market feeds, over standard protocols or secure file drops.',
  },
  {
    question: 'Can Gridora dispatch batteries automatically?',
    answer:
      'Yes, when you want it to. Most teams start in advisory mode, approving each plan, then switch on autopilot within limits they set for state of charge, cycling and market exposure.',
  },
  {
    question: 'Where is our data stored?',
    answer:
      'In EU data centres, encrypted in transit and at rest, with role-based access for every team. Your data stays yours and can be exported at any time.',
  },
  {
    question: 'How is Gridora priced?',
    answer:
      'A platform fee plus a rate per megawatt under management, so cost scales with your portfolio. Pilots start with a single site for 60 days, and the demo call is the quickest way to get a quote.',
  },
]

export const aboutFacts: Fact[] = [
  { value: '14 GW', label: 'under forecast' },
  { value: '320+', label: 'sites connected' },
  { value: '99.95%', label: 'platform uptime' },
]

export const principles: Principle[] = [
  {
    icon: ShieldCheck,
    title: 'EU-hosted and encrypted',
    text: 'Encrypted in transit and at rest, with role-based access for every team.',
  },
  {
    icon: Gauge,
    title: 'Your data stays yours',
    text: 'Export everything at any time. We never sell or pool customer data.',
  },
  {
    icon: Compass,
    title: 'Engineers on call',
    text: 'A grid specialist is reachable around the clock during your first season.',
  },
]

export const capabilities: { icon: typeof Wind; title: string; text: string }[] = [
  {
    icon: Wind,
    title: 'Refreshed every five minutes',
    text: 'Weather models, SCADA readings and market prices stream in continuously, so the plan moves when the sky does.',
  },
  {
    icon: Cable,
    title: 'One picture for every team',
    text: 'Control room, trading desk and asset managers work from the same numbers instead of three spreadsheets.',
  },
  {
    icon: Sparkles,
    title: 'Every number explained',
    text: 'Trace any forecast back to the weather, asset data and assumptions behind it before you act on it.',
  },
]

export const solutionsUnderneath: { icon: typeof Wind; title: string; text: string }[] = [
  {
    icon: Wind,
    title: 'Curtailment alerts',
    text: 'Know hours ahead when output will outrun the grid, with a plan for where the surplus should go.',
  },
  {
    icon: Gauge,
    title: 'Asset health',
    text: 'Spot the turbine, string or battery cell that is underperforming before it costs you a peak.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-ready reports',
    text: 'Every dispatch decision is logged with the forecast and price that justified it.',
  },
]
