import { Request, Response } from 'express';
import prisma from '../prisma/client';
import * as userService from '../services/user.service';
import * as riskService from '../services/risk.service';

// Helper to filter sensitive fields based on role
const getSafeUser = (user: any, requestorRole: string) => {
  const { passwordHash, ...safeUser } = user;

  // STRICT SALARY PRIVACY: Only MD can see salary/currency
  if (requestorRole !== 'MD') {
    delete safeUser.salary;
    delete safeUser.currency;
  }
  return safeUser;
};

const withDepartmentName = (user: any) => {
  const { departmentObj, ...rest } = user || {};
  return { ...rest, department: departmentObj?.name };
};

export const getUserRiskProfile = async (req: Request, res: Response) => {
  try {
    const profile = await riskService.getRiskProfile(req.params.id);
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyTeam = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const requestorId = req.user?.id as string | undefined;
    // @ts-ignore
    const requestorRole = req.user?.role as string | undefined;
    const requestedSupervisorId = req.query.supervisorId as string | undefined;

    let supervisorId = requestorId;

    if (requestorRole === 'HR_ADMIN' || requestorRole === 'MD') {
      supervisorId = requestedSupervisorId || requestorId;
    }

    if (!supervisorId) {
      return res.status(400).json({ error: "Supervisor ID required" });
    }

    const team = await prisma.user.findMany({
      where: { supervisorId },
      include: {
        kpiSheets: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get only their latest score
          select: { id: true, totalScore: true, status: true, isLocked: true }
        }
      }
    });

    // Format the data for the frontend
    const dashboardData = team.map(emp => ({
      id: emp.id,
      name: emp.fullName,
      role: emp.jobTitle,
      avatar: emp.avatarUrl,
      kpiSheets: emp.kpiSheets.map(sheet => ({
        id: sheet.id,
        totalScore: sheet.totalScore,
        status: sheet.status
      })),
      lastSheetId: emp.kpiSheets[0]?.id,
      lastScore: emp.kpiSheets[0]?.totalScore || 0,
      status: (emp.kpiSheets[0]?.totalScore || 0) > 80 ? 'On Track' : 'Needs Attention'
    }));

    return res.status(200).json(dashboardData);

  } catch (error) {
    console.error("Team Fetch Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// --- Employee Master CRUD ---

export const createEmployee = async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);
    // Remove hash from response
    const { passwordHash, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getEmployee = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // @ts-ignore
    const safeUser = getSafeUser(user, req.user?.role);
    res.json(withDepartmentName(safeUser));
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const filters = {
      department: req.query.department as string,
      role: req.query.role as any,
      status: req.query.status as any
    };
    // Clean undefined filters
    Object.keys(filters).forEach(key => (filters as any)[key] === undefined && delete (filters as any)[key]);

    const users = await userService.getAllUsers(filters);

    // @ts-ignore
    const userRole = req.user?.role;

    const safeUsers = users.map(u => withDepartmentName(getSafeUser(u, userRole)));
    res.json(safeUsers);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body; // Base64 string
    if (!image) return res.status(400).json({ message: "No image data provided" });

    // Simple Base64 save (assuming PNG/JPEG)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate filename
    const filename = `user-${req.params.id}-${Date.now()}.png`;
    const filepath = `public/uploads/${filename}`;

    // Save to disk
    const fs = require('fs');

    // Ensure dir exists (redundant but safe)
    if (!fs.existsSync('public/uploads')) fs.mkdirSync('public/uploads', { recursive: true });

    fs.writeFileSync(filepath, buffer);

    // Update User Profile URL
    const publicUrl = `http://localhost:5000/uploads/${filename}`;
    await userService.updateUser(req.params.id, { avatarUrl: publicUrl } as any);

    res.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Image upload failed" });
  }
};