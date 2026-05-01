import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export const createWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, is_public = false } = req.body;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    if (!name) return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Name is required' } });

    const wishlist = await prisma.wishlist.create({
      data: {
        user_id: userId,
        name,
        is_public
      }
    });

    return res.status(201).json({ success: true, data: { wishlist } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getMyWishlists = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlists = await prisma.wishlist.findMany({
      where: { user_id: userId },
      include: {
        _count: { select: { members: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ success: true, data: { wishlists } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const updateWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, is_public } = req.body;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlist = await prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (wishlist.user_id !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });

    const updated = await prisma.wishlist.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(is_public !== undefined && { is_public })
      }
    });

    return res.status(200).json({ success: true, data: { wishlist: updated } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const deleteWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlist = await prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (wishlist.user_id !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });

    await prisma.wishlist.delete({ where: { id } });

    return res.status(200).json({ success: true, data: { message: 'Deleted successfully' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const addMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, targetId } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlist = await prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (wishlist.user_id !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });

    await prisma.wishlistMember.create({
      data: {
        wishlist_id: id,
        target_id: targetId
      }
    });

    return res.status(200).json({ success: true, data: { message: 'Added to wishlist' } });
  } catch (error: any) {
    if (error.code === 'P2002') { // Prisma unique constraint
      return res.status(400).json({ success: false, error: { code: 'DUPLICATE', message: 'Already in wishlist' } });
    }
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const removeMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id, targetId } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlist = await prisma.wishlist.findUnique({ where: { id } });
    if (!wishlist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (wishlist.user_id !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });

    await prisma.wishlistMember.delete({
      where: {
        wishlist_id_target_id: {
          wishlist_id: id,
          target_id: targetId
        }
      }
    });

    return res.status(200).json({ success: true, data: { message: 'Removed from wishlist' } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};

export const getWishlist = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, error: { code: 'ACCESS_DENIED' } });

    const wishlist = await prisma.wishlist.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            target: {
              select: {
                id: true,
                first_name: true,
                job_title: true,
                photos: true
              }
            }
          }
        }
      }
    });

    if (!wishlist) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });

    // Check privacy
    if (wishlist.user_id !== userId && !wishlist.is_public) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This wishlist is private' } });
    }

    return res.status(200).json({ success: true, data: { wishlist } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
};
