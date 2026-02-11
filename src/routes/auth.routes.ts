import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Rate limit restrito para login (evita brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                     // máx 10 tentativas por IP
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit geral para refresh
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { error: 'Muitas requisições. Tente novamente em breve.' },
});

// ─── Rotas públicas ───────────────────────────────────────
router.post('/login',   loginLimiter,   authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);

// ─── Rotas protegidas ─────────────────────────────────────
router.post('/logout', requireAuth, authController.logout);
router.get('/me',      requireAuth, authController.me);

export default router;
