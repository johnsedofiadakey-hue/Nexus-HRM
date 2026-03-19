"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const context_1 = require("../utils/context");
const prismaClient = new client_1.PrismaClient();
const prisma = prismaClient.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const context = context_1.tenantContext.getStore();
                const organizationId = context?.organizationId;
                // Skip isolation for DEV role or if no organizationId in context (e.g., public routes/internal scripts)
                const isMultiTenantOperation = ['findFirst', 'findMany', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation);
                const anyArgs = args;
                if (organizationId && isMultiTenantOperation && organizationId !== 'DEV_MASTER') {
                    anyArgs.where = { ...anyArgs.where, organizationId };
                }
                // Auto-inject organizationId on create
                if (organizationId && (operation === 'create' || operation === 'createMany') && organizationId !== 'DEV_MASTER') {
                    if (operation === 'create') {
                        anyArgs.data = { ...anyArgs.data, organizationId };
                    }
                    else if (operation === 'createMany') {
                        if (Array.isArray(anyArgs.data)) {
                            anyArgs.data = anyArgs.data.map((d) => ({ ...d, organizationId }));
                        }
                    }
                }
                return query(anyArgs);
            },
        },
    },
});
exports.default = prisma;
