export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    return cleaned;
  }
  
  if (cleaned.length === 11 || cleaned.length === 10) {
    return `55${cleaned}`;
  }
  
  return cleaned;
}

export function formatPhoneWhatsApp(phone: string): string {
  const cleaned = formatPhone(phone);
  return `${cleaned}@c.us`;
}

export function extractPhoneFromWhatsApp(whatsappId: string): string {
  return whatsappId.replace('@c.us', '').replace('@g.us', '');
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}