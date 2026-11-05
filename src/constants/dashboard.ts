export type RangeId = 'today' | 'tomorrow' | 'week'

export type DeltaTone = 'good' | 'bad' | 'neutral'

export type ActionTag = 'Storage' | 'Market' | 'Demand' | 'Assets'

export interface LoadPoint {
  label: string
  forecast: number
  actual: number | null
  low: number
  high: number
}

export interface KpiItem {
  id: string
  label: string
  value: string
  unit: string
  delta: string
  tone: DeltaTone
  direction?: 'up' | 'down'
  trend?: number[]
  meter?: {
    value: number
    max: number
  }
}

export interface MixItem {
  id: 'wind' | 'solar' | 'hydro' | 'other'
  label: string
  share: number
}

export interface ActionItem {
  id: string
  title: string
  detail: string
  tag: ActionTag
}

export interface DashboardRange {
  id: RangeId
  label: string
  chartTitle: string
  chartSubtitle: string
  caption: string
  tickEvery: number
  nowIndex: number | null
  yTicks: number[]
  points: LoadPoint[]
  kpis: KpiItem[]
  mix: MixItem[]
  actions: ActionItem[]
}

const hours = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`)

// Hourly figures below are the production numbers, band included, so the chart
// and the accessible table agree with what the live site reports.
const todayPoints: LoadPoint[] = [
  { label: '00:00', forecast: 1860, actual: 1842, low: 1823, high: 1897 },
  { label: '01:00', forecast: 1760, actual: 1771, low: 1725, high: 1795 },
  { label: '02:00', forecast: 1690, actual: 1702, low: 1656, high: 1724 },
  { label: '03:00', forecast: 1650, actual: 1638, low: 1617, high: 1683 },
  { label: '04:00', forecast: 1670, actual: 1661, low: 1637, high: 1703 },
  { label: '05:00', forecast: 1780, actual: 1795, low: 1744, high: 1816 },
  { label: '06:00', forecast: 2010, actual: 2034, low: 1970, high: 2050 },
  { label: '07:00', forecast: 2260, actual: 2241, low: 2215, high: 2305 },
  { label: '08:00', forecast: 2410, actual: 2436, low: 2362, high: 2458 },
  { label: '09:00', forecast: 2440, actual: 2461, low: 2391, high: 2489 },
  { label: '10:00', forecast: 2380, actual: 2352, low: 2332, high: 2428 },
  { label: '11:00', forecast: 2290, actual: 2268, low: 2244, high: 2336 },
  { label: '12:00', forecast: 2220, actual: 2231, low: 2176, high: 2264 },
  { label: '13:00', forecast: 2190, actual: 2176, low: 2146, high: 2234 },
  { label: '14:00', forecast: 2260, actual: 2243, low: 2215, high: 2305 },
  { label: '15:00', forecast: 2410, actual: null, low: 2352, high: 2468 },
  { label: '16:00', forecast: 2600, actual: null, low: 2527, high: 2673 },
  { label: '17:00', forecast: 2810, actual: null, low: 2720, high: 2900 },
  { label: '18:00', forecast: 2914, actual: null, low: 2809, high: 3019 },
  { label: '19:00', forecast: 2860, actual: null, low: 2746, high: 2974 },
  { label: '20:00', forecast: 2690, actual: null, low: 2572, high: 2808 },
  { label: '21:00', forecast: 2470, actual: null, low: 2351, high: 2589 },
  { label: '22:00', forecast: 2240, actual: null, low: 2124, high: 2356 },
  { label: '23:00', forecast: 2020, actual: null, low: 1907, high: 2133 },
]

const tomorrowForecast = [
  1900, 1800, 1720, 1680, 1700, 1820, 2060, 2310, 2470, 2500, 2430, 2330, 2250, 2210, 2290, 2450, 2660, 2880, 2990,
  3020, 2840, 2580, 2330, 2090,
]

const tomorrowPoints: LoadPoint[] = tomorrowForecast.map((forecast, index) => ({
  label: hours[index],
  forecast,
  actual: null,
  low: Math.round(forecast * 0.97),
  high: Math.round(forecast * 1.03),
}))

const weekDays = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu']
const weekForecast = [2914, 3020, 2550, 2680, 3080, 2970, 3010]
const weekSpread = [0.02, 0.026, 0.032, 0.038, 0.044, 0.05, 0.056]

const weekPoints: LoadPoint[] = weekForecast.map((forecast, index) => ({
  label: weekDays[index],
  forecast,
  actual: null,
  low: Math.round(forecast * (1 - weekSpread[index])),
  high: Math.round(forecast * (1 + weekSpread[index])),
}))

const mix: MixItem[] = [
  { id: 'wind', label: 'Wind', share: 41 },
  { id: 'solar', label: 'Solar', share: 33 },
  { id: 'hydro', label: 'Hydro', share: 14 },
  { id: 'other', label: 'Other', share: 12 },
]

const chartHours = [1860, 1760, 1690, 1650, 1670, 1780, 2010, 2260, 2410, 2440, 2380, 2290, 2220, 2190, 2260, 2410]

const actions: ActionItem[] = [
  {
    id: 'charge-ridgeway',
    title: 'Charge Ridgeway battery',
    detail: '13:00 to 15:00, absorbs 186 MWh of solar surplus',
    tag: 'Storage',
  },
  {
    id: 'bid-evening-peak',
    title: 'Bid 60 MW into the evening peak',
    detail: '18:00 to 20:00 at an expected €118/MWh',
    tag: 'Market',
  },
  {
    id: 'precool-harbor',
    title: 'Pre-cool the Harbor district',
    detail: '16:30 to 17:30, trims 42 MW off the peak',
    tag: 'Demand',
  },
]

export const dashboardRanges: DashboardRange[] = [
  {
    id: 'today',
    label: 'Today',
    chartTitle: 'Load forecast vs. actual',
    chartSubtitle: 'Hourly load in MW, actuals up to 14:00',
    caption: 'Peak 18:00, 2,914 MW',
    tickEvery: 3,
    nowIndex: 14,
    yTicks: [1500, 2000, 2500, 3000, 3500],
    points: todayPoints,
    kpis: [
      {
        id: 'peak',
        label: 'Forecasted peak load',
        value: '2,914',
        unit: 'MW',
        delta: '+4.2% vs last Friday',
        tone: 'neutral',
        direction: 'up',
        trend: chartHours.slice(0, 8).concat([2600, 2810, 2914]),
      },
      {
        id: 'curtailment',
        label: 'Curtailment risk',
        value: '12',
        unit: '%',
        delta: '3 pts lower than yesterday',
        tone: 'good',
        direction: 'down',
        trend: [18, 17, 16, 16, 15, 13, 12],
      },
      {
        id: 'storage',
        label: 'Available storage',
        value: '680',
        unit: 'MWh',
        delta: '74% of 920 MWh capacity',
        tone: 'neutral',
        meter: { value: 680, max: 920 },
      },
      {
        id: 'price',
        label: 'Average spot price',
        value: '€84.20',
        unit: '/MWh',
        delta: '€6.10 higher than yesterday',
        tone: 'good',
        direction: 'up',
        trend: [51, 58, 62, 60, 71, 76, 82, 84.2],
      },
    ],
    mix,
    actions,
  },
  {
    id: 'tomorrow',
    label: 'Tomorrow',
    chartTitle: 'Load forecast vs. actual',
    chartSubtitle: 'Hourly load forecast in MW',
    caption: 'Peak 19:00, 3,020 MW',
    tickEvery: 3,
    nowIndex: null,
    yTicks: [1500, 2000, 2500, 3000, 3500],
    points: tomorrowPoints,
    kpis: [
      {
        id: 'peak',
        label: 'Forecasted peak load',
        value: '3,020',
        unit: 'MW',
        delta: '+3.6% vs today, at 19:00',
        tone: 'neutral',
        direction: 'up',
        trend: [1900, 1800, 1720, 1680, 2060, 2310, 2470, 2660, 2880, 3020],
      },
      {
        id: 'curtailment',
        label: 'Curtailment risk',
        value: '9',
        unit: '%',
        delta: '3 pts lower than today',
        tone: 'good',
        direction: 'down',
        trend: [12, 12, 11, 11, 10, 9, 9],
      },
      {
        id: 'storage',
        label: 'Available storage',
        value: '742',
        unit: 'MWh',
        delta: '81% of 920 MWh capacity',
        tone: 'neutral',
        meter: { value: 742, max: 920 },
      },
      {
        id: 'price',
        label: 'Average spot price',
        value: '€91.40',
        unit: '/MWh',
        delta: '€7.20 higher than today',
        tone: 'good',
        direction: 'up',
        trend: [62, 68, 71, 75, 80, 84, 88, 91.4],
      },
    ],
    mix,
    actions,
  },
  {
    id: 'week',
    label: 'Next 7 days',
    chartTitle: 'Load forecast vs. actual',
    chartSubtitle: 'Daily peak load forecast in MW',
    caption: 'Peak Tue, 3,080 MW',
    tickEvery: 1,
    nowIndex: null,
    yTicks: [2400, 2600, 2800, 3000, 3200, 3400],
    points: weekPoints,
    kpis: [
      {
        id: 'peak',
        label: 'Highest peak this week',
        value: '3,080',
        unit: 'MW',
        delta: 'Tuesday evening',
        tone: 'neutral',
        direction: 'up',
        trend: weekForecast,
      },
      {
        id: 'curtailment',
        label: 'Curtailment risk',
        value: '14',
        unit: '%',
        delta: '2 pts higher than last week',
        tone: 'bad',
        direction: 'up',
        trend: [8, 9, 11, 10, 12, 13, 14],
      },
      {
        id: 'storage',
        label: 'Average available storage',
        value: '615',
        unit: 'MWh',
        delta: '67% of 920 MWh capacity',
        tone: 'neutral',
        meter: { value: 615, max: 920 },
      },
      {
        id: 'price',
        label: 'Average spot price',
        value: '€79.80',
        unit: '/MWh',
        delta: '€4.40 lower than last week',
        tone: 'good',
        direction: 'down',
        trend: [88, 86, 84, 83, 82, 81, 79.8],
      },
    ],
    mix,
    actions,
  },
]
