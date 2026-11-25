import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendZApiText, sendZApiImage } from '@/lib/zapi';
import { generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validar se é mensagem válida do WhatsApp
    // Ignorar mensagens de grupos ou enviadas por você mesmo
    if (body.fromMe || body.isGroup) {
      return NextResponse.json({ status: 'ignored_outgoing_or_group' });
    }

    const senderPhone = body.phone || body.senderPhone;
    if (!senderPhone) {
      return NextResponse.json({ status: 'no_phone' });
    }

    // Extrair texto da mensagem
    let incomingText = '';
    if (typeof body.text === 'string') {
      incomingText = body.text;
    } else if (body.text && body.text.message) {
      incomingText = body.text.message;
    } else if (body.image && body.image.caption) {
      incomingText = body.image.caption;
    } else if (body.body) {
      incomingText = body.body;
    }

    if (!incomingText) {
      return NextResponse.json({ status: 'empty_text' });
    }

    // 2. Carregar Configurações e Perguntas do Banco
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

    // 3. Gerar Resposta Inteligente com o Motor Semântico
    const aiResult = await generateAIWhatsAppResponse({
      incomingMessage: incomingText,
      contactWaId: senderPhone,
      contactName: body.senderName || 'Cliente',
      conversationHistory: [],
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    // 4. Configuração Z-API (lida das configurações ou variáveis)
    const zapiConfig = {
      instanceId: settings.zapi_instance_id || settings.whatsapp_phone_number_id || process.env.ZAPI_INSTANCE_ID,
      token: settings.zapi_token || settings.whatsapp_access_token || process.env.ZAPI_TOKEN,
      clientToken: settings.zapi_client_token || settings.whatsapp_verify_token || process.env.ZAPI_CLIENT_TOKEN,
    };

    // 5. Enviar Foto se houver mídia vinculada no FAQ
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

    // 6. Enviar Resposta de Texto via Z-API
    if (aiResult.text) {
      await sendZApiText(senderPhone, aiResult.text, zapiConfig);
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
