import { Request, Response } from 'express';
import { produtosService } from '../services/produtos.service';
import { logger } from '../utils/logger';

export class ProdutosController {
  /**
   * Listar produtos
   * GET /api/v1/produtos
   */
  async listar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const { categoria_id, grupo_id, tipo, ativo, busca } = req.query;

      const result = await produtosService.listar(clienteId, empresaId, {
        categoriaId: categoria_id as string,
        grupoId: grupo_id as string,
        tipo: tipo as string,
        ativo: ativo === 'true' ? true : ativo === 'false' ? false : undefined,
        busca: busca as string
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
      logger.error('Erro ao listar produtos', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Buscar produto por ID
   * GET /api/v1/produtos/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await produtosService.buscarPorId(parseInt(id));

      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: result.error || 'Produto não encontrado'
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error: any) {
      logger.error('Erro ao buscar produto', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Criar produto
   * POST /api/v1/produtos
   */
  async criar(req: Request, res: Response) {
    try {
      const clienteId = parseInt(process.env.DEFAULT_CLIENTE_ID || '1');
      const empresaId = parseInt(process.env.DEFAULT_EMPRESA_ID || '1');
      
      const {
        nome,
        descricao,
        categoria_id,
        grupo_id,
        tipo,
        preco_venda,
        preco_custo,
        preco_promocional,
        duracao_minutos,
        sku,
        imagem_url,
        controla_estoque,
        quantidade_estoque,
        estoque_minimo,
        tem_variacoes,
        destaque,
        variacoes
      } = req.body;

      if (!nome || !tipo) {
        return res.status(400).json({
          success: false,
          error: 'Nome e tipo são obrigatórios'
        });
      }

      const result = await produtosService.criar({
        clienteId,
        empresaId,
        nome,
        descricao,
        categoriaId: categoria_id,
        grupoId: grupo_id,
        tipo,
        preco_venda,
        preco_custo,
        preco_promocional,
        duracao_minutos,
        sku,
        imagem_url,
        controla_estoque,
        quantidade_estoque,
        estoque_minimo,
        tem_variacoes,
        destaque,
        variacoes
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
      logger.error('Erro ao criar produto', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Atualizar produto
   * PATCH /api/v1/produtos/:id
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { variacoes, ...updates } = req.body;

      const result = await produtosService.atualizar(
        parseInt(id),
        updates,
        variacoes
      );

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
      logger.error('Erro ao atualizar produto', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Excluir produto
   * DELETE /api/v1/produtos/:id
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await produtosService.excluir(parseInt(id));

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Produto excluído com sucesso'
      });
    } catch (error: any) {
      logger.error('Erro ao excluir produto', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ativar/Desativar produto
   * PATCH /api/v1/produtos/:id/toggle
   */
  async toggleAtivo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { ativo } = req.body;

      const result = await produtosService.toggleAtivo(parseInt(id), ativo);

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
      logger.error('Erro ao alternar status do produto', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

export const produtosController = new ProdutosController();