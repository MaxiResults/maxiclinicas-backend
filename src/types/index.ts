export interface Lead {
  id: string;
  Cliente_ID: number;
  Empresa_ID: number;
  nome: string;
  telefone: string;
  whatsapp_id?: string;
  whatsapp_nome?: string;
  email?: string;
  status: 'novo' | 'qualificado' | 'convertido' | 'perdido';
  canal_origem?: string;
  campanha?: string;
  primeira_mensagem_at?: string;
  convertido_cliente: boolean;
  cliente_final_id?: string;
  profissional_responsavel_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ConversaSessao {
  id: string;
  Cliente_ID: number;
  Empresa_ID: number;
  lead_id: string;
  instancia_id?: string;
  whatsapp_id?: string;
  canal: string;
  status_sessao: 'ativa' | 'finalizada' | 'aguardando';
  data_inicio: string;
  ultima_interacao: string;
  total_mensagens: number;
  tipo_atendimento?: 'automatico' | 'humano' | 'hibrido';
  metadata?: Record<string, any>;
}

export interface ConversaHistorico {
  id: string;
  sessao_id: string;
  Cliente_ID: number;
  Empresa_ID: number;
  remetente: 'lead' | 'sistema' | 'atendente';
  mensagem: string;
  tipo_mensagem: 'texto' | 'audio' | 'imagem' | 'video';
  message_id?: string;
  status_entrega?: 'enviando' | 'enviado' | 'entregue' | 'lido';
  data_envio: string;
}

export interface ZApiWebhookMessage {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  chatName: string;
  text?: {
    message: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}