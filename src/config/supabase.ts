import dotenv from 'dotenv';
dotenv.config();

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 DEBUG - Variáveis de ambiente:');
console.log('SUPABASE_URL:', SUPABASE_URL ? 'Definido ✅' : 'VAZIO ❌');
console.log('SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'Definido ✅' : 'VAZIO ❌');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ ERRO: Variáveis não carregadas do .env');
  console.error('Verifique se o arquivo .env existe em: C:\\DEV\\whatsapp-automation\\.env');
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined');
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('Clientes')
      .select('count')
      .limit(1)
      .single();
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
}

console.log('📦 Supabase client initialized');