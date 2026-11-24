import crypto from 'crypto';

interface SendMessageOptions {
  phoneNumberId?: string;
  accessToken?: string;
}

/**
 * Envia mensagem de texto via WhatsApp Cloud API oficial (Meta)
 */
export async function sendWhatsAppText(
  to: string,
  text: string,
  options?: SendMessageOptions
) {
  const phoneNumberId = options?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = options?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp API] Credenciais de envio não configuradas. Modo simulação ativo.');
    return { success: false, simulated: true, to, text };
  }

  // Sanitizar número: apenas dígitos
  const cleanPhone = to.replace(/\D/g, '');

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: text,
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[WhatsApp API] Erro ao enviar mensagem de texto:', data);
    throw new Error(data?.error?.message || 'Falha ao enviar mensagem pelo WhatsApp');
  }

  return { success: true, data };
}

/**
 * Envia imagem com legenda via WhatsApp Cloud API
 */
export async function sendWhatsAppImage(
  to: string,
  imageUrl: string,
  caption?: string,
  options?: SendMessageOptions
) {
  const phoneNumberId = options?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = options?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp API] Credenciais não configuradas para envio de imagem.');
    return { success: false, simulated: true, to, imageUrl, caption };
  }

  const cleanPhone = to.replace(/\D/g, '');

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption ? { caption } : {}),
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[WhatsApp API] Erro ao enviar imagem:', data);
    throw new Error(data?.error?.message || 'Falha ao enviar imagem no WhatsApp');
  }

  return { success: true, data };
}

/**
 * Envia documento PDF ou arquivo via WhatsApp Cloud API
 */
export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  filename?: string,
  caption?: string,
  options?: SendMessageOptions
) {
  const phoneNumberId = options?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = options?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return { success: false, simulated: true, to, documentUrl, filename };
  }

  const cleanPhone = to.replace(/\D/g, '');

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename || 'documento.pdf',
        ...(caption ? { caption } : {}),
      },
    }),
  });

  const data = await response.json();
  return { success: response.ok, data };
}

/**
 * Marca mensagem recebida como lida (dois tracinhos azuis)
 */
export async function markWhatsAppAsRead(
  messageId: string,
  options?: SendMessageOptions
) {
  const phoneNumberId = options?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = options?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) return;

  try {
    await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (err) {
    console.warn('[WhatsApp API] Falha ao marcar mensagem como lida:', err);
  }
}

/**
 * Validação segura de assinatura HMAC SHA256 do Webhook da Meta
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret) return true; // Em dev/teste sem secret definido, passa

  try {
    const [algo, signature] = signatureHeader.split('=');
    if (algo !== 'sha256' || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    console.error('[Webhook Signature Error]', err);
    return false;
  }
}
