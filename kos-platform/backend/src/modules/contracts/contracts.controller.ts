import { Request, Response } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { contractsService } from './contracts.service'
import {
  contractIdParam,
  createContractSchema,
  listContractsQuerySchema,
  updateContractStatusSchema,
} from './contracts.validator'

export const contractsController = {
  async list(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const params = listContractsQuerySchema.parse(req.query)
    const result = await contractsService.list(user, params)

    res.json({
      success: true,
      message: 'Daftar kontrak',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const data = await contractsService.detail(user, contractIdParam(req.params.id))

    res.json({
      success: true,
      message: 'Detail kontrak',
      data,
    })
  },

  async create(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = createContractSchema.parse(req.body)
    const data = await contractsService.create(user, input)

    res.status(201).json({
      success: true,
      message: 'Kontrak dibuat sebagai draf',
      data,
    })
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const user = (req as AuthRequest).user!
    const input = updateContractStatusSchema.parse(req.body)
    const data = await contractsService.updateStatus(user, contractIdParam(req.params.id), input)

    res.json({
      success: true,
      message: 'Status kontrak diperbarui',
      data,
    })
  },
}
