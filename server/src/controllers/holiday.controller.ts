import { Request, Response } from 'express';
import prisma from '../prisma/client';

// Default Guinea public holidays 2026
const GUINEA_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: "Lailat al-Qadr", date: '2026-03-17' },
  { name: "Eid al-Fitr (Korité)", date: '2026-03-20' },
  { name: "Easter Monday", date: '2026-04-06' },
  { name: "Labour Day", date: '2026-05-01' },
  { name: "Africa Day", date: '2026-05-25' },
  { name: "Eid al-Adha (Tabaski)", date: '2026-05-27' },
  { name: "Eid al-Adha Day 2", date: '2026-05-28' },
  { name: "Assumption of Mary", date: '2026-08-15' },
  { name: "The Prophet's Birthday", date: '2026-08-25' },
  { name: "Independence Day", date: '2026-10-02' },
  { name: "All Saints' Day", date: '2026-11-01' },
  { name: "Christmas Day", date: '2026-12-25' },
];

export const getHolidays = async (req: Request, res: Response) => {
  try {  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const holidays = await prisma.publicHoliday.findMany({
    where: { OR: [{ year }, { isRecurring: true }] },
    orderBy: { date: 'asc' }
  });
  res.json(holidays);
  } catch (err: any) {
    console.error('[holiday.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const addHoliday = async (req: Request, res: Response) => {
  try {
    const holiday = await prisma.publicHoliday.create({
      data: { ...req.body, date: new Date(req.body.date) }
    });
    res.status(201).json(holiday);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const deleteHoliday = async (req: Request, res: Response) => {
  try {  await prisma.publicHoliday.delete({ where: { id: req.params.id } });
  res.status(204).send();
  } catch (err: any) {
    console.error('[holiday.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const seedGuineaHolidays = async (req: Request, res: Response) => {
  try {
    const created = await prisma.publicHoliday.createMany({
      data: GUINEA_HOLIDAYS_2026.map(h => ({
        name: h.name,
        date: new Date(h.date),
        country: 'GN',
        isRecurring: false,
        year: 2026
      }))
    });
    res.json({ created: created.count, message: 'Guinea 2026 public holidays seeded' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};
