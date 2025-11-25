import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class CategoriasService {
  /**
   * Listar categorias
   */
  async listar(
    clienteId: number,
    empresaId: number,
    filtros?: {
      ativo?: boolean;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('produtos_categorias')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true });

      if (filtros?.ativo !== undefined) {
        query = query.eq('ativo', filtros.ativo);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar categorias', error);
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
   * Buscar categoria por ID
   */
  async buscarPorId(categoriaId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_categorias')
        .select('*')
        .eq('id', categoriaId)
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
   * Criar categoria
   */
  async criar(dados: {
    clienteId: number;
    empresaId: number;
    nome: string;
    descricao?: string;
    icone?: string;
    cor?: string;
    slug: string;
    ordem?: number;
  }): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_categorias')
        .insert({
          cliente_id: dados.clienteId,
          empresa_id: dados.empresaId,
          nome: dados.nome,
          descricao: dados.descricao,
          icone: dados.icone,
          cor: dados.cor,
          slug: dados.slug,
          ordem: dados.ordem || 0,
          ativo: true
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar categoria', error);
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
   * Atualizar categoria
   */
  async atualizar(
    categoriaId: string,
    updates: any
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos_categorias')
        .update(updates)
        .eq('id', categoriaId)
        .select()
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
   * Excluir categoria
   */
  async excluir(categoriaId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se tem grupos vinculados
      const { data: grupos } = await supabase
        .from('produtos_grupos')
        .select('id')
        .eq('categoria_id', categoriaId)
        .limit(1);

      if (grupos && grupos.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir categoria com grupos vinculados'
        };
      }

      // Verificar se tem produtos vinculados
      const { data: produtos } = await supabase
        .from('produtos')
        .select('id')
        .eq('categoria_id', categoriaId)
        .limit(1);

      if (produtos && produtos.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir categoria com produtos vinculados'
        };
      }

      const { error } = await supabase
        .from('produtos_categorias')
        .delete()
        .eq('id', categoriaId);

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
   * Contar produtos por categoria
   */
  async contarProdutos(categoriaId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('produtos')
        .select('id', { count: 'exact', head: true })
        .eq('categoria_id', categoriaId);

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

export const categoriasService = new CategoriasService();