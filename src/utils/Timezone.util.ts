/**
 * Utilitário de Timezone
 * 
 * REGRAS:
 * 1. Backend sempre trabalha em UTC
 * 2. Banco sempre armazena em UTC (TIMESTAMPTZ)
 * 3. Frontend converte para timezone local
 * 4. API aceita ISO 8601 com timezone
 */

/**
 * Timezone padrão do sistema (Brasil)
 */
export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte data/hora de timezone local para UTC
 * 
 * @param dateString - Data no formato "YYYY-MM-DD"
 * @param timeString - Hora no formato "HH:MM"
 * @param timezone - Timezone (default: America/Sao_Paulo)
 * @returns ISO string em UTC
 * 
 * @example
 * localToUTC("2025-11-28", "08:00", "America/Sao_Paulo")
 * // Returns: "2025-11-28T11:00:00.000Z"
 */
export function localToUTC(
  dateString: string,
  timeString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  // Criar string no formato ISO sem timezone
  const localDateTime = `${dateString}T${timeString}:00`;
  
  // Parsear considerando o timezone especificado
  // Usar Intl.DateTimeFormat para garantir conversão correta
  const date = new Date(localDateTime);
  
  // Ajustar para o timezone correto
  const offsetMinutes = getTimezoneOffset(timezone, date);
  const utcTime = date.getTime() - (offsetMinutes * 60 * 1000);
  
  return new Date(utcTime).toISOString();
}

/**
 * Converte ISO string UTC para timezone local
 * 
 * @param isoString - Data em formato ISO UTC
 * @param timezone - Timezone (default: America/Sao_Paulo)
 * @returns Objeto com data e hora locais
 * 
 * @example
 * utcToLocal("2025-11-28T11:00:00.000Z", "America/Sao_Paulo")
 * // Returns: { date: "2025-11-28", time: "08:00" }
 */
export function utcToLocal(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE
): { date: string; time: string; datetime: string } {
  const date = new Date(isoString);
  
  // Formatar para o timezone especificado
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(date);
  const dateParts: any = {};
  parts.forEach(part => {
    dateParts[part.type] = part.value;
  });
  
  const dateStr = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
  const timeStr = `${dateParts.hour}:${dateParts.minute}`;
  
  return {
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr}T${timeStr}:00`
  };
}

/**
 * Valida se uma string está em formato ISO 8601 válido
 * 
 * @param isoString - String para validar
 * @returns true se válido
 */
export function isValidISOString(isoString: string): boolean {
  if (!isoString) return false;
  
  const date = new Date(isoString);
  return !isNaN(date.getTime());
}

/**
 * Normaliza data/hora para UTC
 * Aceita múltiplos formatos e sempre retorna UTC
 * 
 * @param input - Data em qualquer formato (ISO, Date, string)
 * @param timezone - Timezone de origem se não especificado no input
 * @returns ISO string em UTC
 */
export function normalizeToUTC(
  input: string | Date,
  timezone: string = DEFAULT_TIMEZONE
): string {
  if (input instanceof Date) {
    return input.toISOString();
  }
  
  // Se já tem timezone (Z ou +/-), usar direto
  if (input.includes('Z') || input.includes('+') || input.includes('-')) {
    return new Date(input).toISOString();
  }
  
  // Se é formato "YYYY-MM-DDTHH:MM:SS" sem timezone
  // Assumir que é no timezone especificado
  const date = new Date(input);
  const offsetMinutes = getTimezoneOffset(timezone, date);
  const utcTime = date.getTime() - (offsetMinutes * 60 * 1000);
  
  return new Date(utcTime).toISOString();
}

/**
 * Calcula offset de timezone em minutos
 * 
 * @param timezone - Timezone (ex: "America/Sao_Paulo")
 * @param date - Data de referência
 * @returns Offset em minutos
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  // Obter offset do timezone especificado
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60);
}

/**
 * Formata data para exibição em português
 * 
 * @param isoString - Data em formato ISO
 * @param timezone - Timezone para exibição
 * @returns Data formatada
 */
export function formatDateBR(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formata hora para exibição
 * 
 * @param isoString - Data em formato ISO
 * @param timezone - Timezone para exibição
 * @returns Hora formatada (HH:MM)
 */
export function formatTimeBR(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Formata data e hora completa
 * 
 * @param isoString - Data em formato ISO
 * @param timezone - Timezone para exibição
 * @returns Data e hora formatadas
 */
export function formatDateTimeBR(
  isoString: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const date = formatDateBR(isoString, timezone);
  const time = formatTimeBR(isoString, timezone);
  
  return `${date} às ${time}`;
}