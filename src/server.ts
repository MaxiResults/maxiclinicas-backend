import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { testConnection } from './config/supabase';
import { logger, morganStream } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler.middleware';
import { corsMiddleware } from './middlewares/cors.middleware';

// Importar rotas
import authRoutes from './routes/auth.routes';
import webhooksRoutes from './routes/webhooks.routes';
import leadsRoutes from './routes/leads.routes';
import agendamentosRoutes from './routes/agendamentos.routes';
import conversasRoutes from './routes/conversas.routes';
import profissionaisRoutes from './routes/profissionais.routes';  // ← ADICIONADO
import produtosRoutes from './routes/produtos.routes';            // ← ADICIONADO
import categoriasRoutes from './routes/categorias.routes';
import gruposRoutes from './routes/grupos.routes';
import especialidadesRoutes from './routes/especialidades.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(helmet());
app.use(cors({
  origin: '*',
  credentials: false
}));
app.use(corsMiddleware);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: morganStream }));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression
app.use(compression());


// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: '🚀 WhatsApp Automation API - Maxi Results',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      webhooks: '/api/v1/webhooks',
      leads: '/api/v1/leads',
      agendamentos: '/api/v1/agendamentos',
      conversas: '/api/v1/conversas',
      profissionais: '/api/v1/profissionais',  // ← ADICIONADO
      produtos: '/api/v1/produtos',              // ← ADICIONADO
      categorias: '/api/v1/categorias',  // ← ADICIONAR
      grupos: '/api/v1/grupos'           // ← ADICIONAR
    },
    documentation: 'Em breve'
  });
});

// Health check
app.get('/health', async (req, res) => {
  const supabaseConnected = await testConnection();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabaseConnected ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Rotas da API
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/webhooks', webhooksRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/agendamentos', agendamentosRoutes);
app.use('/api/v1/conversas', conversasRoutes);
app.use('/api/v1/profissionais', profissionaisRoutes);  // ← ADICIONADO
app.use('/api/v1/produtos', produtosRoutes);            // ← ADICIONADO
app.use('/api/v1/categorias', categoriasRoutes);
app.use('/api/v1/grupos', gruposRoutes);
app.use('/api/v1/especialidades', especialidadesRoutes);

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Error handler (deve ser o último middleware)
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, async () => {
  logger.info('='.repeat(50));
  logger.info('🚀 WhatsApp Automation API - Maxi Results');
  logger.info('='.repeat(50));
  logger.info(`📍 Server: http://localhost:${PORT}`);
  logger.info(`📍 Health: http://localhost:${PORT}/health`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV}`);
  logger.info('='.repeat(50));
  logger.info('📡 Endpoints disponíveis:');
  logger.info(`   POST /api/v1/auth/login`);           // ← ADICIONAR
  logger.info(`   POST /api/v1/auth/refresh`);         // ← ADICIONAR
  logger.info(`   GET  /api/v1/auth/me`);              // ← ADICIONAR
  logger.info(`   POST /api/v1/auth/logout`);          // ← ADICIONAR
  logger.info(`   POST /api/v1/webhooks/zapi`);
  logger.info(`   POST /api/v1/webhooks/n8n`);
  logger.info(`   GET  /api/v1/leads`);
  logger.info(`   POST /api/v1/leads`);
  logger.info(`   GET  /api/v1/agendamentos`);
  logger.info(`   POST /api/v1/agendamentos`);
  logger.info(`   POST /api/v1/conversas/sessao`);
  logger.info(`   POST /api/v1/conversas/mensagem`);
  logger.info(`   GET  /api/v1/profissionais`);          // ← ADICIONADO
  logger.info(`   GET  /api/v1/produtos`);                // ← ADICIONADO
  logger.info(`   GET  /api/v1/categorias`);         // ← ADICIONAR
  logger.info(`   POST /api/v1/categorias`);         // ← ADICIONAR
  logger.info(`   GET  /api/v1/grupos`);             // ← ADICIONAR
  logger.info(`   POST /api/v1/grupos`);             // ← ADICIONAR
  logger.info(`   GET  /api/v1/especialidades`);
  logger.info(`   POST /api/v1/especialidades`);
  logger.info('='.repeat(50));
  
  // Testar conexão Supabase
  await testConnection();
  
  logger.info('='.repeat(50));
  logger.info('✅ Sistema pronto para uso!');
  logger.info('='.repeat(50));
});
