import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// ─── Stories ─────────────────────────────────────────────────────────────────

export const getActiveStories = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    
    // Get users that I have matched with or recently swiped on, or just anyone for now (global discovery for testing)
    // To keep it simple, we fetch all active stories not expired.
    const now = new Date();
    
    const stories = await prisma.story.findMany({
      where: {
        expires_at: { gt: now }
      },
      include: {
        user: { select: { id: true, first_name: true, photos: true } },
        views: { select: { viewer_id: true } },
        reactions: { select: { reactor_id: true, reaction: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    return res.status(200).json({ success: true, data: { stories } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createStory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { media_url, type } = req.body; // type = 'IMAGE' | 'VIDEO'

    if (!media_url) {
      return res.status(400).json({ success: false, error: { message: 'Media URL is required' } });
    }

    // Expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await prisma.story.create({
      data: {
        user_id: userId,
        media_url,
        type: type || 'IMAGE',
        expires_at: expiresAt
      }
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        actor_id: userId,
        type: 'NEW_STORY'
      }
    });

    return res.status(201).json({ success: true, data: { story } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const viewStory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { storyId } = req.params;

    const existing = await prisma.storyView.findUnique({
      where: { story_id_viewer_id: { story_id: storyId, viewer_id: userId } }
    });

    if (!existing) {
      await prisma.storyView.create({
        data: {
          story_id: storyId,
          viewer_id: userId
        }
      });
    }

    return res.status(200).json({ success: true, data: { viewed: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const reactToStory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { storyId } = req.params;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ success: false, error: { message: 'Reaction is required' } });
    }

    const storyReaction = await prisma.storyReaction.create({
      data: {
        story_id: storyId,
        reactor_id: userId,
        reaction
      }
    });

    // Fetch the story owner to log activity target
    const story = await prisma.story.findUnique({ where: { id: storyId } });
    if (story) {
      await prisma.activity.create({
        data: {
          actor_id: userId,
          target_id: story.user_id,
          type: 'STORY_REACTION'
        }
      });
    }

    return res.status(201).json({ success: true, data: { reaction: storyReaction } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ─── Prompts ─────────────────────────────────────────────────────────────────

export const getPrompts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId || req.user?.id;
    const prompts = await prisma.profilePrompt.findMany({
      where: { user_id: userId as string },
      orderBy: { created_at: 'asc' }
    });
    return res.status(200).json({ success: true, data: { prompts } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createPrompt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { question, answer } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ success: false, error: { message: 'Question and answer are required' } });
    }

    const count = await prisma.profilePrompt.count({ where: { user_id: userId } });
    if (count >= 3) {
      return res.status(400).json({ success: false, error: { message: 'Maximum of 3 prompts allowed' } });
    }

    const prompt = await prisma.profilePrompt.create({
      data: { user_id: userId, question, answer }
    });

    await prisma.activity.create({
      data: { actor_id: userId, type: 'UPDATED_PROMPTS' }
    });

    return res.status(201).json({ success: true, data: { prompt } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const deletePrompt = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { promptId } = req.params;

    const prompt = await prisma.profilePrompt.findUnique({ where: { id: promptId } });
    if (!prompt || prompt.user_id !== userId) {
      return res.status(404).json({ success: false, error: { message: 'Prompt not found' } });
    }

    await prisma.profilePrompt.delete({ where: { id: promptId } });
    return res.status(200).json({ success: true, data: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// ─── Activity Feed ───────────────────────────────────────────────────────────

export const getActivityFeed = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id!;

    // Get activities where user is the target, OR general activities from people the user matched with
    // For simplicity, we just fetch global activities for now
    const activities = await prisma.activity.findMany({
      include: {
        actor: { select: { id: true, first_name: true, photos: true } },
        target: { select: { id: true, first_name: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });

    return res.status(200).json({ success: true, data: { activities } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};
