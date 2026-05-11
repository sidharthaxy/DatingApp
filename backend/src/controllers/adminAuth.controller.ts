import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Helper to generate random password
const generateRandomPassword = () => {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // Seed a Super Admin if table is completely empty (for dev setup)
    const count = await prisma.adminUser.count();
    if (count === 0 && email === 'admin@minglex.com') {
      const hash = await bcrypt.hash('admin123', 10);
      await prisma.adminUser.create({
        data: {
          email: 'admin@minglex.com',
          password_hash: hash,
          role: 'SUPER_ADMIN',
          force_password_change: true
        }
      });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.is_active) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials or inactive account' } });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: { message: 'Invalid credentials' } });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role, admin: true },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          force_password_change: admin.force_password_change
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { old_password, new_password } = req.body;
    // We assume an adminAuth middleware populates req.admin
    const adminId = (req as any).admin?.id; 

    if (!adminId) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) return res.status(404).json({ success: false, error: { message: 'Admin not found' } });

    const isValid = await bcrypt.compare(old_password, admin.password_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, error: { message: 'Incorrect old password' } });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    
    await prisma.adminUser.update({
      where: { id: adminId },
      data: { password_hash: newHash, force_password_change: false }
    });

    return res.status(200).json({ success: true, data: { message: 'Password updated successfully' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  try {
    const adminRole = (req as any).admin?.role;
    if (adminRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, error: { message: 'Only Super Admins can create new admins' } });
    }

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ success: false, error: { message: 'Email is required' } });

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, error: { message: 'Admin email already exists' } });
    }

    const randomPassword = generateRandomPassword();
    const hash = await bcrypt.hash(randomPassword, 10);

    const newAdmin = await prisma.adminUser.create({
      data: {
        email,
        password_hash: hash,
        role: role || 'ADMIN',
        force_password_change: true
      }
    });

    // In a real application, you would send this randomPassword via email here.
    return res.status(201).json({ 
      success: true, 
      data: { 
        message: 'Admin created successfully',
        admin: { id: newAdmin.id, email: newAdmin.email, role: newAdmin.role },
        temporary_password: randomPassword // Returning it here so the frontend can display it for the creator to share
      } 
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const listAdmins = async (req: Request, res: Response) => {
  try {
    const admins = await prisma.adminUser.findMany({
      select: { id: true, email: true, role: true, is_active: true, created_at: true }
    });
    return res.status(200).json({ success: true, data: { admins } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
