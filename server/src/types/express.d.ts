export {};

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        role: string;
        name: string;
        email?: string;
        organizationId: string | null;
        departmentId?: number | null;
        rank: number;
      };
    }
  }
}
