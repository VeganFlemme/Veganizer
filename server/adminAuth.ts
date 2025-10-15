import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  throw new Error('ADMIN_SECRET environment variable is required');
}

const JWT_SECRET = ADMIN_SECRET; // Use same secret for JWT signing

export interface AdminRequest extends Request {
  isAdmin?: boolean;
}

// Generate admin JWT token
export function generateAdminToken(): string {
  return jwt.sign(
    { 
      sub: 'admin', 
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    },
    JWT_SECRET
  );
}

// Verify admin JWT token
export function verifyAdminToken(token: string): { sub: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.sub === 'admin' && decoded.role === 'admin') {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Middleware to check if user is admin
export function adminOnly(req: AdminRequest, res: Response, next: NextFunction): void {
  try {
    const adminToken = req.cookies?.admin_token;
    
    if (!adminToken) {
      res.status(401).json({ message: 'Admin access required' });
      return;
    }

    const decoded = verifyAdminToken(adminToken);
    if (!decoded) {
      res.status(401).json({ message: 'Invalid admin token' });
      return;
    }

    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(401).json({ message: 'Admin access required' });
  }
}

// Admin login route handler
export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { secret } = req.body;

    if (!secret || secret !== ADMIN_SECRET) {
      res.status(401).json({ message: 'Invalid admin secret' });
      return;
    }

    const token = generateAdminToken();
    
    // Set httpOnly cookie
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ message: 'Admin login successful', isAdmin: true });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Admin me route handler
export async function adminMe(req: AdminRequest, res: Response): Promise<void> {
  try {
    const adminToken = req.cookies?.admin_token;
    
    if (!adminToken) {
      res.json({ isAdmin: false });
      return;
    }

    const decoded = verifyAdminToken(adminToken);
    if (!decoded) {
      res.json({ isAdmin: false });
      return;
    }

    res.json({ isAdmin: true, user: { role: 'admin', sub: 'admin' } });
  } catch (error) {
    console.error('Admin me error:', error);
    res.json({ isAdmin: false });
  }
}

// Admin logout route handler
export async function adminLogout(req: Request, res: Response): Promise<void> {
  try {
    res.clearCookie('admin_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({ message: 'Admin logout successful' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}