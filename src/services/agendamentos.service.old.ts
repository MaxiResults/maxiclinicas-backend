import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class AgendamentosService {
  /**
   * Listar agendamentos
   */
  async listar(
    clienteId: number,
    empresaId: number,
    filtros?: {
      status?: string;
      profissionalId?: string;
      leadId?: string;
      dataInicio?: string;
      dataFim?: string;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('agendamentos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('data_hora_inicio', { ascending: false });

      if (filtros?.status) {
        query = query.eq('status', filtros.status);
      }

      if (filtros?.profissionalId) {
        query = query.eq('profissional_id', filtros.profissionalId);
      }

      if (filtros?.leadId) {
        query = query.eq('lead_id', filtros.leadId);
      }

      if (filtros?.dataInicio) {
        query = query.gte('data_hora_inicio', filtros.dataInicio);
      }

      if (filtros?.dataFim) {
        query = query.lte('data_hora_inicio', filtros.dataFim);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar agendamentos', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Buscar relacionamentos manualmente
      if (data && data.length > 0) {
        const leadIds = [...new Set(data.map(a => a.lead_id).filter(Boolean))];
        const profissionalIds = [...new Set(data.map(a => a.profissional_id).filter(Boolean))];
        const produtoIds = [...new Set(data.map(a => a.produto_id).filter(Boolean))];

        // Buscar leads
        const { data: leads } = await supabase
          .from('Leads_Cadastro')
          .select('id, nome, telefone, email')
          .in('id', leadIds);

        // Buscar profissionais
        const { data: profissionais } = await supabase
          .from('profissionais')
          .select('id, nome, foto_url')
          .in('id', profissionalIds);

        // Buscar produtos
        const { data: produtos } = await supabase
          .from('produtos')
          .select('id, nome, preco_padrao')
          .in('id', produtoIds);

        // Mapear relacionamentos
        const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);
        const profissionaisMap = new Map(profissionais?.map(p => [p.id, p]) || []);
        const produtosMap = new Map(produtos?.map(p => [p.id, p]) || []);

        // Adicionar relacionamentos aos agendamentos
        const dataComRelacionamentos = data.map(agendamento => ({
          ...agendamento,
          Lead: leadsMap.get(agendamento.lead_id) || null,
          Profissional: profissionaisMap.get(agendamento.profissional_id) || null,
          Produto: produtosMap.get(agendamento.produto_id) || null
        }));

        return {
          success: true,
          data: dataComRelacionamentos
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
   * Buscar agendamento por ID
   */
  async buscarPorId(agendamentoId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .select('*')
        .eq('id', agendamentoId)
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Buscar relacionamentos manualmente
      if (data) {
        const relacionamentos = await Promise.all([
          data.lead_id ? supabase.from('Leads_Cadastro').select('id, nome, telefone, email, whatsapp_id').eq('id', data.lead_id).single() : null,
          data.profissional_id ? supabase.from('profissionais').select('id, nome, foto_url, email, telefone').eq('id', data.profissional_id).single() : null,
          data.produto_id ? supabase.from('produtos').select('id, nome, descricao_curta, preco_padrao').eq('id', data.produto_id).single() : null
        ]);

        return {
          success: true,
          data: {
            ...data,
            Lead: relacionamentos[0]?.data || null,
            Profissional: relacionamentos[1]?.data || null,
            Produto: relacionamentos[2]?.data || null
          }
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
   * Verificar disponibilidade de horário
   */
  async verificarDisponibilidade(
    profissionalId: string,
    dataHoraInicio: string,
    dataHoraFim: string,
    excludeId?: string
  ): Promise<ApiResponse<boolean>> {
    try {
      let query = supabase
        .from('agendamentos')
        .select('id')
        .eq('profissional_id', profissionalId)
        .in('status', ['agendado', 'confirmado'])
        .or(`and(data_hora_inicio.lt.${dataHoraFim},data_hora_fim.gt.${dataHoraInicio})`);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data: conflitos, error } = await query;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      const disponivel = !conflitos || conflitos.length === 0;

      return {
        success: true,
        data: disponivel
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Buscar horários disponíveis de um profissional em uma data
   */
  async buscarHorariosDisponiveis(
    profissionalId: string,
    data: string,
    duracaoMinutos: number = 60
  ): Promise<ApiResponse<string[]>> {
    try {
      // Buscar profissional e horários de trabalho
      const { data: profissional, error: profError } = await supabase
        .from('profissionais')
        .select('horario_trabalho')
        .eq('id', profissionalId)
        .single();

      if (profError || !profissional) {
        return {
          success: false,
          error: 'Profissional não encontrado'
        };
      }

      // Buscar agendamentos existentes do dia
      const dataInicio = `${data}T00:00:00`;
      const dataFim = `${data}T23:59:59`;

      const { data: agendamentos, error: agendError } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio, data_hora_fim')
        .eq('profissional_id', profissionalId)
        .gte('data_hora_inicio', dataInicio)
        .lte('data_hora_inicio', dataFim)
        .in('status', ['agendado', 'confirmado']);

      if (agendError) {
        return {
          success: false,
          error: agendError.message
        };
      }

      // Determinar dia da semana
      const dataObj = new Date(data + 'T00:00:00');
      const diaSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][dataObj.getDay()];

      const horarioTrabalho = profissional.horario_trabalho[diaSemana];

      if (!horarioTrabalho || !horarioTrabalho.ativo) {
        return {
          success: true,
          data: []
        };
      }

      // Gerar slots de horários disponíveis
      const horariosDisponiveis: string[] = [];
      const inicio = this.timeToMinutes(horarioTrabalho.inicio);
      const fim = this.timeToMinutes(horarioTrabalho.fim);
      const intervaloInicio = horarioTrabalho.intervalo_inicio ? this.timeToMinutes(horarioTrabalho.intervalo_inicio) : null;
      const intervaloFim = horarioTrabalho.intervalo_fim ? this.timeToMinutes(horarioTrabalho.intervalo_fim) : null;

      for (let minuto = inicio; minuto + duracaoMinutos <= fim; minuto += 30) {
        // Pular intervalo de almoço
        if (intervaloInicio && intervaloFim) {
          if (minuto >= intervaloInicio && minuto < intervaloFim) {
            continue;
          }
        }

        const horaInicioSlot = this.minutesToTime(minuto);
        const horaFimSlot = this.minutesToTime(minuto + duracaoMinutos);

        // Verificar se não conflita com agendamentos existentes
        const dataHoraInicio = `${data}T${horaInicioSlot}:00`;
        const dataHoraFim = `${data}T${horaFimSlot}:00`;

        const conflito = agendamentos?.some(ag => {
          const agInicio = new Date(ag.data_hora_inicio).getTime();
          const agFim = new Date(ag.data_hora_fim).getTime();
          const slotInicio = new Date(dataHoraInicio).getTime();
          const slotFim = new Date(dataHoraFim).getTime();
          
          return (slotInicio < agFim && slotFim > agInicio);
        });

        if (!conflito) {
          horariosDisponiveis.push(horaInicioSlot);
        }
      }

      return {
        success: true,
        data: horariosDisponiveis
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar agendamento
   */
  async criar(dados: {
    clienteId: number;
    empresaId: number;
    leadId: string;
    profissionalId: string;
    produtoId: number;
    dataHoraInicio: string;
    dataHoraFim: string;
    // duracaoMinutos: REMOVIDO - é coluna gerada pelo banco
    valor: number;
    valorDesconto?: number;
    valorFinal: number;
    observacoes?: string;
    observacoesInternas?: string;
  }): Promise<ApiResponse<any>> {
    try {
      // Verificar disponibilidade
      const disponibilidadeCheck = await this.verificarDisponibilidade(
        dados.profissionalId,
        dados.dataHoraInicio,
        dados.dataHoraFim
      );

      if (!disponibilidadeCheck.success || !disponibilidadeCheck.data) {
        return {
          success: false,
          error: 'Horário não disponível. Já existe um agendamento neste período.'
        };
      }

      // IMPORTANTE: duracao_minutos é uma coluna GERADA (calculated)
      // O banco calcula automaticamente baseado em data_hora_inicio e data_hora_fim
      // NÃO enviar no insert!
      const { data, error } = await supabase
        .from('agendamentos')
        .insert({
          cliente_id: dados.clienteId,
          empresa_id: dados.empresaId,
          lead_id: dados.leadId,
          profissional_id: dados.profissionalId,
          produto_id: dados.produtoId,
          data_hora_inicio: dados.dataHoraInicio,
          data_hora_fim: dados.dataHoraFim,
          // duracao_minutos: REMOVIDO - é calculado pelo banco
          valor: dados.valor,
          valor_desconto: dados.valorDesconto || 0,
          valor_final: dados.valorFinal,
          status: 'agendado',
          confirmado: false,
          observacoes: dados.observacoes,
          observacoes_internas: dados.observacoesInternas
        })
        .select()
        .single();

      if (error) {
        logger.error('Erro ao criar agendamento', error);
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
   * Atualizar agendamento
   */
  async atualizar(
    agendamentoId: string,
    updates: any
  ): Promise<ApiResponse<any>> {
    try {
      // Se está atualizando horário, verificar disponibilidade
      if (updates.profissional_id && updates.data_hora_inicio && updates.data_hora_fim) {
        const disponibilidadeCheck = await this.verificarDisponibilidade(
          updates.profissional_id,
          updates.data_hora_inicio,
          updates.data_hora_fim,
          agendamentoId
        );

        if (!disponibilidadeCheck.success || !disponibilidadeCheck.data) {
          return {
            success: false,
            error: 'Horário não disponível. Já existe um agendamento neste período.'
          };
        }
      }

      const { data, error } = await supabase
        .from('agendamentos')
        .update(updates)
        .eq('id', agendamentoId)
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
   * Confirmar agendamento
   */
  async confirmar(agendamentoId: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .update({
          confirmado: true,
          confirmado_em: new Date().toISOString()
        })
        .eq('id', agendamentoId)
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
   * Cancelar agendamento
   */
  async cancelar(agendamentoId: string, motivo?: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('agendamentos')
        .update({
          status: 'cancelado',
          cancelado_em: new Date().toISOString(),
          motivo_cancelamento: motivo
        })
        .eq('id', agendamentoId)
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
   * Excluir agendamento
   */
  async excluir(agendamentoId: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .delete()
        .eq('id', agendamentoId);

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

  // Funções auxiliares
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
}

export const agendamentosService = new AgendamentosService();
