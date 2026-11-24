import { NextRequest, NextResponse } from 'next/server';
import { generateAIWhatsAppResponse } from '@/lib/ai-engine';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [], clientName = 'Cliente Teste' } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    // Carregar configurações reais do banco ou padrões
    let settings: SystemSettings = {
      id: 'default',
      company_name: 'Assessoria Nacional CNH & Documentos',
      ai_tone: 'amigável, profissional, empático e resolutivo',
      ai_persona: 'Você é um atendente humano dedicado da empresa. NUNCA diga que é um robô ou inteligência artificial. Escreva como conversa real no WhatsApp, usando linguagem brasileira, clara e simpática. Nunca invente preços ou prazos.',
      response_delay_seconds: 3,
      typing_simulation_enabled: true,
      max_response_length: 'médio',
      forbidden_topics: 'Não prometer aprovação imediata sem laudo, não inventar descontos não cadastrados.',
      escalation_instructions: 'Informar com gentileza que um consultor entrará em contato.',
      whatsapp_phone_number_id: '',
      whatsapp_waba_id: '',
      whatsapp_access_token: '',
      whatsapp_verify_token: 'autozap_secure_token_2026',
      ai_provider: 'gemini',
      ai_api_key: process.env.GEMINI_API_KEY || '',
      ai_model_name: 'gemini-1.5-flash',
      is_automation_enabled: true,
      updated_at: new Date().toISOString(),
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
      if (fData && fData.length > 0) faqs = fData as FAQ[];
      if (kData && kData.length > 0) knowledgeBase = kData as KnowledgeItem[];
    } else {
      // Usar perguntas padrão de teste
      faqs = [
        {
          id: 'f1',
          question: 'Qual o valor da CNH Digital?',
          question_variations: ['quanto custa cnh digital', 'preço cnh digital', 'valor da renovação'],
          keywords: ['preço', 'valor', 'quanto custa', 'cnh', 'digital'],
          answer: 'O valor da CNH Digital começa a partir de R$ 450,00 à vista no PIX, ou em até 12x no cartão de crédito. Esse valor já inclui a assessoria completa e o acompanhamento até a emissão no aplicativo.',
          media_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
          media_type: 'image',
          media_caption: 'Tabela de serviços e valores atualizados da CNH Digital',
          priority: 10,
          is_active: true,
          hit_count: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'f2',
          question: 'Quais documentos são necessários?',
          question_variations: ['o que preciso enviar', 'documentos que precisa'],
          keywords: ['documentos', 'rg', 'cpf', 'comprovante', 'preciso'],
          answer: 'Você só vai precisar de foto nítida do seu RG ou CNH anterior, CPF e comprovante de endereço recente (máximo 90 dias). Você pode me mandar as fotos diretamente aqui pelo WhatsApp!',
          priority: 9,
          is_active: true,
          hit_count: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }

    const conversationHistory: Message[] = history.map((h: any, i: number) => ({
      id: `sim_h_${i}`,
      conversation_id: 'sim_conv',
      sender_type: h.sender === 'client' ? 'contact' : 'ai',
      message_type: 'text',
      content: h.text,
      status: 'read',
      created_at: new Date().toISOString(),
    }));

    // Simular o delay de digitação configurado (ex: 1 a 2 segundos para o simulador ficar fluido e responsivo)
    const simulatedDelay = Math.min(settings.response_delay_seconds * 400, 2500);
    await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

    const result = await generateAIWhatsAppResponse({
      incomingMessage: message,
      contactWaId: '5511999999999',
      contactName: clientName,
      conversationHistory,
      settings,
      availableFaqs: faqs,
      knowledgeBase,
    });

    return NextResponse.json({
      text: result.text,
      matchedFaq: result.matchedFaq ? result.matchedFaq.question : null,
      mediaToSend: result.mediaToSend || null,
      confidence: result.confidence,
      delaySimulatedMs: simulatedDelay,
    });
  } catch (err: any) {
    console.error('[Simulate Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
