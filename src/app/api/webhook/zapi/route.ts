import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendZApiText, sendZApiImage } from '@/lib/zapi';
import { generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    service: 'Z-API Webhook Endpoint',
    timestamp: new Date().toISOString(),
  });
}

export async function HEAD(req: NextRequest) {
  return new Response(null, { status: 200 });
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ status: 'empty_or_invalid_json' }, { status: 200 });
    }

    // 1. Ignorar apenas se for evento explícito de status (ex: MESSAGE_STATUS, MESSAGE_DELIVERY)
    if (body.event && body.event !== 'MESSAGE_RECEIVED') {
      return NextResponse.json({ status: 'ignored_event', event: body.event });
    }

    // 2. Validar se a mensagem foi enviada por nós mesmos ou se é de grupo
    const isFromMe =
      body.fromMe ||
      body.message?.fromMe ||
      body.message?.metadata?.from_me ||
      body.message?.contents?.[0]?.external_information?.from_me;

    const isGroup =
      body.isGroup ||
      body.message?.isGroup ||
      body.message?.chat?.isGroup ||
      body.chat?.isGroup;

    if (isFromMe || isGroup) {
      return NextResponse.json({ status: 'ignored_outgoing_or_group' });
    }

    // 3. Extrair Telefone do Remetente (Suporte a Z-API Clássica & Z-API Omni)
    const senderPhone =
      body.phone ||
      body.senderPhone ||
      body.message?.sender?.identifier ||
      body.message?.author?.identifier ||
      body.message?.chat?.identifier ||
      body.chat?.identifier;

    if (!senderPhone) {
      return NextResponse.json({ status: 'no_phone' });
    }

    // 4. Extrair Nome do Remetente
    const senderName =
      body.senderName ||
      body.message?.sender?.name ||
      body.message?.author?.name ||
      'Cliente';

    // 5. Extrair Texto da Mensagem
    let incomingText = '';
    if (body.message?.contents && Array.isArray(body.message.contents) && body.message.contents.length > 0) {
      const first = body.message.contents[0];
      if (typeof first.message === 'string') {
        incomingText = first.message;
      } else if (typeof first.text === 'string') {
        incomingText = first.text;
      } else if (first.caption) {
        incomingText = first.caption;
      }
    }

    if (!incomingText) {
      if (typeof body.text === 'string') {
        incomingText = body.text;
      } else if (body.text?.message) {
        incomingText = body.text.message;
      } else if (body.message?.content?.body?.message) {
        incomingText = body.message.content.body.message;
      } else if (body.message?.content?.body?.text) {
        incomingText = body.message.content.body.text;
      } else if (body.message?.content?.text) {
        incomingText = body.message.content.text;
      } else if (body.message?.content?.body?.caption) {
        incomingText = body.message.content.body.caption;
      } else if (body.image?.caption) {
        incomingText = body.image.caption;
      } else if (body.body) {
        incomingText = body.body;
      }
    }

    if (!incomingText) {
      return NextResponse.json({ status: 'empty_text' });
    }

    // Log assíncrono para não travar a resposta
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          await supabaseAdmin.from('system_logs').insert({
            event_type: 'webhook_received',
            level: 'info',
            message: `Webhook Z-API acionado: ${incomingText.slice(0, 50)}`,
            details: { senderPhone, incomingText, senderName },
          });
        } catch (e) {}
      })();
    }

    // 6. Carregamento em Paralelo Ultra-Rápido do Banco de Dados
    let settings: any = {
      company_name: 'Assessoria CNH',
      ai_tone: 'amigável e rápido',
      response_delay_seconds: 2,
      is_automation_enabled: true,
      typing_simulation_enabled: true,
      ai_provider: 'gemini',
      ai_api_key: '',
      ai_model_name: 'gemini-1.5-flash',
    };
    let faqs: FAQ[] = [];
    let knowledgeBase: KnowledgeItem[] = [];
    let existingContact: any = null;

    if (isSupabaseConfigured()) {
      const [{ data: sData }, { data: fData }, { data: kData }, { data: cData }] = await Promise.all([
        supabaseAdmin.from('system_settings').select('*').single(),
        supabaseAdmin.from('faqs').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabaseAdmin.from('knowledge_base').select('*').eq('is_active', true),
        supabaseAdmin.from('contacts').select('*').eq('wa_id', senderPhone).single(),
      ]);

      if (sData) settings = { ...settings, ...sData };
      if (fData) faqs = fData as FAQ[];
      if (kData) knowledgeBase = kData as KnowledgeItem[];
      if (cData) existingContact = cData;
    }

    // 7. Checar se a automação está desativada globalmente OU pausada para este contato
    const isContactPaused = Boolean(existingContact?.is_automation_paused);

    if (settings.is_automation_enabled === false || isContactPaused) {
      return NextResponse.json({
        status: isContactPaused ? 'human_paused' : 'automation_disabled',
        message: 'Robô de atendimento desativado ou pausado pelo usuário.',
      });
    }

    // 8. Gerar Resposta Inteligente com o Motor Semântico & FAQs (instantâneo: < 1ms)
    const aiResult = await generateAIWhatsAppResponse({
      incomingMessage: incomingText,
      contactWaId: senderPhone,
      contactName: senderName,
      conversationHistory: [],
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 9. Calcular tempo natural de "Digitando..." proporcional ao tamanho da resposta
    const responseLen = aiResult.text ? aiResult.text.length : 50;
    const typingSeconds =
      settings.typing_simulation_enabled !== false
        ? Math.min(4, Math.max(2, Math.round(responseLen / 70)))
        : 1;

    // 10. Configuração da Z-API / Z-API Omni com delayTyping ("digitando...")
    const channelId =
      body.channelId ||
      body.message?.channel_id ||
      settings.zapi_instance_id ||
      settings.whatsapp_phone_number_id ||
      process.env.ZAPI_INSTANCE_ID;

    const zapiConfig = {
      instanceId: channelId,
      token: settings.zapi_token || settings.whatsapp_access_token || process.env.ZAPI_TOKEN,
      clientToken: settings.zapi_client_token || settings.whatsapp_verify_token || process.env.ZAPI_CLIENT_TOKEN,
      delayTyping: typingSeconds, // Exibe "digitando..." por 2 a 3 segundos antes da entrega!
    };

    // 11. Enviar Foto se houver mídia vinculada no FAQ
    if (aiResult.mediaToSend && aiResult.mediaToSend.url) {
      sendZApiImage(
        senderPhone,
        aiResult.mediaToSend.url,
        aiResult.mediaToSend.caption || aiResult.text.slice(0, 200),
        zapiConfig
      ).catch((err) => console.error('[Z-API] Erro ao enviar foto:', err));
    }

    // 12. Enviar Resposta de Texto via Z-API (Dispara IMEDIATAMENTE com digitando...)
    let sendResult: any = null;
    if (aiResult.text) {
      sendResult = await sendZApiText(senderPhone, aiResult.text, zapiConfig);
    }

    // 13. Persistir Contato, Conversa e Mensagens no Banco em segundo plano
    if (isSupabaseConfigured()) {
      (async () => {
        try {
          const cleanName =
            senderName && senderName !== 'Cliente' && senderName.trim().length > 0
              ? senderName.trim()
              : senderPhone;

          let contactId = existingContact?.id;

          if (!contactId) {
            const { data: newContact } = await supabaseAdmin
              .from('contacts')
              .insert({
                wa_id: senderPhone,
                name: cleanName,
                last_interaction_at: new Date().toISOString(),
              })
              .select()
              .single();
            contactId = newContact?.id;
          } else {
            await supabaseAdmin
              .from('contacts')
              .update({
                name: existingContact.name && existingContact.name !== existingContact.wa_id ? existingContact.name : cleanName,
                last_interaction_at: new Date().toISOString(),
              })
              .eq('id', contactId);
          }

          if (contactId) {
            let { data: conv } = await supabaseAdmin
              .from('conversations')
              .select('*')
              .eq('contact_id', contactId)
              .single();

            if (!conv) {
              const { data: newConv } = await supabaseAdmin
                .from('conversations')
                .insert({
                  contact_id: contactId,
                  status: 'active',
                  last_message_preview: aiResult.text ? aiResult.text.slice(0, 100) : incomingText.slice(0, 100),
                  last_message_at: new Date().toISOString(),
                  unread_count: 0,
                })
                .select()
                .single();
              conv = newConv;
            } else {
              await supabaseAdmin
                .from('conversations')
                .update({
                  last_message_preview: aiResult.text ? aiResult.text.slice(0, 100) : incomingText.slice(0, 100),
                  last_message_at: new Date().toISOString(),
                })
                .eq('id', conv.id);
            }

            const conversationId = conv?.id;

            if (conversationId) {
              // Gravar mensagem do cliente
              await supabaseAdmin.from('messages').insert({
                conversation_id: conversationId,
                sender_type: 'contact',
                message_type: 'text',
                content: incomingText,
                status: 'delivered',
              });

              // Gravar resposta do robô
              if (aiResult.text) {
                await supabaseAdmin.from('messages').insert({
                  conversation_id: conversationId,
                  sender_type: 'ai',
                  message_type: 'text',
                  content: aiResult.text,
                  media_url: aiResult.mediaToSend?.url || null,
                  status: sendResult?.success ? 'delivered' : 'pending',
                });
              }
            }
          }

          // Registrar no System Logs
          await supabaseAdmin.from('system_logs').insert({
            event_type: 'whatsapp_sent',
            level: sendResult?.success ? 'info' : 'warn',
            message: sendResult?.success ? 'Mensagem enviada com sucesso (com digitando...)' : 'Tentativa de envio',
            details: { senderPhone, reply: aiResult.text, delayTyping: typingSeconds, sendResult },
          });
        } catch (dbErr) {
          console.error('[Async DB Sync Error]', dbErr);
        }
      })().catch(() => {});
    }

    return NextResponse.json({
      success: true,
      senderPhone,
      reply: aiResult.text,
      delayTyping: typingSeconds,
      matchedFaq: aiResult.matchedFaq?.question || null,
      hasMedia: Boolean(aiResult.mediaToSend),
    });
  } catch (err: any) {
    console.error('[Z-API Webhook Error]', err);
    // Sempre retornar status 200 para a Z-API não marcar o webhook como falho nem reenviar em loop
    return NextResponse.json({ success: false, error: err?.message || 'internal_handled_error' }, { status: 200 });
  }
}
