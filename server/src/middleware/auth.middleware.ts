import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_nexus_key_2026";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // 1. Get the token from the header (Bearer xy7z...)
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(' ')[1]; // Remove "Bearer " word

  try {
    // 2. Verify the signature
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach user info to the request object so controllers can use it
    // @ts-ignore
    req.user = decoded;

    next(); // Pass to the next function (the controller)
  } catch (error) {
    return res.status(401).json({ error: "Invalid Token" });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const userRole = req.user?.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: "Access Denied: Insufficient Permissions" });
    }

    next();
  };
};