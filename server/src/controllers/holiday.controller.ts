import { Request, Response } from 'express';
import prisma from '../prisma/client';

// Default Ghana public holidays
const GHANA_HOLIDAYS_2025 = [
  { name: "New Year's Day", date: '2025-01-01' },
  { name: "Constitution Day", date: '2025-01-07' },
  { name: "Independence Day", date: '2025-03-06' },
  { name: "Good Friday", date: '2025-04-18' },
  { name: "Holy Saturday", date: '2025-04-19' },
  { name: "Easter Monday", date: '2025-04-21' },
  { name: "Workers' Day", date: '2025-05-01' },
  { name: "Africa Day", date: '2025-05-25' },
  { name: "Founders' Day", date: '2025-08-04' },
  { name: "Kwame Nkrumah Memorial Day", date: '2025-09-21' },
  { name: "Farmer's Day", date: '2025-12-05' },
  { name: "Christmas Day", date: '2025-12-25' },
  { name: "Boxing Day", date: '2025-12-26' },
  { name: "Eid al-Fitr", date: '2025-03-31' },
  { name: "Eid al-Adha", date: '2025-06-07' },
];

export const getHolidays = async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const holidays = await prisma.publicHoliday.findMany({
    where: { OR: [{ year }, { isRecurring: true }] },
    orderBy: { date: 'asc' }
  });
  res.json(holidays);
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
  await prisma.publicHoliday.delete({ where: { id: req.params.id } });
  res.status(204).send();
};

export const seedGhanaHolidays = async (req: Request, res: Response) => {
  try {
    const created = await prisma.publicHoliday.createMany({
      data: GHANA_HOLIDAYS_2025.map(h => ({
        name: h.name,
        date: new Date(h.date),
        country: 'GH',
        isRecurring: false,
        year: 2025
      }))
    });
    res.json({ created: created.count, message: 'Ghana 2025 public holidays seeded' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};
