import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { toggleFavorite, getFavorites } from '../controllers/favorites.controller';

const router = Router();

router.use(authenticate);

router.post('/:targetId', toggleFavorite);
router.get('/', getFavorites);

export default router;
