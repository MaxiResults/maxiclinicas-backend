import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class EspecialidadesService {
  /**
   * Listar especialidades
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
        .from('especialidades')
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
        logger.error('Erro ao listar especialidades', error);
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
   * Buscar especialidade por ID
   */
  async buscarPorId(especialidadeId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('especialidades')
        .select('*')
        .eq('id', especialidadeId)
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
   * Criar especialidade
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
        .from('especialidades')
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
        logger.error('Erro ao criar especialidade', error);
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
   * Atualizar especialidade
   */
  async atualizar(
    especialidadeId: string,
    updates: any
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('especialidades')
        .update(updates)
        .eq('id', especialidadeId)
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
   * Excluir especialidade
   */
  async excluir(especialidadeId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se tem profissionais vinculados
      const { data: vinculos } = await supabase
        .from('profissionais_especialidades')
        .select('id')
        .eq('especialidade_id', especialidadeId)
        .limit(1);

      if (vinculos && vinculos.length > 0) {
        return {
          success: false,
          error: 'Não é possível excluir especialidade com profissionais vinculados'
        };
      }

      const { error } = await supabase
        .from('especialidades')
        .delete()
        .eq('id', especialidadeId);

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
   * Contar profissionais por especialidade
   */
  async contarProfissionais(especialidadeId: string): Promise<ApiResponse<number>> {
    try {
      const { count, error } = await supabase
        .from('profissionais_especialidades')
        .select('id', { count: 'exact', head: true })
        .eq('especialidade_id', especialidadeId);

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

export const especialidadesService = new EspecialidadesService();