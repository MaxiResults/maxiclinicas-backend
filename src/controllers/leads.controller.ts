import { Request, Response } from 'express';
import { leadsService } from '../services/leads.service';
import { logger } from '../utils/logger';

export class LeadsController {
  /**
   * Listar leads
   * GET /api/v1/leads
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { status, limit, offset } = req.query;

      const result = await leadsService.listar({
        clienteId,
        empresaId,
        status: status as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
        total: result.data?.length || 0
      });
    } catch (error: any) {
      logger.error('Erro ao listar leads', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar lead por ID
   * GET /api/v1/leads/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await leadsService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Lead não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar lead', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar lead
   * POST /api/v1/leads
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { nome, telefone, email, canal_origem } = req.body;

      if (!nome || !telefone) {
        return res.status(400).json({
          success: false,
          error: 'Nome e telefone são obrigatórios'
        });
      }

      const result = await leadsService.buscarOuCriarLead({
        telefone,
        clienteId,
        empresaId,
        nome
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(201).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao criar lead', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar lead
   * PATCH /api/v1/leads/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await leadsService.atualizar(id, updates);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao atualizar lead', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Converter lead em cliente
   * POST /api/v1/leads/:id/converter
   */
  async converterEmCliente(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome_completo } = req.body;

      const result = await leadsService.converterEmCliente(id, nome_completo);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lead convertido em cliente com sucesso',
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao converter lead', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Adicionar tag ao lead
   * POST /api/v1/leads/:id/tags
   */
  async adicionarTag(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tag, cor } = req.body;

      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');

      if (!tag) {
        return res.status(400).json({
          success: false,
          error: 'Tag é obrigatória'
        });
      }

      const result = await leadsService.adicionarTag(
        id,
        tag,
        clienteId,
        empresaId,
        cor
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Tag adicionada com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao adicionar tag', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar tags do lead
   * GET /api/v1/leads/:id/tags
   */
  async buscarTags(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await leadsService.buscarTags(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar tags', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar lead por telefone - ENDPOINT PARA N8N
   * GET /api/v1/leads/telefone/:telefone
   */
  async buscarPorTelefone(req: Request, res: Response) {
    try {
      const { telefone } = req.params;
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');

      const result = await leadsService.buscarPorTelefone(
        telefone,
        clienteId,
        empresaId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      if (!result.data) {
        return res.status(404).json({
          success: false,
          error: 'Lead não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar lead por telefone', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

}

export const leadsController = new LeadsController();