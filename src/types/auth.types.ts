// ============================================================
// TIPOS DE AUTENTICAÇÃO - MaxiClinicas
// ============================================================

export type UserRole = 'superadmin' | 'admin' | 'gestor' | 'atendente' | 'profissional' | 'viewer';

export interface JwtPayload {
  sub: string;          // usuario.id (UUID)
  email: string;
  nome: string;
  role: UserRole;
  cliente_id: number;
  empresa_id: number;
  profissional_id: string | null;
  // Empresas que este usuário pode acessar (multi-filial para admin/gestor)
  empresas_acesso: number[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  cliente_id: number;
  empresa_id: number;
  profissional_id: string | null;
  empresas_acesso: number[];
  ativo: boolean;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;       // segundos
  token_type: 'Bearer';
  usuario: {
    id: string;
    nome: string;
    email: string;
    role: UserRole;
    avatar_url: string | null;
    cliente_id: number;
    empresa_id: number;
    profissional_id: string | null;
    empresas_acesso: number[];
  };
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface MeResponse {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  cliente_id: number;
  empresa_id: number;
  profissional_id: string | null;
  empresas_acesso: number[];
  funcao?: {
    id: number;
    nome: string;
    permissoes: Record<string, boolean>;
    nivel_acesso: number;
  } | null;
}

// Extend Express Request com usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
