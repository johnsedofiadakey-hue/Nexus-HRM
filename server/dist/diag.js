"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
async function main() {
    const email = 'ernestina@nexus.com';
    const user = await prisma.user.findUnique({
        where: { email },
        include: { departmentObj: true }
    });
    if (!user) {
        console.log('User not found');
        return;
    }
    console.log('--- USER INFO ---');
    console.log({
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.departmentObj?.name,
        organizationId: user.organizationId
    });
    const targets = await prisma.target.findMany({
        where: {
            OR: [
                { assigneeId: user.id },
                { departmentId: user.departmentId, level: 'DEPARTMENT' }
            ]
        },
        include: { metrics: true }
    });
    console.log('\n--- TARGETS FOUND ---');
    targets.forEach(t => {
        console.log({
            id: t.id,
            title: t.title,
            status: t.status,
            level: t.level,
            assigneeId: t.assigneeId,
            departmentId: t.departmentId
        });
    });
    const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('\n--- RECENT NOTIFICATIONS ---');
    console.log(notifications);
}
main().catch(console.error).finally(() => prisma.$disconnect());
