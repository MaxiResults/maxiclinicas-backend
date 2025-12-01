import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Error Handler', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Erro de validação
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      details: error.message
    });
  }

  // Erro de autenticação
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Não autorizado'
    });
  }

  // Erro genérico
  return res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}