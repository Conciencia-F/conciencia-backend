import type { Request } from 'express';

export const extractAccess = (req: Request) => {
  const h = req.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
};

export const extractRefresh = (req: Request) =>
  req.get('x-refresh-token') ?? (req.get('authorization')?.startsWith('Bearer ') ? req.get('authorization')!.slice(7) : null);

