import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class ProfissionaisService {
  /**
   * Listar profissionais
   */
  async listar(
    clienteId: number,
    empresaId: number,
    filtros?: {
      status?: string;
      funcaoId?: number;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('profissionais')
        .select(`
          *,
          especialidades:profissionais_especialidades(
            id,
            nivel,
            principal,
            ordem,
            especialidade:especialidades(
              id,
              nome,
              icone,
              cor,
              slug
            )
          )
        `)
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('nome', { ascending: true });

      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.funcaoId) {
        query = query.eq('funcao_id', filtros.funcaoId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar profissionais', error);
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
   * Buscar profissional por ID
   */
  async buscarPorId(profissionalId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .select(`
          *,
          especialidades:profissionais_especialidades(
            id,
            nivel,
            principal,
            ordem,
            especialidade:especialidades(
              id,
              nome,
              icone,
              cor,
              slug
            )
          )
        `)
        .eq('id', profissionalId)
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
   * Criar profissional
   */
  async criar(dados: {
    clienteId: number;
    empresaId: number;
    funcaoId: number;
    nome: string;
    email?: string;
    telefone?: string;
    whatsapp?: string;
    cpf?: string;
    foto_url?: string;
    registro_profissional?: string;
    especialidades?: string[]; // Array de IDs de especialidades
    biografia?: string;
    horario_trabalho?: any;
    duracao_padrao_consulta?: string;
    permite_agendamento_online?: boolean;
    comissao_percentual?: number;
    data_admissao?: string;
    observacoes?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Preparar horário de trabalho padrão se não fornecido
      const horarioPadrao = {
        seg: { ativo: true, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' },
        ter: { ativo: true, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' },
        qua: { ativo: true, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' },
        qui: { ativo: true, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' },
        sex: { ativo: true, inicio: '08:00', fim: '18:00', intervalo_inicio: '12:00', intervalo_fim: '13:00' },
        sab: { ativo: false, inicio: null, fim: null, intervalo_inicio: null, intervalo_fim: null },
        dom: { ativo: false, inicio: null, fim: null, intervalo_inicio: null, intervalo_fim: null }
      };

      const { data, error } = await supabase
        .from('profissionais')
        .insert({
          cliente_id: dados.clienteId,
          empresa_id: dados.empresaId,
          funcao_id: dados.funcaoId,
          nome: dados.nome,
          email: dados.email,
          telefone: dados.telefone,
          whatsapp: dados.whatsapp,
          cpf: dados.cpf,
          foto_url: dados.foto_url,
          registro_profissional: dados.registro_profissional,
          biografia: dados.biografia,
          horario_trabalho: dados.horario_trabalho || horarioPadrao,
          duracao_padrao_consulta: dados.duracao_padrao_consulta || '01:00:00',
          permite_agendamento_online: dados.permite_agendamento_online !== false,
          comissao_percentual: dados.comissao_percentual,
          status: 'ativo',
          data_admissao: dados.data_admissao,
          observacoes: dados.observacoes,
          metadata: {}
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar profissional', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Vincular especialidades
      if (dados.especialidades && dados.especialidades.length > 0) {
        const vinculos = dados.especialidades.map((especialidadeId, index) => ({
          profissional_id: data.id,
          especialidade_id: especialidadeId,
          principal: index === 0, // Primeira é principal
          ordem: index
        }));

        const { error: vinculoError } = await supabase
          .from('profissionais_especialidades')
          .insert(vinculos);

        if (vinculoError) {
          logger.error('Erro ao vincular especialidades', vinculoError);
          // Não retorna erro, profissional já foi criado
        }
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
   * Atualizar profissional
   */
  async atualizar(
    profissionalId: string,
    updates: any,
    especialidades?: string[]
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .update(updates)
        .eq('id', profissionalId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Se especialidades foram enviadas, atualizar vínculos
      if (especialidades !== undefined) {
        // Remover vínculos antigos
        await supabase
          .from('profissionais_especialidades')
          .delete()
          .eq('profissional_id', profissionalId);

        // Criar novos vínculos
        if (especialidades.length > 0) {
          const vinculos = especialidades.map((especialidadeId, index) => ({
            profissional_id: profissionalId,
            especialidade_id: especialidadeId,
            principal: index === 0,
            ordem: index
          }));

          await supabase
            .from('profissionais_especialidades')
            .insert(vinculos);
        }
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
   * Excluir profissional
   */
  async excluir(profissionalId: string): Promise<ApiResponse<void>> {
    try {
      // Verificar se tem agendamentos vinculados (futuro)
      // const { data: agendamentos } = await supabase...

      const { error } = await supabase
        .from('profissionais')
        .delete()
        .eq('id', profissionalId);

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
   * Atualizar status
   */
  async atualizarStatus(
    profissionalId: string,
    status: string
  ): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('profissionais')
        .update({ status })
        .eq('id', profissionalId)
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
}

export const profissionaisService = new ProfissionaisService();