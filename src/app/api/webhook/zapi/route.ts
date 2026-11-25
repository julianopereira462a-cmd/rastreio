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
      await supabaseAdmin.from('system_logs').insert({
        event_type: 'webhook_received',
        level: 'info',
        message: 'Webhook Z-API acionado',
        details: body,
      }).catch((e) => console.error('Erro ao logar webhook:', e));
    }

    // 1. Validar se a mensagem foi enviada por nós mesmos ou se é de grupo
    const isFromMe = body.fromMe || body.message?.fromMe;
    const isGroup = body.isGroup || body.message?.isGroup || body.chat?.isGroup;
    if (isFromMe || isGroup) {
      return NextResponse.json({ status: 'ignored_outgoing_or_group' });
    }

    // 2. Extrair Telefone do Remetente (Suporte a Z-API Clássica & Z-API Omni)
    const senderPhone =
      body.phone ||
      body.senderPhone ||
      body.message?.author?.identifier ||
      body.message?.chat?.identifier ||
      body.chat?.identifier;

    if (!senderPhone) {
      return NextResponse.json({ status: 'no_phone' });
    }

    // 3. Extrair Nome do Remetente
    const senderName =
      body.senderName ||
      body.message?.author?.name ||
      'Cliente';

    // 4. Extrair Texto da Mensagem
    let incomingText = '';
    if (typeof body.text === 'string') {
      incomingText = body.text;
    } else if (body.text?.message) {
      incomingText = body.text.message;
    } else if (body.message?.content?.body?.message) {
      incomingText = body.message.content.body.message;
    } else if (body.message?.content?.body?.caption) {
      incomingText = body.message.content.body.caption;
    } else if (body.image?.caption) {
      incomingText = body.image.caption;
    } else if (body.body) {
      incomingText = body.body;
    }

    if (!incomingText) {
      return NextResponse.json({ status: 'empty_text' });
    }

    // 5. Carregar Configurações e FAQs do Banco de Dados
    let settings: any = {
      company_name: 'Minha Empresa',
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

    // 6. Gerar Resposta Inteligente com o Motor Semântico & FAQs
    const aiResult = await generateAIWhatsAppResponse({
      incomingMessage: incomingText,
      contactWaId: senderPhone,
      contactName: senderName,
      conversationHistory: [],
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 7. Configuração da Z-API / Z-API Omni
    const zapiConfig = {
      instanceId: settings.zapi_instance_id || settings.whatsapp_phone_number_id || process.env.ZAPI_INSTANCE_ID,
      token: settings.zapi_token || settings.whatsapp_access_token || process.env.ZAPI_TOKEN,
      clientToken: settings.zapi_client_token || settings.whatsapp_verify_token || process.env.ZAPI_CLIENT_TOKEN,
    };

    // 8. Enviar Foto se houver mídia vinculada no FAQ
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

    // 9. Enviar Resposta de Texto via Z-API
    let sendResult: any = null;
    if (aiResult.text) {
      sendResult = await sendZApiText(senderPhone, aiResult.text, zapiConfig);
    }

    if (isSupabaseConfigured()) {
      await supabaseAdmin.from('system_logs').insert({
        event_type: 'whatsapp_sent',
        level: sendResult?.success ? 'info' : 'warn',
        message: sendResult?.success ? 'Mensagem enviada com sucesso' : 'Tentativa de envio de mensagem',
        details: { senderPhone, reply: aiResult.text, sendResult },
      }).catch(() => {});
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
