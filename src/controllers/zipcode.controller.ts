import { Request, Response, NextFunction } from 'express';
import { ZipcodeService } from '../services/zipcode.service';

const zipcodeService = new ZipcodeService();

export async function lookupZipcode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = (req.query.code as string | undefined)?.trim();
    const country = (req.query.country as string | undefined)?.trim() ?? '';

    if (!code) {
      res.status(400).json({ error: 'Missing postal code' });
      return;
    }

    const cities = await zipcodeService.getCities(code, country);
    res.json({ cities });
  } catch (err) {
    next(err);
  }
}
