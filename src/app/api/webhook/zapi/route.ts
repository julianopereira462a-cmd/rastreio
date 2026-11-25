import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendZApiText, sendZApiImage } from '@/lib/zapi';
import { generateMultiMessageResponse, generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    service: 'Z-API Webhook Endpoint (AutoZap Engine)',
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

    // 1. Ignorar eventos de status que não sejam mensagens recebidas
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

    if (!incomingText || typeof incomingText !== 'string' || !incomingText.trim()) {
      return NextResponse.json({ status: 'empty_text' });
    }
    incomingText = incomingText.trim();

    // Fallback se o Supabase não estiver configurado
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ status: 'no_db_configured' });
    }

    // 6. Verificar Configurações Globais e Contato (Pausa / Desativação)
    const [{ data: sData }, { data: cData }] = await Promise.all([
      supabaseAdmin.from('system_settings').select('*').single(),
      supabaseAdmin.from('contacts').select('*').eq('wa_id', senderPhone).maybeSingle(),
    ]);

    const settings: SystemSettings = {
      id: sData?.id || '',
      company_name: sData?.company_name || 'Assessoria CNH',
      ai_tone: sData?.ai_tone || 'amigável e rápido',
      ai_persona: sData?.ai_persona || 'Atendente especializado',
      response_delay_seconds: sData?.response_delay_seconds ?? 1,
      typing_simulation_enabled: sData?.typing_simulation_enabled ?? true,
      max_response_length: sData?.max_response_length || 'médio',
      forbidden_topics: sData?.forbidden_topics || '',
      escalation_instructions: sData?.escalation_instructions || '',
      whatsapp_phone_number_id: sData?.whatsapp_phone_number_id || '',
      whatsapp_waba_id: sData?.whatsapp_waba_id || '',
      whatsapp_access_token: sData?.whatsapp_access_token || '',
      whatsapp_verify_token: sData?.whatsapp_verify_token || '',
      zapi_instance_id: sData?.zapi_instance_id || '',
      zapi_token: sData?.zapi_token || '',
      zapi_client_token: sData?.zapi_client_token || '',
      ai_provider: sData?.ai_provider || 'gemini',
      ai_api_key: sData?.ai_api_key || '',
      ai_model_name: sData?.ai_model_name || 'gemini-1.5-flash',
      is_automation_enabled: sData?.is_automation_enabled ?? true,
      updated_at: sData?.updated_at || new Date().toISOString(),
    };

    const isContactPaused = Boolean(cData?.is_automation_paused);

    if (settings.is_automation_enabled === false || isContactPaused) {
      return NextResponse.json({
        status: isContactPaused ? 'human_paused' : 'automation_disabled',
        message: 'Atendimento automatizado desativado ou pausado pelo operador.',
      });
    }

    // 7. Obter ou Criar Contato no Supabase
    let contactId = cData?.id;
    const cleanName =
      senderName && senderName !== 'Cliente' && senderName.trim().length > 0
        ? senderName.trim()
        : (cData?.name || senderPhone);

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
          last_interaction_at: new Date().toISOString(),
          ...(cData.name === cData.wa_id && cleanName !== senderPhone ? { name: cleanName } : {}),
        })
        .eq('id', contactId);
    }

    // 8. Obter ou Criar Conversa
    let conversationId: string | null = null;
    if (contactId) {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .maybeSingle();

      if (!conv) {
        const { data: newConv } = await supabaseAdmin
          .from('conversations')
          .insert({
            contact_id: contactId,
            status: 'active',
            last_message_preview: incomingText.slice(0, 100),
            last_message_at: new Date().toISOString(),
            unread_count: 0,
          })
          .select()
          .single();
        conversationId = newConv?.id || null;
      } else {
        conversationId = conv.id;
      }
    }

    // 9. Registrar esta Mensagem Recebida na Fila (status: 'pending')
    let messageRecordTime = new Date().toISOString();
    if (conversationId) {
      const { data: insertedMsg } = await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'contact',
          message_type: 'text',
          content: incomingText,
          status: 'pending',
        })
        .select('id, created_at')
        .single();

      if (insertedMsg?.created_at) {
        messageRecordTime = insertedMsg.created_at;
      }
    }

    // 10. DEBOUNCE INTELIGENTE (Agrupamento de Mensagens Consecutivas)
    // Se o cliente enviar 2, 3 ou 4 mensagens seguidas (ex: "Qual valor da AB ?" -> "e a física ?" -> "Vocês emitem ?"),
    // aguarda 1800ms para que todas as mensagens da rajada sejam salvas.
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // 11. Verificar se Chegou Mensagem Mais Nova Nesta Mesma Conversa
    if (conversationId) {
      const { data: newerMessages } = await supabaseAdmin
        .from('messages')
        .select('id, created_at')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'contact')
        .gt('created_at', messageRecordTime)
        .limit(1);

      if (newerMessages && newerMessages.length > 0) {
        // Uma mensagem mais recente chegou nessa mesma rajada.
        // A execução seguinte assumirá a resposta unificada sem duplicar.
        return NextResponse.json({
          status: 'buffered_into_sequence',
          message: 'Mensagem agrupada na sequência de mensagens consecutivas.',
          senderPhone,
        });
      }
    }

    // 12. Esta Execução é o Fim da Rajada: Processa Todas as Mensagens Pendentes
    let burstTexts: string[] = [incomingText];

    if (conversationId) {
      const { data: pendingMessages } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'contact')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (pendingMessages && pendingMessages.length > 0) {
        burstTexts = pendingMessages.map((m) => m.content).filter(Boolean);
        const pendingIds = pendingMessages.map((m) => m.id);
        // Marca todas como entregues para não serem reprocessadas
        await supabaseAdmin.from('messages').update({ status: 'delivered' }).in('id', pendingIds);
      }
    }

    // 13. Carregar FAQs Ativas, Base de Conhecimento e Histórico de Conversa
    const [{ data: fData }, { data: kData }, { data: historyData }] = await Promise.all([
      supabaseAdmin.from('faqs').select('*').eq('is_active', true).order('priority', { ascending: false }),
      supabaseAdmin.from('knowledge_base').select('*').eq('is_active', true),
      conversationId
        ? supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .neq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);

    const faqs = (fData || []) as FAQ[];
    const knowledgeBase = (kData || []) as KnowledgeItem[];
    const conversationHistory = ((historyData as any[]) || []).reverse() as Message[];

    // 14. Gerar Resposta Semântica Unificada (Multi-Perguntas)
    const aiResult = await generateMultiMessageResponse({
      incomingMessages: burstTexts,
      contactWaId: senderPhone,
      contactName: cleanName,
      conversationHistory,
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 15. Configurar Envio Z-API com Simulação Natural de Digitação (1 segundo)
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
      delayTyping: 1, // 1s digitando para rapidez máxima sem travamento
    };

    // 16. Enviar Foto (se houver mídia no FAQ respondido)
    if (aiResult.mediaToSend && aiResult.mediaToSend.url) {
      sendZApiImage(
        senderPhone,
        aiResult.mediaToSend.url,
        aiResult.mediaToSend.caption || aiResult.text.slice(0, 200),
        zapiConfig
      ).catch((err) => console.error('[Z-API] Erro ao enviar foto:', err));
    }

    // 17. Enviar Mensagem de Texto Unificada via Z-API
    let sendResult: any = null;
    if (aiResult.text) {
      sendResult = await sendZApiText(senderPhone, aiResult.text, zapiConfig);
    }

    // 18. Salvar Resposta do Bot no Banco e Atualizar Conversa
    if (conversationId && aiResult.text) {
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        message_type: 'text',
        content: aiResult.text,
        media_url: aiResult.mediaToSend?.url || null,
        status: sendResult?.success ? 'delivered' : 'sent',
      });

      await supabaseAdmin
        .from('conversations')
        .update({
          last_message_preview: aiResult.text.slice(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    // Registrar Log
    await supabaseAdmin.from('system_logs').insert({
      event_type: 'whatsapp_sent',
      level: sendResult?.success ? 'info' : 'warn',
      message: `Resposta enviada para ${senderPhone} (${burstTexts.length} msg(s) agrupadas)`,
      details: {
        senderPhone,
        burstTexts,
        reply: aiResult.text,
        matchedCount: aiResult.matchedFaqs?.length || (aiResult.matchedFaq ? 1 : 0),
        sendResult,
      },
    });

    return NextResponse.json({
      success: true,
      senderPhone,
      burstCount: burstTexts.length,
      burstTexts,
      reply: aiResult.text,
      matchedFaq: aiResult.matchedFaq?.question || null,
      matchedCount: aiResult.matchedFaqs?.length || (aiResult.matchedFaq ? 1 : 0),
      hasMedia: Boolean(aiResult.mediaToSend),
    });
  } catch (err: any) {
    console.error('[Z-API Webhook Error]', err);
    // Sempre retornar status 200 para a Z-API não acumular erros nem pausar webhook
    return NextResponse.json(
      { success: false, error: err?.message || 'internal_handled_error' },
      { status: 200 }
    );
  }
}
