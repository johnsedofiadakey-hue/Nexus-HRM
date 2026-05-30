export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        name: string;
        organizationId: string | null;
        departmentId?: string | null;
        rank: number;
      };
    }
  }
}
