import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import { xssClean } from './middleware/xss.middleware';
import { setupSwagger } from './config/swagger';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Security Hardening
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xssClean); // Strip HTML tags from req body/query/params

// Setup Swagger UI
setupSwagger(app);

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test'
});
app.use(globalLimiter);

// Strict rate limiters for specific routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth requests' } },
  skip: () => process.env.NODE_ENV === 'test'
});

const swipeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'You are swiping too fast!' } },
  skip: () => process.env.NODE_ENV === 'test'
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import discoveryRoutes from './routes/discovery.routes';
import swipeRoutes from './routes/swipe.routes';
import mediaRoutes from './routes/media.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';
import analyticsRoutes from './routes/analytics.routes';
import favoritesRoutes from './routes/favorites.routes';
import wishlistRoutes from './routes/wishlist.routes';
import reportRoutes from './routes/report.routes';
import appealRoutes from './routes/appeal.routes';
import subscriptionRoutes from './routes/subscription.routes';

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/swipes', swipeLimiter, swipeRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/wishlists', wishlistRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/appeals', appealRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

export default app;
