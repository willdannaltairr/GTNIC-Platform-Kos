import { Prisma } from '@prisma/client'
import { HttpError } from '../../lib/httpError'
import { prisma } from '../../lib/prisma'
import type { ListUsersQuery, UpdateProfileInput } from './users.validator'

const PROFILE_SELECT = {
  id: true,
  full_name: true,
  email: true,
  phone_number: true,
  avatar_url: true,
  role: true,
  account_status: true,
  email_verified_at: true,
  last_login_at: true,
  created_at: true,
} satisfies Prisma.usersSelect

export const usersService = {
  async getProfile(userId: string) {
    const user = await prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: PROFILE_SELECT,
    })

    if (!user) {
      throw new HttpError(404, 'Pengguna tidak ditemukan')
    }

    return user
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Pastikan akun ada dan belum dihapus sebelum mengubah data.
    const existing = await prisma.users.findFirst({
      where: { id: userId, deleted_at: null },
      select: { id: true },
    })

    if (!existing) {
      throw new HttpError(404, 'Pengguna tidak ditemukan')
    }

    return prisma.users.update({
      where: { id: userId },
      data: {
        ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
        ...(data.phoneNumber !== undefined ? { phone_number: data.phoneNumber } : {}),
        ...(data.avatarUrl !== undefined ? { avatar_url: data.avatarUrl } : {}),
      },
      select: PROFILE_SELECT,
    })
  },

  async listUsers(params: ListUsersQuery) {
    const where: Prisma.usersWhereInput = { deleted_at: null }

    if (params.role) {
      where.role = params.role
    }

    if (params.search) {
      where.OR = [
        { full_name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const [total, users] = await prisma.$transaction([
      prisma.users.count({ where }),
      prisma.users.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: PROFILE_SELECT,
      }),
    ])

    return {
      users,
      meta: {
        page: params.page,
        limit: params.limit,
        total,
        totalPages: Math.ceil(total / params.limit),
      },
    }
  },
}
