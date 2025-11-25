import { supabase } from '../config/supabase';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class ProdutosService {
  /**
   * Listar produtos
   */
  async listar(
    clienteId: number,
    empresaId: number,
    filtros?: {
      categoriaId?: string;
      grupoId?: string;
      tipo?: string;
      ativo?: boolean;
      busca?: string;
    }
  ): Promise<ApiResponse<any[]>> {
    try {
      let query = supabase
        .from('produtos')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (filtros?.categoriaId) {
        query = query.eq('categoria_id', filtros.categoriaId);
      }

      if (filtros?.grupoId) {
        query = query.eq('grupo_id', filtros.grupoId);
      }

      if (filtros?.tipo) {
        query = query.eq('tipo', filtros.tipo);
      }

      if (filtros?.ativo !== undefined) {
        query = query.eq('ativo', filtros.ativo);
      }

      if (filtros?.busca) {
        query = query.ilike('nome', `%${filtros.busca}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao listar produtos', error);
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
   * Buscar produto por ID (com variações)
   */
  async buscarPorId(produtoId: number): Promise<ApiResponse<any>> {
    try {
      // Buscar produto
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', produtoId)
        .single();

      if (produtoError) {
        return {
          success: false,
          error: produtoError.message
        };
      }

      // Buscar variações se tiver
      let variacoes = [];
      if (produto.tem_variacoes) {
        const { data: variacoesData, error: variacoesError } = await supabase
          .from('produtos_variacoes')
          .select('*')
          .eq('produto_id', produtoId)
          .order('ordem', { ascending: true });

        if (!variacoesError && variacoesData) {
          variacoes = variacoesData;
        }
      }

      return {
        success: true,
        data: {
          ...produto,
          variacoes
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Criar produto
   */
  async criar(dados: {
    clienteId: number;
    empresaId: number;
    nome: string;
    descricao?: string;
    categoriaId?: string;
    grupoId?: string;
    tipo: string;
    preco_venda?: number;
    preco_custo?: number;
    preco_promocional?: number;
    duracao_minutos?: number;
    sku?: string;
    imagem_url?: string;
    imagem_galeria?: any; // Array de URLs ou objeto JSON
    controla_estoque?: boolean;
    quantidade_estoque?: number;
    estoque_minimo?: number;
    tem_variacoes?: boolean;
    destaque?: boolean;
    variacoes?: any[];
  }): Promise<ApiResponse<any>> {
    try {
      // Preparar galeria de imagens
      let galeriaJson = null;
      if (dados.imagem_galeria) {
        if (Array.isArray(dados.imagem_galeria)) {
          // Se é array, converter para formato JSON
          galeriaJson = {
            principal: dados.imagem_url || dados.imagem_galeria[0] || null,
            galeria: dados.imagem_galeria
          };
        } else {
          // Se já é objeto, usar direto
          galeriaJson = dados.imagem_galeria;
        }
      }

      // Criar produto
      const { data: produto, error: produtoError } = await supabase
        .from('produtos')
        .insert({
          cliente_id: dados.clienteId,
          empresa_id: dados.empresaId,
          nome: dados.nome,
          slug: dados.nome.toLowerCase().replace(/\s+/g, '-'),
          descricao_curta: dados.descricao,
          categoria_id: dados.categoriaId,
          grupo_id: dados.grupoId,
          tipo_estoque: dados.tipo,
          preco_padrao: dados.preco_venda,
          preco_custo: dados.preco_custo,
          preco_promocional: dados.preco_promocional,
          sku: dados.sku,
          imagem_principal: dados.imagem_url,
          imagem_galeria: galeriaJson,
          controla_estoque: dados.controla_estoque ? 'sim' : 'nao',
          quantidade_estoque: dados.quantidade_estoque || 0,
          estoque_minimo: dados.estoque_minimo || 0,
          tem_variacoes: dados.tem_variacoes || false,
          destaque: dados.destaque || false,
          principal_destaque: dados.destaque || false,
          ativo: true,
          status: 'Ativo'
        })
        .select()
        .single();

      if (produtoError) {
        logger.error('Erro ao criar produto', produtoError);
        return {
          success: false,
          error: produtoError.message
        };
      }

      // Se tem variações, criar
      if (dados.tem_variacoes && dados.variacoes && dados.variacoes.length > 0) {
        const variacoesParaInserir = dados.variacoes.map((v, index) => ({
          produto_id: produto.id,
          nome: v.nome,
          preco_venda: v.preco_venda,
          preco_custo: v.preco_custo,
          preco_promocional: v.preco_promocional,
          duracao_minutos: v.duracao_minutos,
          quantidade_estoque: v.quantidade_estoque || 0,
          estoque_minimo: v.estoque_minimo || 0,
          imagem_url: v.imagem_url || null, // ← SUPORTE A IMAGEM POR VARIAÇÃO
          atributos: v.atributos || {},
          ordem: index,
          ativo: true
        }));

        const { error: variacoesError } = await supabase
          .from('produtos_variacoes')
          .insert(variacoesParaInserir);

        if (variacoesError) {
          logger.error('Erro ao criar variações', variacoesError);
          // Não retorna erro, produto já foi criado
        }
      }

      return {
        success: true,
        data: produto
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualizar produto
   */
  async atualizar(
    produtoId: number,
    updates: any,
    variacoes?: any[]
  ): Promise<ApiResponse<any>> {
    try {
      // Atualizar produto
      const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', produtoId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Se tem variações para atualizar
      if (variacoes !== undefined) {
        // Deletar variações antigas
        await supabase
          .from('produtos_variacoes')
          .delete()
          .eq('produto_id', produtoId);

        // Inserir novas variações
        if (variacoes.length > 0) {
          const variacoesParaInserir = variacoes.map((v, index) => ({
            produto_id: produtoId,
            nome: v.nome,
            preco_venda: v.preco_venda,
            preco_custo: v.preco_custo,
            preco_promocional: v.preco_promocional,
            duracao_minutos: v.duracao_minutos,
            quantidade_estoque: v.quantidade_estoque || 0,
            estoque_minimo: v.estoque_minimo || 0,
            atributos: v.atributos || {},
            ordem: index,
            ativo: true
          }));

          await supabase
            .from('produtos_variacoes')
            .insert(variacoesParaInserir);
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
   * Excluir produto
   */
  async excluir(produtoId: number): Promise<ApiResponse<void>> {
    try {
      // Verificar se tem agendamentos vinculados (futuro)
      // const { data: agendamentos } = await supabase...

      // Por enquanto, só deleta (cascade vai deletar variações)
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', produtoId);

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
   * Ativar/Desativar produto
   */
  async toggleAtivo(produtoId: number, ativo: boolean): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .update({ ativo })
        .eq('id', produtoId)
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

export const produtosService = new ProdutosService();