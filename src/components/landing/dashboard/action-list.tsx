import type { FC, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { ActionItem, ActionTag } from '@/constants/dashboard'

import { BatteryCharging, ChartLine, Factory, Users, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const tagIcons: Record<ActionTag, LucideIcon> = {
  Storage: BatteryCharging,
  Market: ChartLine,
  Demand: Users,
  Assets: Factory,
}

interface ActionListProps {
  actions: ActionItem[]
  scheduled: Record<string, boolean>
  onToggle: (id: string) => void
}

const ActionList: FC<ActionListProps> = ({ actions, scheduled, onToggle }): ReactNode => {
  const scheduledCount = actions.filter((action) => scheduled[action.id]).length

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-medium text-foreground">Recommended actions</h4>

        <p className="text-xs text-muted-foreground" aria-live="polite">
          {scheduledCount} of {actions.length} scheduled
        </p>
      </div>

      <ul className="mt-3 space-y-2">
        {actions.map((action) => {
          const isScheduled = Boolean(scheduled[action.id])
          const Icon = tagIcons[action.tag]

          return (
            <li key={action.id} className="flex items-center gap-3 rounded-xl bg-background p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-primary ring-1 ring-black/5">
                <Icon className="size-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-snug text-foreground">{action.title}</p>

                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{action.detail}</p>
              </div>

              <button
                type="button"
                onClick={() => onToggle(action.id)}
                aria-label={`${isScheduled ? 'Scheduled' : 'Schedule'}: ${action.title}`}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isScheduled
                    ? 'bg-accent text-accent-foreground hover:bg-leaf-soft'
                    : 'bg-foreground text-white hover:bg-forest',
                )}
              >
                {isScheduled && <Check className="size-3.5" aria-hidden="true" />}
                {isScheduled ? 'Scheduled' : 'Schedule'}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ActionList
