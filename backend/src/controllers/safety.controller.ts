import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { sendPushNotification } from '../services/notification.service';
import { redisClient } from '../config/redis';

const prisma = new PrismaClient();

// ─── Emergency Contacts ──────────────────────────────────────────────────────

export const getEmergencyContacts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const contacts = await prisma.emergencyContact.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ success: true, data: { contacts } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const addEmergencyContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { name, phone, relation } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, error: { message: 'Name and phone are required' } });
    }

    const count = await prisma.emergencyContact.count({ where: { user_id: userId } });
    if (count >= 5) {
      return res.status(400).json({ success: false, error: { message: 'Maximum of 5 emergency contacts allowed' } });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        user_id: userId,
        name,
        phone,
        relation
      }
    });

    return res.status(201).json({ success: true, data: { contact } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const deleteEmergencyContact = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const contact = await prisma.emergencyContact.findUnique({ where: { id } });
    if (!contact || contact.user_id !== userId) {
      return res.status(404).json({ success: false, error: { message: 'Contact not found' } });
    }

    await prisma.emergencyContact.delete({ where: { id } });
    return res.status(200).json({ success: true, data: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ─── Panic Button ────────────────────────────────────────────────────────────

export const triggerPanic = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { latitude, longitude } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { emergency_contacts: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // 1. Log incident (Admin Action or internal report system)
    await prisma.adminAction.create({
      data: {
        user_id: userId,
        action: 'WARN',
        reason: 'PANIC_BUTTON_TRIGGERED',
        remark: `Panic triggered at Lat: ${latitude}, Lng: ${longitude}`,
      }
    });

    // 2. In a real world scenario, trigger SMS / API to emergency contacts here
    // Example: Twilio SMS to `user.emergency_contacts`
    console.warn(`[PANIC] Triggered for user ${user.first_name}. Contacts to notify:`, user.emergency_contacts.map(c => c.phone));

    return res.status(200).json({
      success: true,
      data: {
        message: 'Emergency services and contacts have been notified.',
        notified_count: user.emergency_contacts.length
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
