import cors from 'cors';

/**
 * Configuração de CORS
 * Permite requisições do frontend e outros domínios autorizados
 */
const allowedOrigins = [
  'http://maxiclinicas.com.br',
  'https://maxiclinicas.com.br',
  'http://www.maxiclinicas.com.br',
  'https://www.maxiclinicas.com.br',
  'http://localhost:3000',
  'http://localhost:5173',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Permitir todos os domínios lovable.app e lovable.dev
    if (
      origin.includes('lovable.app') || 
      origin.includes('lovable.dev')
    ) {
      return callback(null, true);
    }

    // Verificar se origin está na lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutos
});
