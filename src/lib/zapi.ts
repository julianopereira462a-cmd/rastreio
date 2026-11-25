/**
 * Integração Oficial Z-API (Suporte Completo Z-API Clássica & Z-API Omni)
 */

interface ZApiConfig {
  instanceId?: string;
  token?: string;
  clientToken?: string;
  delayTyping?: number;
}

export async function sendZApiText(
  toPhone: string,
  message: string,
  config?: ZApiConfig
) {
  const instanceId = config?.instanceId || process.env.ZAPI_INSTANCE_ID;
  const token = config?.token || process.env.ZAPI_TOKEN;
  const clientToken = config?.clientToken || process.env.ZAPI_CLIENT_TOKEN;
  const delayTyping = config?.delayTyping ?? (message.length > 120 ? 3 : 2);

  if (!instanceId || !token) {
    console.warn('[Z-API] Credenciais não configuradas. Simulação ativa.');
    return { success: false, simulated: true, toPhone, message };
  }

  // Sanitizar telefone (apenas números)
  const cleanPhone = toPhone.replace(/\D/g, '');
  const isOmni = instanceId.length >= 24;

  const endpoints = isOmni
    ? [
        `https://api.omni.z-api.io/v1/channels/${instanceId}/messages`,
        `https://zapi.omni.z-api.io/channels/${instanceId}/token/${token}/send-text`,
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      ]
    : [
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        `https://zapi.omni.z-api.io/channels/${instanceId}/token/${token}/send-text`,
      ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (clientToken) {
    headers['Client-Token'] = clientToken;
  }

  for (const url of endpoints) {
    try {
      const isOmniDirect = url.includes('/v1/channels');
      const body = isOmniDirect
        ? {
            recipient: { identifier: cleanPhone },
            content: {
              type: 'TEXT',
              body: { message },
            },
            delayTyping,
            delay_typing: delayTyping,
          }
        : {
            phone: cleanPhone,
            message,
            delayTyping,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: true, data };
      }
    } catch (err) {
      console.warn(`[Z-API] Falha no endpoint ${url}, tentando próximo...`);
    }
  }

  return { success: false };
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
  const delayTyping = config?.delayTyping ?? 2;

  if (!instanceId || !token) {
    return { success: false, simulated: true, toPhone, imageUrl, caption };
  }

  const cleanPhone = toPhone.replace(/\D/g, '');
  const isOmni = instanceId.length >= 24;

  const endpoints = isOmni
    ? [
        `https://api.omni.z-api.io/v1/channels/${instanceId}/messages`,
        `https://zapi.omni.z-api.io/channels/${instanceId}/token/${token}/send-image`,
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`,
      ]
    : [
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`,
        `https://zapi.omni.z-api.io/channels/${instanceId}/token/${token}/send-image`,
      ];

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  if (clientToken) {
    headers['Client-Token'] = clientToken;
  }

  for (const url of endpoints) {
    try {
      const isOmniDirect = url.includes('/v1/channels');
      const body = isOmniDirect
        ? {
            recipient: { identifier: cleanPhone },
            content: {
              type: 'IMAGE',
              body: {
                url: imageUrl,
                caption: caption || '',
              },
            },
            delayTyping,
            delay_typing: delayTyping,
          }
        : {
            phone: cleanPhone,
            image: imageUrl,
            caption: caption || '',
            delayTyping,
          };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        return { success: true, data };
      }
    } catch (err) {
      console.warn(`[Z-API] Falha no envio de imagem para ${url}`);
    }
  }

  return { success: false };
}
