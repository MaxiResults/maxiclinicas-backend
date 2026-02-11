import { Request, Response } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';

// ─── Schemas de validação ─────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('E-mail inválido').toLowerCase(),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

// ─── POST /auth/login ─────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parse.error.flatten() });
    return;
  }

  try {
    const ip        = req.ip || req.headers['x-forwarded-for']?.toString();
    const userAgent = req.headers['user-agent'];
    const result    = await authService.login(parse.data, ip, userAgent);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
}

// ─── POST /auth/refresh ───────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: 'refresh_token inválido' });
    return;
  }

  try {
    const result = await authService.refreshTokens(parse.data.refresh_token);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
}

// ─── POST /auth/logout ────────────────────────────────────
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    await authService.logout(req.user!.id);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao realizar logout' });
  }
}

// ─── GET /auth/me ─────────────────────────────────────────
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.getMe(req.user!.id);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || 'Erro interno' });
  }
}
