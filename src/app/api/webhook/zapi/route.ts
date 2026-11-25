import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendZApiText, sendZApiImage } from '@/lib/zapi';
import { generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Logar recebimento no banco de dados para rastreio
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('system_logs').insert({
          event_type: 'webhook_received',
          level: 'info',
          message: `Webhook Z-API acionado: ${body.event || 'mensagem'}`,
          details: body,
        });
      } catch (e) {
        console.error('Erro ao logar webhook:', e);
      }
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

    // 6. Carregar Configurações e FAQs do Banco de Dados
    let settings: any = {
      company_name: 'Assessoria CNH',
      ai_tone: 'amigável e rápido',
      response_delay_seconds: 2,
      is_automation_enabled: true,
      ai_provider: 'gemini',
      ai_api_key: '',
      ai_model_name: 'gemini-1.5-flash',
    };
    let faqs: FAQ[] = [];
    let knowledgeBase: KnowledgeItem[] = [];

    if (isSupabaseConfigured()) {
      const [{ data: sData }, { data: fData }, { data: kData }] = await Promise.all([
        supabaseAdmin.from('system_settings').select('*').single(),
        supabaseAdmin.from('faqs').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabaseAdmin.from('knowledge_base').select('*').eq('is_active', true),
      ]);

      if (sData) settings = { ...settings, ...sData };
      if (fData) faqs = fData as FAQ[];
      if (kData) knowledgeBase = kData as KnowledgeItem[];
    }

    // 7. Persistir Contato, Conversa e Mensagem Recebida no Banco de Dados
    let contactId: string | null = null;
    let conversationId: string | null = null;
    let isContactPaused = false;
    let conversationHistory: Message[] = [];

    if (isSupabaseConfigured()) {
      try {
        // 7.1 Buscar ou criar contato
        let { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('*')
          .eq('wa_id', senderPhone)
          .single();

        const cleanName = senderName && senderName !== 'Cliente' && senderName.trim().length > 0 ? senderName.trim() : senderPhone;

        if (!contact) {
          const { data: newContact } = await supabaseAdmin
            .from('contacts')
            .insert({
              wa_id: senderPhone,
              name: cleanName,
              last_interaction_at: new Date().toISOString(),
            })
            .select()
            .single();
          contact = newContact;
        } else {
          await supabaseAdmin
            .from('contacts')
            .update({
              name: contact.name && contact.name !== contact.wa_id ? contact.name : cleanName,
              last_interaction_at: new Date().toISOString(),
            })
            .eq('id', contact.id);
        }

        contactId = contact?.id || null;
        isContactPaused = Boolean(contact?.is_automation_paused);

        // 7.2 Buscar ou criar conversa
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
                status: isContactPaused ? 'paused_human' : 'active',
                last_message_preview: incomingText.slice(0, 100),
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
                last_message_preview: incomingText.slice(0, 100),
                last_message_at: new Date().toISOString(),
                status: isContactPaused ? 'paused_human' : conv.status,
              })
              .eq('id', conv.id);
          }

          conversationId = conv?.id || null;

          // 7.3 Registrar mensagem recebida do cliente
          if (conversationId) {
            await supabaseAdmin.from('messages').insert({
              conversation_id: conversationId,
              sender_type: 'contact',
              message_type: 'text',
              content: incomingText,
              status: 'delivered',
            });

            // Carregar mensagens anteriores para contexto da IA
            const { data: historyMsgs } = await supabaseAdmin
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })
              .limit(10);

            if (historyMsgs) conversationHistory = historyMsgs as Message[];
          }
        }
      } catch (dbErr) {
        console.error('[Z-API Webhook] Erro ao sincronizar contato/conversa:', dbErr);
      }
    }

    // 8. Checar se a automação está desativada globalmente OU pausada para este contato
    if (settings.is_automation_enabled === false || isContactPaused) {
      if (isSupabaseConfigured()) {
        try {
          await supabaseAdmin.from('system_logs').insert({
            event_type: 'webhook_received',
            level: 'info',
            message: isContactPaused
              ? 'Mensagem recebida, mas o robô está pausado para humano nesta conversa'
              : 'Mensagem recebida no WhatsApp, mas o robô está DESATIVADO no painel',
            details: { senderPhone, incomingText },
          });
        } catch (e) {}
      }
      return NextResponse.json({
        status: isContactPaused ? 'human_paused' : 'automation_disabled',
        message: 'Robô de atendimento desativado ou pausado pelo usuário.',
      });
    }

    // 9. Gerar Resposta Inteligente com o Motor Semântico & FAQs
    const aiResult = await generateAIWhatsAppResponse({
      incomingMessage: incomingText,
      contactWaId: senderPhone,
      contactName: senderName,
      conversationHistory,
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 10. Configuração da Z-API / Z-API Omni
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
    };

    // 11. Enviar Foto se houver mídia vinculada no FAQ
    if (aiResult.mediaToSend && aiResult.mediaToSend.url) {
      try {
        await sendZApiImage(
          senderPhone,
          aiResult.mediaToSend.url,
          aiResult.mediaToSend.caption || aiResult.text.slice(0, 200),
          zapiConfig
        );
      } catch (imgErr) {
        console.error('[Z-API] Erro ao enviar foto:', imgErr);
      }
    }

    // 12. Enviar Resposta de Texto via Z-API
    let sendResult: any = null;
    if (aiResult.text) {
      sendResult = await sendZApiText(senderPhone, aiResult.text, zapiConfig);
    }

    // 13. Salvar Mensagem Enviada pelo Robô no Banco de Dados
    if (conversationId && isSupabaseConfigured() && aiResult.text) {
      try {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'ai',
          message_type: 'text',
          content: aiResult.text,
          media_url: aiResult.mediaToSend?.url || null,
          status: sendResult?.success ? 'delivered' : 'pending',
        });

        await supabaseAdmin
          .from('conversations')
          .update({
            last_message_preview: aiResult.text.slice(0, 100),
            last_message_at: new Date().toISOString(),
            unread_count: 0,
          })
          .eq('id', conversationId);
      } catch (msgErr) {
        console.error('[Z-API Webhook] Erro ao registrar mensagem do robô:', msgErr);
      }
    }

    // 14. Registrar no System Logs
    if (isSupabaseConfigured()) {
      try {
        await supabaseAdmin.from('system_logs').insert({
          event_type: 'whatsapp_sent',
          level: sendResult?.success ? 'info' : 'warn',
          message: sendResult?.success ? 'Mensagem enviada com sucesso' : 'Tentativa de envio de mensagem',
          details: { senderPhone, reply: aiResult.text, sendResult },
        });
      } catch (e) {}
    }

    return NextResponse.json({
      success: true,
      senderPhone,
      reply: aiResult.text,
      matchedFaq: aiResult.matchedFaq?.question || null,
      hasMedia: Boolean(aiResult.mediaToSend),
    });
  } catch (err: any) {
    console.error('[Z-API Webhook Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
