import { Request, Response } from 'express';
import { gruposService } from '../services/grupos.service';
import { logger } from '../utils/logger';

export class GruposController {
  /**
   * Listar grupos
   * GET /api/v1/grupos
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { categoria_id, ativo } = req.query;

      const result = await gruposService.listar(clienteId, empresaId, {
        categoriaId: categoria_id as string,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined
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
      logger.error('Erro ao listar grupos', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar grupo por ID
   * GET /api/v1/grupos/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await gruposService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Grupo não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar grupo', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar grupo
   * POST /api/v1/grupos
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { categoria_id, nome, descricao, slug, ordem } = req.body;

      if (!categoria_id || !nome || !slug) {
        return res.status(400).json({
          success: false,
          error: 'Categoria, nome e slug são obrigatórios'
        });
      }

      const result = await gruposService.criar({
        categoriaId: categoria_id,
        clienteId,
        empresaId,
        nome,
        descricao,
        slug,
        ordem
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
      logger.error('Erro ao criar grupo', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar grupo
   * PATCH /api/v1/grupos/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await gruposService.atualizar(id, updates);

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
      logger.error('Erro ao atualizar grupo', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir grupo
   * DELETE /api/v1/grupos/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await gruposService.excluir(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Grupo excluído com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir grupo', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Contar produtos do grupo
   * GET /api/v1/grupos/:id/produtos/count
   */
  async contarProdutos(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await gruposService.contarProdutos(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        count: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao contar produtos', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const gruposController = new GruposController();