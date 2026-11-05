import { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/**
 * Express 4 tidak meneruskan error dari handler async ke error handler;
 * tanpa wrapper ini promise yang reject menjadi unhandled rejection dan
 * request menggantung tanpa respons.
 */
export const asyncHandler = (handler: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
