import { Request, Response } from 'express'
import { placesService } from './places.service'
import { listCampusesQuerySchema, listRegionsQuerySchema } from './places.validator'

/**
 * Ubah sepasang koordinat kueri menjadi titik, bila keduanya benar-benar ada.
 *
 * Validator sudah menolak koordinat yang datang tidak berpasangan; penolong ini
 * yang menyatukan tipenya, karena kedua field di tipe hasil parse tetap
 * opsional.
 */
const titikDari = (lat?: number, lng?: number) =>
  lat !== undefined && lng !== undefined ? { lat, lng } : undefined

export const placesController = {
  async campuses(req: Request, res: Response): Promise<void> {
    const query = listCampusesQuerySchema.parse(req.query)
    const data = await placesService.listCampuses(query, titikDari(query.nearLat, query.nearLng))

    res.json({
      success: true,
      message: 'Daftar kampus',
      data,
      meta: { total: data.length, radiusKm: query.radiusKm },
    })
  },

  async regions(req: Request, res: Response): Promise<void> {
    const query = listRegionsQuerySchema.parse(req.query)
    const data = await placesService.listRegions(query)

    res.json({
      success: true,
      message: 'Daftar daerah',
      data,
      meta: { total: data.length },
    })
  },
}
