import { Request, Response } from 'express'
import { z } from 'zod'
import type { AuthRequest } from '../../middleware/auth'
import { visitsService } from './visits.service'
import {
  checklistSchema,
  createVisitSchema,
  listVisitsQuerySchema,
  toggleChecklistSchema,
  updateVisitSchema,
  visitIdParam,
  visitNoteSchema,
} from './visits.validator'

const idParam = (nilai: string): string => visitIdParam(nilai)

const idItemParam = (nilai: string): string =>
  z.string().uuid('ID butir periksa tidak valid').parse(nilai)

export const visitsController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listVisitsQuerySchema.parse(req.query)
    const result = await visitsService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar kunjungan',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await visitsService.detail(user, idParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail kunjungan',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createVisitSchema.parse(req.body)
    const data = await visitsService.create(user, input)

    res.status(201).json({
      success: true,
      message: 'Kunjungan terjadwal',
      data,
    })
  },

  async update(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = updateVisitSchema.parse(req.body)
    const data = await visitsService.update(user, idParam(req.params.id), input)

    res.json({
      success: true,
      message: 'Kunjungan diperbarui',
      data,
    })
  },

  async remove(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await visitsService.remove(user, idParam(req.params.id))

    res.json({
      success: true,
      message: 'Jadwal kunjungan dihapus',
      data,
    })
  },

  async addChecklist(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = checklistSchema.parse(req.body)
    const data = await visitsService.addChecklist(user, idParam(req.params.id), input)

    res.status(201).json({
      success: true,
      message: 'Butir periksa tersimpan',
      data,
    })
  },

  async toggleChecklist(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = toggleChecklistSchema.parse(req.body)
    const data = await visitsService.toggleChecklist(
      user,
      idParam(req.params.id),
      idItemParam(req.params.itemId),
      input.checked,
      input.catatan,
    )

    res.json({
      success: true,
      message: 'Butir periksa diperbarui',
      data,
    })
  },

  async addNote(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = visitNoteSchema.parse(req.body)
    const data = await visitsService.addNote(user, idParam(req.params.id), input)

    res.status(201).json({
      success: true,
      message: 'Catatan tersimpan',
      data,
    })
  },
}
