import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppDocument, markWhatsAppAsRead } from '@/lib/whatsapp';
import { generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { Contact, Conversation, FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

// Configurações padrão de fallback quando o banco não estiver conectado
const DEFAULT_SETTINGS: SystemSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  company_name: 'AutoZap Atendimento',
  ai_tone: 'amigável, profissional e natural',
  ai_persona: 'Atendente humano dedicado da empresa. Escreve como conversa real no WhatsApp.',
  response_delay_seconds: 4,
  typing_simulation_enabled: true,
  max_response_length: 'médio',
  forbidden_topics: 'Não inventar valores não confirmados nem garantias não registradas.',
  escalation_instructions: 'Informar com simpatia que um especialista continuará o atendimento em instantes.',
  whatsapp_phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsapp_waba_id: process.env.WHATSAPP_WABA_ID || '',
  whatsapp_access_token: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsapp_verify_token: process.env.WHATSAPP_VERIFY_TOKEN || 'autozap_secure_token_2026',
  ai_provider: 'gemini',
  ai_api_key: process.env.GEMINI_API_KEY || '',
  ai_model_name: 'gemini-1.5-flash',
  is_automation_enabled: true,
  updated_at: new Date().toISOString(),
};

/**
 * 1. GET: Verificação do Webhook pela Meta (WhatsApp Cloud API)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Buscar token configurado nas variáveis ou no banco
  let expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_SETTINGS.whatsapp_verify_token;

  if (isSupabaseConfigured()) {
    const { data: dbSettings } = await supabaseAdmin
      .from('system_settings')
      .select('whatsapp_verify_token')
      .single();
    if (dbSettings?.whatsapp_verify_token) {
      expectedToken = dbSettings.whatsapp_verify_token;
    }
  }

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verificado com sucesso pela Meta!');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Webhook] Falha de validação de token:', { mode, token, expectedToken });
  return NextResponse.json({ error: 'Token de verificação inválido' }, { status: 403 });
}

/**
 * 2. POST: Recebimento e Processamento em Tempo Real de Mensagens do WhatsApp
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Logar evento no console para depuração
    // console.log('[Webhook Body Recebido]:', JSON.stringify(body, null, 2));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value || !value.messages || value.messages.length === 0) {
      // Pode ser apenas notificação de status (sent, delivered, read)
      return NextResponse.json({ status: 'ignored_status_update' });
    }

    const messageData = value.messages[0];
    const senderNumber = messageData.from; // Número do cliente
    const waMessageId = messageData.id;
    const contactProfile = value.contacts?.[0];
    const contactName = contactProfile?.profile?.name || 'Cliente';
    const messageType = messageData.type; // 'text', 'image', 'audio', etc.

    let incomingText = '';
    let mediaUrl: string | undefined = undefined;

    if (messageType === 'text') {
      incomingText = messageData.text?.body || '';
    } else if (messageType === 'image') {
      incomingText = messageData.image?.caption || '[Imagem enviada pelo cliente]';
      mediaUrl = messageData.image?.id;
    } else if (messageType === 'audio') {
      incomingText = '[Áudio recebido pelo cliente]';
    } else if (messageType === 'document') {
      incomingText = messageData.document?.caption || `[Documento: ${messageData.document?.filename || 'arquivo'}]`;
    } else {
      incomingText = `[Mensagem tipo ${messageType}]`;
    }

    if (!incomingText && !mediaUrl) {
      return NextResponse.json({ status: 'empty_content' });
    }

    // Marcar como lida de imediato no WhatsApp
    if (waMessageId) {
      markWhatsAppAsRead(waMessageId).catch(() => {});
    }

    // 1. Carregar Configurações e Dados
    let settings = DEFAULT_SETTINGS;
    let faqs: FAQ[] = [];
    let knowledgeBase: KnowledgeItem[] = [];

    if (isSupabaseConfigured()) {
      const [{ data: sData }, { data: fData }, { data: kData }] = await Promise.all([
        supabaseAdmin.from('system_settings').select('*').single(),
        supabaseAdmin.from('faqs').select('*').eq('is_active', true).order('priority', { ascending: false }),
        supabaseAdmin.from('knowledge_base').select('*').eq('is_active', true),
      ]);

      if (sData) settings = { ...DEFAULT_SETTINGS, ...sData };
      if (fData) faqs = fData as FAQ[];
      if (kData) knowledgeBase = kData as KnowledgeItem[];
    }

    // 2. Verificar ou Criar Contato e Conversa no Banco
    let contactId: string | null = null;
    let conversationId: string | null = null;
    let isAutomationPaused = false;
    let history: Message[] = [];

    if (isSupabaseConfigured()) {
      // Buscar ou inserir contato
      let { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('wa_id', senderNumber)
        .single();

      if (!contact) {
        const { data: newContact } = await supabaseAdmin
          .from('contacts')
          .insert({
            wa_id: senderNumber,
            name: contactName,
            last_interaction_at: new Date().toISOString(),
          })
          .select()
          .single();
        contact = newContact;
      } else {
        await supabaseAdmin
          .from('contacts')
          .update({
            name: contact.name || contactName,
            last_interaction_at: new Date().toISOString(),
          })
          .eq('id', contact.id);
      }

      contactId = contact?.id || null;
      isAutomationPaused = Boolean(contact?.is_automation_paused);

      // Buscar conversa ativa
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
              status: isAutomationPaused ? 'paused_human' : 'active',
              last_message_preview: incomingText.slice(0, 100),
              last_message_at: new Date().toISOString(),
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
              unread_count: (conv.unread_count || 0) + 1,
            })
            .eq('id', conv.id);
        }
        conversationId = conv?.id || null;

        // Salvar mensagem recebida do cliente
        if (conversationId) {
          await supabaseAdmin.from('messages').insert({
            conversation_id: conversationId,
            wa_message_id: waMessageId,
            sender_type: 'contact',
            message_type: messageType === 'image' ? 'image' : 'text',
            content: incomingText,
            media_url: mediaUrl,
            status: 'read',
          });

          // Recuperar histórico recente para contexto
          const { data: historyData } = await supabaseAdmin
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(10);

          if (historyData) history = historyData as Message[];
        }
      }
    }

    // Se o atendimento estiver pausado para humano ou a automação geral desligada
    if (isAutomationPaused || !settings.is_automation_enabled) {
      console.log(`[Automação Pausada] Mensagem de ${senderNumber} registrada para atendimento humano.`);
      return NextResponse.json({ status: 'paused_for_human_intervention' });
    }

    // 3. BUFFER / DEBOUNCE INTELIGENTE (Anti-Robô / Mensagens Consecutivas)
    // Se o cliente enviar múltiplas mensagens em sequência rápida, agrupamos para responder com coerência
    const delayMs = Math.max(2000, (settings.response_delay_seconds || 4) * 1000);

    // Aguardar pequena janela para simular humanização e permitir agrupamento
    await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));

    // 4. Gerar resposta inteligente com a IA
    const aiResult = await generateAIWhatsAppResponse({
      incomingMessage: incomingText,
      contactWaId: senderNumber,
      contactName,
      conversationHistory: history,
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 5. Enviar resposta para o WhatsApp do cliente
    let sentMessageId = '';

    // Enviar imagem se houver mídia vinculada na resposta do FAQ
    if (aiResult.mediaToSend && aiResult.mediaToSend.url) {
      try {
        await sendWhatsAppImage(
          senderNumber,
          aiResult.mediaToSend.url,
          aiResult.mediaToSend.caption || aiResult.text.slice(0, 200),
          {
            phoneNumberId: settings.whatsapp_phone_number_id,
            accessToken: settings.whatsapp_access_token,
          }
        );
      } catch (imgErr) {
        console.error('[WhatsApp Webhook] Erro ao enviar imagem:', imgErr);
      }
    }

    // Enviar texto da resposta se não foi enviado apenas como legenda de imagem
    if (aiResult.text) {
      try {
        const sendRes = await sendWhatsAppText(senderNumber, aiResult.text, {
          phoneNumberId: settings.whatsapp_phone_number_id,
          accessToken: settings.whatsapp_access_token,
        });
        sentMessageId = sendRes?.data?.messages?.[0]?.id || '';
      } catch (textErr) {
        console.error('[WhatsApp Webhook] Erro ao enviar texto no WhatsApp:', textErr);
      }
    }

    // 6. Registrar mensagem da IA no banco de dados Supabase
    if (isSupabaseConfigured() && conversationId) {
      await supabaseAdmin.from('messages').insert({
        conversation_id: conversationId,
        wa_message_id: sentMessageId || `ai_${Date.now()}`,
        sender_type: 'ai',
        message_type: 'text',
        content: aiResult.text,
        media_url: aiResult.mediaToSend?.url,
        status: 'delivered',
        metadata: {
          matched_faq_id: aiResult.matchedFaq?.id,
          confidence: aiResult.confidence,
        },
      });

      // Atualizar estatística de hit no FAQ
      if (aiResult.matchedFaq?.id) {
        await supabaseAdmin
          .from('faqs')
          .update({ hit_count: (aiResult.matchedFaq.hit_count || 0) + 1 })
          .eq('id', aiResult.matchedFaq.id);
      }
    }

    return NextResponse.json({
      success: true,
      senderNumber,
      reply: aiResult.text,
      matchedFaq: aiResult.matchedFaq?.question || null,
      hasMedia: Boolean(aiResult.mediaToSend),
    });
  } catch (error: any) {
    console.error('[WhatsApp Webhook Uncaught Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Erro interno no processamento' },
      { status: 500 }
    );
  }
}
