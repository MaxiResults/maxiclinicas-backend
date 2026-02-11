/**
 * Script para gerar hash bcrypt de senha
 * Uso: node scripts/gerar-hash-senha.js SuaSenha123!
 */

const bcrypt = require('bcryptjs');

const senha = process.argv[2];

if (!senha) {
  console.error('❌ Informe a senha como argumento.');
  console.error('   Uso: node scripts/gerar-hash-senha.js SuaSenha123!');
  process.exit(1);
}

if (senha.length < 8) {
  console.error('❌ Senha muito curta. Use no mínimo 8 caracteres.');
  process.exit(1);
}

bcrypt.hash(senha, 12).then((hash) => {
  console.log('\n✅ Hash gerado com sucesso!\n');
  console.log('Hash:', hash);
  console.log('\n📋 Cole este SQL no Supabase SQL Editor:\n');
  console.log(`INSERT INTO usuarios (cliente_id, empresa_id, nome, email, senha_hash, role, ativo)`);
  console.log(`VALUES (`);
  console.log(`  1,`);
  console.log(`  1,`);
  console.log(`  'Administrador',`);
  console.log(`  'admin@maxiclinicas.com.br',`);
  console.log(`  '${hash}',`);
  console.log(`  'admin',`);
  console.log(`  true`);
  console.log(`)`);
  console.log(`ON CONFLICT (email) DO NOTHING;`);
  console.log('');
});
