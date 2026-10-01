import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import hpp from 'hpp';
import { xssClean } from './middleware/xss.middleware';
import { setupSwagger } from './config/swagger';

const app: Express = express();

// Behind a reverse proxy (Render, NGINX) the client IP arrives in X-Forwarded-For.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow images from MinIO
}));
app.use(cors({
  origin: true, // Reflect the request origin (allows all origins in dev)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
}));
app.options('*', cors()); // Enable pre-flight across all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Security Hardening
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use(xssClean); // Strip HTML tags from req body/query/params

// Setup Swagger UI
setupSwagger(app);

// Rate limiting
// A single real user comfortably exceeds 100 requests in 15 minutes (discovery, chat,
// token refresh, media), so the old global cap locked people out of the app mid-session.
// Limits are generous by default and tunable per environment.
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';
const envInt = (name: string, fallback: number) => {
  const parsed = parseInt(process.env[name] || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: envInt('RATE_LIMIT_GLOBAL', isProd ? 1500 : 10000),
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
});
app.use(globalLimiter);

// Strict rate limiters for specific routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: envInt('RATE_LIMIT_AUTH', isProd ? 30 : 1000),
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  // Silent token refresh happens every 15 minutes per device and must never be throttled
  // alongside login attempts, otherwise active users get logged out.
  skip: (req) => isTest || req.path === '/refresh'
});

const swipeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: envInt('RATE_LIMIT_SWIPE', 50),
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'You are swiping too fast!' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest
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
import recommendationsRoutes from './routes/recommendations.routes';
import safetyRoutes from './routes/safety.routes';
import socialRoutes from './routes/social.routes';

// Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/swipe', swipeLimiter, swipeRoutes);
app.use('/api/v1/swipes', swipeLimiter, swipeRoutes); // legacy alias
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/wishlists', wishlistRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/appeals', appealRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/safety', safetyRoutes);
app.use('/api/v1/social', socialRoutes);

// Global 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler — keeps malformed JSON / multer errors from returning an HTML stack trace
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON body' } });
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file is too large' } });
  }
  const status = err?.status || err?.statusCode || 500;
  if (status >= 500) console.error('[Unhandled Error]', err);
  return res.status(status).json({ success: false, error: { code: status >= 500 ? 'SERVER_ERROR' : 'BAD_REQUEST', message: err?.message || 'Unexpected error' } });
});

export default app;
