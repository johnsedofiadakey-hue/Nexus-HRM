import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../utils/context';

const prismaClient = new PrismaClient();

const prisma = prismaClient.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const context = tenantContext.getStore();
        const organizationId = context?.organizationId;

        // Skip isolation for DEV role or if no organizationId in context (e.g., public routes/internal scripts)
        const isMultiTenantOperation = ['findFirst', 'findMany', 'findUnique', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation);

        const anyArgs = args as any;

        if (organizationId && isMultiTenantOperation && organizationId !== 'DEV_MASTER') {
          anyArgs.where = { ...anyArgs.where, organizationId };
        }

        // Auto-inject organizationId on create
        if (organizationId && (operation === 'create' || operation === 'createMany') && organizationId !== 'DEV_MASTER') {
          if (operation === 'create') {
            anyArgs.data = { ...anyArgs.data, organizationId };
          } else if (operation === 'createMany') {
            if (Array.isArray(anyArgs.data)) {
              anyArgs.data = anyArgs.data.map((d: any) => ({ ...d, organizationId }));
            }
          }
        }

        return query(anyArgs);
      },
    },
  },
});

export default prisma;
