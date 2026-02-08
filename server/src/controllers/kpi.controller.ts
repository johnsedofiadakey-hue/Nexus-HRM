import { Request, Response } from 'express';
import prisma from '../prisma/client';

// ==========================================
// 1. CREATE ASSIGNMENT (Supervisor Action)
// ==========================================
export const createKpiSheet = async (req: Request, res: Response) => {
  try {
    // We get these details from the Frontend Form
    const { title, employeeId, month, year, items } = req.body;

    // We get the Reviewer ID from the Token (The logged-in Supervisor)
    // @ts-ignore - 'user' is attached by the Auth Middleware
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Transaction: Create the Sheet AND all the Items at once
    const newSheet = await prisma.kpiSheet.create({
      data: {
        title,
        month: parseInt(month),
        year: parseInt(year),
        employeeId,
        reviewerId,
        status: 'ACTIVE', // Ready for the employee to see
        items: {
          create: items.map((item: any) => ({
            category: item.category,
            description: item.description,
            weight: parseFloat(item.weight),
            targetValue: parseFloat(item.target),
            actualValue: 0, // Starts at 0
            score: 0
          }))
        }
      },
      include: { items: true } // Return the created items so we can see them
    });

    console.log(`✅ Goals assigned to Employee ${employeeId}`);
    return res.status(201).json(newSheet);

  } catch (error) {
    console.error("Error creating sheet:", error);
    return res.status(500).json({ error: "Failed to assign goals" });
  }
};

// ==========================================
// 2. GET MY SHEETS (Employee View)
// ==========================================
export const getMySheets = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;

    const sheets = await prisma.kpiSheet.findMany({
      where: { employeeId: userId },
      include: {
        items: true,
        reviewer: { select: { fullName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(sheets);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
};

// ==========================================
// 3. GET SINGLE SHEET DETAILS
// ==========================================
export const getSheetById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sheet = await prisma.kpiSheet.findUnique({
      where: { id },
      include: { items: true, employee: true }
    });

    if (!sheet) return res.status(404).json({ error: "Sheet not found" });

    return res.status(200).json(sheet);
  } catch (error) {
    return res.status(500).json({ error: "Fetch failed" });
  }
};

// ==========================================
// 4. UPDATE PROGRESS (Employee Input)
// ==========================================
export const updateKpiProgress = async (req: Request, res: Response) => {
  try {
    // submit = true means "I am done, please review"
    const { sheetId, items, submit } = req.body;

    // Step A: Security Check
    const sheet = await prisma.kpiSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) return res.status(404).json({ error: "Sheet not found" });

    // Allow updates only if ACTIVE or REJECTED(active loop). 
    // If PENDING or LOCKED, block updates.
    if (sheet.status === 'LOCKED' || sheet.status === 'PENDING_APPROVAL') {
      return res.status(403).json({ error: "Sheet is locked for review or approved." });
    }

    let newTotalScore = 0;

    // Step B: Loop through updates
    if (items && items.length > 0) {
      for (const update of items) {
        const item = await prisma.kpiItem.findUnique({ where: { id: update.id } });

        if (item) {
          const actual = parseFloat(update.actualValue);
          let calculatedScore = (actual / item.targetValue) * item.weight;

          const maxScore = item.weight * 1.2;
          if (calculatedScore > maxScore) calculatedScore = maxScore;

          await prisma.kpiItem.update({
            where: { id: update.id },
            data: {
              actualValue: actual,
              score: calculatedScore,
              lastEntryDate: new Date()
            }
          });

          newTotalScore += calculatedScore;
        }
      }
    } else {
      // If no items sent, keep old score (for just status update)
      newTotalScore = sheet.totalScore || 0;
    }

    // Step C: Update Sheet Status
    // If user clicked "Submit", change status to PENDING_APPROVAL
    const newStatus = submit ? 'PENDING_APPROVAL' : 'ACTIVE';

    await prisma.kpiSheet.update({
      where: { id: sheetId },
      data: {
        totalScore: newTotalScore,
        status: newStatus
      }
    });

    return res.json({ success: true, totalScore: newTotalScore, status: newStatus });

  } catch (error) {
    console.error("Update error:", error);
    return res.status(500).json({ error: "Failed to update progress" });
  }
};

// ==========================================
// 5. REVIEW SHEET (Manager Action)
// ==========================================
export const reviewKpiSheet = async (req: Request, res: Response) => {
  try {
    const { sheetId, decision, feedback } = req.body; // decision: 'APPROVE' | 'REJECT'
    // @ts-ignore
    const managerId = req.user.id;

    const sheet = await prisma.kpiSheet.findUnique({ where: { id: sheetId } });
    if (!sheet) return res.status(404).json({ error: "Sheet not found" });

    if (sheet.reviewerId !== managerId) {
      return res.status(403).json({ error: "Only the assigned reviewer can approve this." });
    }

    let newStatus = sheet.status;
    let isLocked = sheet.isLocked;

    if (decision === 'APPROVE') {
      newStatus = 'LOCKED'; // Done.
      isLocked = true;
    } else if (decision === 'REJECT') {
      newStatus = 'ACTIVE'; // Send back to employee
      isLocked = false;
    }

    await prisma.kpiSheet.update({
      where: { id: sheetId },
      data: {
        status: newStatus as any, // Cast if enum mismatch in types
        isLocked: isLocked,
        lockedAt: isLocked ? new Date() : null
      }
    });

    res.json({ success: true, status: newStatus });

  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};