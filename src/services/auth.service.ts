import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import type { JwtPayload, AuthUser, LoginRequest, LoginResponse, MeResponse } from '../types/auth.types';

// ─── Configuração de tokens ────────────────────────────────
const JWT_SECRET         = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_TTL   = parseInt(process.env.JWT_EXPIRES_IN  || '900');   // 15 min
const REFRESH_TOKEN_TTL  = parseInt(process.env.JWT_REFRESH_TTL || '604800'); // 7 dias

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MIN = 15;

// ─── Helpers de token ─────────────────────────────────────
function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string };
}

// ─── Login ────────────────────────────────────────────────
export async function login(
  body: LoginRequest,
  ip?: string,
  userAgent?: string
): Promise<LoginResponse> {
  const email = body.email.toLowerCase().trim();

  // 1. Buscar usuário
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, cliente_id, empresa_id, nome, email, senha_hash, role, ativo, profissional_id, tentativas_login, bloqueado_ate')
    .eq('email', email)
    .single();

  // Mensagem genérica para não vazar se e-mail existe
  const INVALID_MSG = 'E-mail ou senha inválidos';

  if (error || !usuario) {
    await logAuth(null, 0, 0, email, 'login_fail', ip, userAgent, { motivo: 'usuario_nao_encontrado' });
    throw { status: 401, message: INVALID_MSG };
  }

  if (!usuario.ativo) {
    await logAuth(usuario.id, usuario.cliente_id, usuario.empresa_id, email, 'login_fail', ip, userAgent, { motivo: 'usuario_inativo' });
    throw { status: 401, message: INVALID_MSG };
  }

  // 2. Verificar bloqueio por tentativas
  if (usuario.bloqueado_ate && new Date(usuario.bloqueado_ate) > new Date()) {
    const liberaEm = new Date(usuario.bloqueado_ate).toLocaleTimeString('pt-BR');
    throw { status: 429, message: `Conta temporariamente bloqueada. Tente novamente após ${liberaEm}` };
  }

  // 3. Verificar senha
  const senhaOk = await bcrypt.compare(body.senha, usuario.senha_hash);

  if (!senhaOk) {
    const novasTentativas = (usuario.tentativas_login || 0) + 1;
    const bloqueio = novasTentativas >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + BLOCK_DURATION_MIN * 60 * 1000).toISOString()
      : null;

    await supabase
      .from('usuarios')
      .update({ tentativas_login: novasTentativas, bloqueado_ate: bloqueio })
      .eq('id', usuario.id);

    await logAuth(usuario.id, usuario.cliente_id, usuario.empresa_id, email, 'login_fail', ip, userAgent, {
      motivo: 'senha_incorreta',
      tentativa: novasTentativas
    });

    if (bloqueio) {
      throw { status: 429, message: `Muitas tentativas. Conta bloqueada por ${BLOCK_DURATION_MIN} minutos.` };
    }
    throw { status: 401, message: INVALID_MSG };
  }

  // 4. Buscar empresas de acesso (multi-filial para admin/gestor)
  const empresasAcesso = await getEmpresasAcesso(usuario.id, usuario.cliente_id, usuario.empresa_id, usuario.role);

  // 5. Gerar tokens
  const tokenPayload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub:              usuario.id,
    email:            usuario.email,
    nome:             usuario.nome,
    role:             usuario.role,
    cliente_id:       usuario.cliente_id,
    empresa_id:       usuario.empresa_id,
    profissional_id:  usuario.profissional_id || null,
    empresas_acesso:  empresasAcesso,
  };

  const accessToken  = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(usuario.id);

  // 6. Persistir refresh token + limpar tentativas
  await supabase
    .from('usuarios')
    .update({
      tentativas_login:  0,
      bloqueado_ate:     null,
      ultimo_login:      new Date().toISOString(),
      refresh_token:     refreshToken,
      refresh_token_exp: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000).toISOString(),
    })
    .eq('id', usuario.id);

  await logAuth(usuario.id, usuario.cliente_id, usuario.empresa_id, email, 'login_ok', ip, userAgent);

  return {
    access_token:  accessToken,
    refresh_token: refreshToken,
    expires_in:    ACCESS_TOKEN_TTL,
    token_type:    'Bearer',
    usuario: {
      id:               usuario.id,
      nome:             usuario.nome,
      email:            usuario.email,
      role:             usuario.role,
      avatar_url:       null,
      cliente_id:       usuario.cliente_id,
      empresa_id:       usuario.empresa_id,
      profissional_id:  usuario.profissional_id || null,
      empresas_acesso:  empresasAcesso,
    },
  };
}

// ─── Refresh Token ────────────────────────────────────────
export async function refreshTokens(token: string): Promise<{ access_token: string; expires_in: number }> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw { status: 401, message: 'Refresh token inválido ou expirado' };
  }

  // Verificar se o token ainda está no banco (rotativo)
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, cliente_id, empresa_id, nome, email, role, ativo, profissional_id, refresh_token, refresh_token_exp')
    .eq('id', payload.sub)
    .single();

  if (!usuario || !usuario.ativo) {
    throw { status: 401, message: 'Usuário inativo ou não encontrado' };
  }
  if (usuario.refresh_token !== token) {
    throw { status: 401, message: 'Refresh token inválido (já utilizado)' };
  }
  if (usuario.refresh_token_exp && new Date(usuario.refresh_token_exp) < new Date()) {
    throw { status: 401, message: 'Refresh token expirado' };
  }

  const empresasAcesso = await getEmpresasAcesso(usuario.id, usuario.cliente_id, usuario.empresa_id, usuario.role);

  const newAccessToken = signAccessToken({
    sub:             usuario.id,
    email:           usuario.email,
    nome:            usuario.nome,
    role:            usuario.role,
    cliente_id:      usuario.cliente_id,
    empresa_id:      usuario.empresa_id,
    profissional_id: usuario.profissional_id || null,
    empresas_acesso: empresasAcesso,
  });

  await logAuth(usuario.id, usuario.cliente_id, usuario.empresa_id, usuario.email, 'token_refresh');

  return { access_token: newAccessToken, expires_in: ACCESS_TOKEN_TTL };
}

// ─── Logout ───────────────────────────────────────────────
export async function logout(userId: string): Promise<void> {
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('cliente_id, empresa_id, email')
    .eq('id', userId)
    .single();

  await supabase
    .from('usuarios')
    .update({ refresh_token: null, refresh_token_exp: null })
    .eq('id', userId);

  if (usuario) {
    await logAuth(userId, usuario.cliente_id, usuario.empresa_id, usuario.email, 'logout');
  }
}

// ─── /auth/me ─────────────────────────────────────────────
export async function getMe(userId: string): Promise<MeResponse> {
  console.log('🔍 DEBUG getMe - userId recebido:', userId);
  
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select(`
      id, nome, email, role, avatar_url, cliente_id, empresa_id, profissional_id,
      profissionais!fk_usuarios_profissional!left ( funcao_id,
        funcoes ( id, nome, permissoes, nivel_acesso )
      )
    `)
    .eq('id', userId)
    .single();

  console.log('🔍 DEBUG getMe - data:', usuario);
  console.log('🔍 DEBUG getMe - error:', error);

  if (!usuario) throw { status: 404, message: 'Usuário não encontrado' };

  const empresasAcesso = await getEmpresasAcesso(usuario.id, usuario.cliente_id, usuario.empresa_id, usuario.role);

  // Extrair dados da função (pode não existir se usuário não tem profissional vinculado)
  const funcao = (usuario as any).profissionais?.funcoes ?? null;

  return {
    id:              usuario.id,
    nome:            usuario.nome,
    email:           usuario.email,
    role:            usuario.role,
    avatar_url:      usuario.avatar_url || null,
    cliente_id:      usuario.cliente_id,
    empresa_id:      usuario.empresa_id,
    profissional_id: usuario.profissional_id || null,
    empresas_acesso: empresasAcesso,
    funcao,
  };
}

// ─── Helpers internos ─────────────────────────────────────

// Busca as empresas que um usuário pode acessar
// Admins/gestores podem ter acesso a múltiplas filiais do mesmo cliente
async function getEmpresasAcesso(
  userId: string,
  clienteId: number,
  empresaId: number,
  role: string
): Promise<number[]> {
  // Superadmin e admin podem acessar múltiplas filiais
  if (role === 'superadmin' || role === 'admin' || role === 'gestor') {
    const { data } = await supabase
      .from('usuarios_empresas_acesso')
      .select('empresa_id')
      .eq('usuario_id', userId)
      .eq('cliente_id', clienteId);

    if (data && data.length > 0) {
      // Garante que a empresa principal sempre está incluída
      const extras = data.map((r: any) => r.empresa_id);
      return Array.from(new Set([empresaId, ...extras]));
    }
  }

  // Demais roles: só acessa a própria empresa
  return [empresaId];
}

// Registra eventos de autenticação para auditoria
async function logAuth(
  userId: string | null,
  clienteId: number,
  empresaId: number,
  email: string,
  evento: string,
  ip?: string,
  userAgent?: string,
  detalhes?: object
): Promise<void> {
  await supabase.from('auth_logs').insert({
    usuario_id: userId,
    cliente_id: clienteId,
    empresa_id: empresaId,
    email,
    evento,
    ip:         ip || null,
    user_agent: userAgent || null,
    detalhes:   detalhes || {},
  });
}
