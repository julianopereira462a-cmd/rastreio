/**
 * Integração Oficial Z-API (Conexão WhatsApp por QR Code)
 */

interface ZApiConfig {
  instanceId?: string;
  token?: string;
  clientToken?: string;
}

export async function sendZApiText(
  toPhone: string,
  message: string,
  config?: ZApiConfig
) {
  const instanceId = config?.instanceId || process.env.ZAPI_INSTANCE_ID;
  const token = config?.token || process.env.ZAPI_TOKEN;
  const clientToken = config?.clientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    console.warn('[Z-API] Credenciais não configuradas. Simulação ativa.');
    return { success: false, simulated: true, toPhone, message };
  }

  // Sanitizar telefone (apenas números)
  const cleanPhone = toPhone.replace(/\D/g, '');

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (clientToken) {
    headers['Client-Token'] = clientToken;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone: cleanPhone,
      message,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('[Z-API Error]', data);
    throw new Error(data?.message || 'Falha ao enviar mensagem pela Z-API');
  }

  return { success: true, data };
}

export async function sendZApiImage(
  toPhone: string,
  imageUrl: string,
  caption?: string,
  config?: ZApiConfig
) {
  const instanceId = config?.instanceId || process.env.ZAPI_INSTANCE_ID;
  const token = config?.token || process.env.ZAPI_TOKEN;
  const clientToken = config?.clientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return { success: false, simulated: true, toPhone, imageUrl, caption };
  }

  const cleanPhone = toPhone.replace(/\D/g, '');
  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (clientToken) {
    headers['Client-Token'] = clientToken;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phone: cleanPhone,
      image: imageUrl,
      caption: caption || '',
    }),
  });

  const data = await response.json();
  return { success: response.ok, data };
}
