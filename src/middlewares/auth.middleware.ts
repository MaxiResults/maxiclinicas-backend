import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import type { UserRole } from '../types/auth.types';

// ─── Middleware principal ──────────────────────────────────
// Extrai e valida o JWT do header Authorization
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de acesso não fornecido' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id:              payload.sub,
      email:           payload.email,
      nome:            payload.nome,
      role:            payload.role,
      cliente_id:      payload.cliente_id,
      empresa_id:      payload.empresa_id,
      profissional_id: payload.profissional_id,
      empresas_acesso: payload.empresas_acesso,
      ativo:           true,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Token inválido', code: 'TOKEN_INVALID' });
    }
  }
}

// ─── Guard de roles ───────────────────────────────────────
// Uso: requireRole('admin', 'gestor')
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Acesso negado',
        detail: `Requer perfil: ${roles.join(' ou ')}`,
      });
      return;
    }

    next();
  };
}

// ─── Guard de acesso à empresa ────────────────────────────
// Garante que o usuário só acessa dados da(s) empresa(s) que tem permissão
// Injeta cliente_id e empresa_id no req para os controllers usarem
export function requireTenantAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  // Permite sobrescrever empresa_id via query/body se o usuário tem acesso a múltiplas empresas
  const empresaRequisitada = Number(
    req.query.empresa_id || req.body?.empresa_id || req.user.empresa_id
  );

  if (!req.user.empresas_acesso.includes(empresaRequisitada)) {
    res.status(403).json({ error: 'Sem acesso a esta empresa/filial' });
    return;
  }

  // Garante que as queries do controller usarão os IDs corretos
  req.user.empresa_id = empresaRequisitada;
  next();
}

// ─── Combinados prontos para usar nas rotas ───────────────
export const authMiddleware       = [requireAuth];
export const authAdminMiddleware  = [requireAuth, requireRole('admin', 'superadmin')];
export const authGestorMiddleware = [requireAuth, requireRole('admin', 'gestor', 'superadmin')];
