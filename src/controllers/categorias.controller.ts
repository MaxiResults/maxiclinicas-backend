import { Request, Response } from 'express';
import { categoriasService } from '../services/categorias.service';
import { logger } from '../utils/logger';

export class CategoriasController {
  /**
   * Listar categorias
   * GET /api/v1/categorias
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { ativo } = req.query;

      const result = await categoriasService.listar(clienteId, empresaId, {
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
      logger.error('Erro ao listar categorias', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar categoria por ID
   * GET /api/v1/categorias/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await categoriasService.buscarPorId(id);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Categoria não encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar categoria', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar categoria
   * POST /api/v1/categorias
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { nome, descricao, icone, cor, slug, ordem } = req.body;

      if (!nome || !slug) {
        return res.status(400).json({
          success: false,
          error: 'Nome e slug são obrigatórios'
        });
      }

      const result = await categoriasService.criar({
        clienteId,
        empresaId,
        nome,
        descricao,
        icone,
        cor,
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
      logger.error('Erro ao criar categoria', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar categoria
   * PATCH /api/v1/categorias/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const result = await categoriasService.atualizar(id, updates);

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
      logger.error('Erro ao atualizar categoria', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir categoria
   * DELETE /api/v1/categorias/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await categoriasService.excluir(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Categoria excluída com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir categoria', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Contar produtos da categoria
   * GET /api/v1/categorias/:id/produtos/count
   */
  async contarProdutos(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await categoriasService.contarProdutos(id);

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

export const categoriasController = new CategoriasController();