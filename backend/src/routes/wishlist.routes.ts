import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { createWishlist, getMyWishlists, updateWishlist, deleteWishlist, addMember, removeMember, getWishlist } from '../controllers/wishlist.controller';

const router = Router();

router.use(authenticate);

router.post('/', createWishlist);
router.get('/', getMyWishlists);
router.get('/:id', getWishlist);
router.put('/:id', updateWishlist);
router.delete('/:id', deleteWishlist);
router.post('/:id/members/:targetId', addMember);
router.delete('/:id/members/:targetId', removeMember);

export default router;
