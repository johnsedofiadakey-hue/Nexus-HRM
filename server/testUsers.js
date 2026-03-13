const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                departmentId: true,
                departmentObj: { select: { name: true } },
                jobTitle: true,
                employeeCode: true,
                status: true,
                avatarUrl: true
            }
        });
        console.log("Users fetched successfully:", users.length);
    } catch (err) {
        console.error("ERROR 1:", err);
    }

    try {
        const deps = await prisma.department.findMany({
            include: { employees: { select: { id: true } } }
        });
        console.log("Deps fetched successfully:", deps.length);
    } catch (err) {
        console.error("ERROR 2:", err);
    }

    try {
        const supervisors = await prisma.user.findMany({
            where: { role: { in: ['MD', 'SUPERVISOR', 'HR_ADMIN'] }, status: 'ACTIVE' },
            select: { id: true, fullName: true, role: true, jobTitle: true, departmentObj: { select: { name: true } } },
            orderBy: { fullName: 'asc' }
        });
        console.log("Supervisors fetched successfully:", supervisors.length);
    } catch (err) {
        console.error("ERROR 3:", err);
    }
}
run();
