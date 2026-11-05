import { Request, Response } from 'express'
import { propertiesService } from './properties.service'
import { listPropertiesQuerySchema } from './properties.validator'

export const propertiesController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = listPropertiesQuerySchema.parse(req.query)
    const result = await propertiesService.listPublic(query)

    res.json({
      success: true,
      message: 'Daftar properti',
      data: result.items,
      meta: result.meta,
    })
  },

  async detail(req: Request, res: Response): Promise<void> {
    const property = await propertiesService.detailPublic(req.params.slug)

    res.json({
      success: true,
      message: 'Detail properti',
      data: property,
    })
  },
}
