const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const user = await prisma.user.findFirst();
    if (!user) return console.log("No user");

    // Simulate frontend payload
    const payload = {
        ...user,
        departmentObj: { name: 'Engineering' },
        supervisor: null,
        riskScore: 30,
        bankName: 'Test Bank'
    };

    const { passwordHash, department, departmentId, ...safeData } = payload;

    if (safeData.dob) safeData.dob = new Date(safeData.dob);
    if (safeData.joinDate) safeData.joinDate = new Date(safeData.joinDate);
    if (safeData.salary === '') safeData.salary = null;

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: safeData
        });
        console.log("Success");
    } catch (err) {
        console.error("FAIL:", err.message);
    }
}
run();
