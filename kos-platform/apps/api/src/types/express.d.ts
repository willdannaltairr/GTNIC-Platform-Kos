import type { AccountStatus, UserRole } from '@nestari/shared'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        fullName: string
        avatarUrl: string | null
        role: UserRole
        accountStatus: AccountStatus
        emailVerifiedAt: Date | null
      }
      sessionId?: string
      requestId?: string
    }
  }
}

export {}
