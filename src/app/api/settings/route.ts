import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { SystemSettings } from '@/types';

let memorySettings: SystemSettings = {
  id: '00000000-0000-0000-0000-000000000001',
  company_name: 'Assessoria Nacional CNH & Documentos',
  ai_tone: 'amigável, profissional, empático e resolutivo',
  ai_persona: 'Você é um atendente humano real da empresa. NUNCA diga que é um robô ou IA. Escreva no estilo do WhatsApp do Brasil, com frases curtas e quebras de linha agradáveis.',
  response_delay_seconds: 4,
  typing_simulation_enabled: true,
  max_response_length: 'médio',
  forbidden_topics: 'Não prometer prazos abaixo de 3 dias úteis, não oferecer descontos maiores que 5% sem autorização da gerência.',
  escalation_instructions: 'Quando o cliente solicitar atendente humano, diga com simpatia que um consultor já vai dar sequência no atendimento.',
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

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .single();

    if (!error && data) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json(memorySettings);
}

export async function POST(req: NextRequest) {
  try {
    const updates = await req.json();

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data);
      }
    }

    memorySettings = { ...memorySettings, ...updates, updated_at: new Date().toISOString() };
    return NextResponse.json(memorySettings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
