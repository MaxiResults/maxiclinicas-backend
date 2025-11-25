import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class GruposService {
  /**
   * Listar grupos
   */
  async listar(
    clienteId: number,
    empresaId: number,
    filtros?: {
      categoriaId?: string;
      ativo?: boolean;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('produtos_grupos')
        .select(`
          *,
          categoria:produtos_categorias(id, nome, icone, cor)
        `)
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (filtros?.categoriaId) {
        query = query.eq('categoria_id', filtros.categoriaId);
      }

      if (filtros?.ativo !== undefined) {
        query = query.eq('ativo', filtros.ativo);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar grupos', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar grupo por ID
   */
  async buscarPorId(grupoId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_grupos')
        .select(`
          *,
          categoria:produtos_categorias(id, nome, icone, cor)
        `)
        .eq('id', grupoId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar grupo
   */
  async criar(dados: {
    categoriaId: string;
    clienteId: number;
    empresaId: number;
    nome: string;
    descricao?: string;
    slug: string;
    ordem?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_grupos')
        .insert({
          categoria_id: dados.categoriaId,
          cliente_id: dados.clienteId,
          empresa_id: dados.empresaId,
          nome: dados.nome,
          descricao: dados.descricao,
          slug: dados.slug,
          ordem: dados.ordem || 0,
          ativo: true
        })
        .select(`
          *,
          categoria:produtos_categorias(id, nome, icone, cor)
        `)
        .single();

      if (error) {
        logger.error('Erro ao criar grupo', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualizar grupo
   */
  async atualizar(
    grupoId: string,
    updates: any
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_grupos')
        .update(updates)
        .eq('id', grupoId)
        .select(`
          *,
          categoria:produtos_categorias(id, nome, icone, cor)
        `)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Excluir grupo
   */
  async excluir(grupoId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se tem produtos vinculados
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id')
        .eq('grupo_id', grupoId)
        .limit(1);

      if (produtos && produtos.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir grupo com produtos vinculados'
        };
      }

      const { error } = await supabase
        .from('produtos_grupos')
        .delete()
        .eq('id', grupoId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Contar produtos por grupo
   */
  async contarProdutos(grupoId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('produtos')
        .select('id', { count: 'exact', head: true })
        .eq('grupo_id', grupoId);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: count || 0
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const gruposService = new GruposService();