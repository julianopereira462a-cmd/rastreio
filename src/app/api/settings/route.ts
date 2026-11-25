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
  zapi_instance_id: process.env.ZAPI_INSTANCE_ID || '',
  zapi_token: process.env.ZAPI_TOKEN || '',
  zapi_client_token: process.env.ZAPI_CLIENT_TOKEN || '',
  ai_provider: 'gemini',
  ai_api_key: process.env.GEMINI_API_KEY || '',
  ai_model_name: 'gemini-1.5-flash',
  is_automation_enabled: true,
  updated_at: new Date().toISOString(),
};

function formatSettingsResponse(data: any): SystemSettings {
  return {
    ...data,
    zapi_instance_id: data.zapi_instance_id || data.whatsapp_phone_number_id || '',
    zapi_token: data.zapi_token || data.whatsapp_access_token || '',
    zapi_client_token: data.zapi_client_token || data.whatsapp_verify_token || '',
  };
}

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .single();

    if (!error && data) {
      return NextResponse.json(formatSettingsResponse(data));
    }
  }

  return NextResponse.json(memorySettings);
}

export async function POST(req: NextRequest) {
  try {
    const updates = await req.json();

    if (isSupabaseConfigured()) {
      const dbPayload: any = {
        id: '00000000-0000-0000-0000-000000000001',
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Map Z-API fields to existing text columns if needed
      if (updates.zapi_instance_id !== undefined) {
        dbPayload.whatsapp_phone_number_id = updates.zapi_instance_id;
      }
      if (updates.zapi_token !== undefined) {
        dbPayload.whatsapp_access_token = updates.zapi_token;
      }
      if (updates.zapi_client_token !== undefined) {
        dbPayload.whatsapp_verify_token = updates.zapi_client_token;
      }

      // Remove properties that don't exist as columns in postgres
      delete dbPayload.zapi_instance_id;
      delete dbPayload.zapi_token;
      delete dbPayload.zapi_client_token;

      const { data, error } = await supabaseAdmin
        .from('system_settings')
        .upsert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('Supabase settings save error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (data) {
        return NextResponse.json(formatSettingsResponse(data));
      }
    }

    memorySettings = { ...memorySettings, ...updates, updated_at: new Date().toISOString() };
    return NextResponse.json(memorySettings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
