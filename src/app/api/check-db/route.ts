import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const configured = isSupabaseConfigured();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const rawAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const rawService = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const previewAnon = rawAnon ? `${rawAnon.slice(0, 15)}...${rawAnon.slice(-6)} (tam: ${rawAnon.length})` : 'VAZIA';
  const previewService = rawService ? `${rawService.slice(0, 15)}...${rawService.slice(-6)} (tam: ${rawService.length})` : 'VAZIA';

  if (!configured) {
    return NextResponse.json({
      connected: false,
      configured: false,
      message: 'Variáveis NEXT_PUBLIC_SUPABASE_URL ou chaves ainda não foram preenchidas no .env ou na Vercel.',
      previewAnon,
      previewService,
    });
  }

  const startTime = Date.now();

  try {
    let { data, error, count } = await supabaseAdmin
      .from('faqs')
      .select('id', { count: 'exact' })
      .limit(1);

    if (error) {
      const anonRes = await supabase
        .from('faqs')
        .select('id', { count: 'exact' })
        .limit(1);

      if (!anonRes.error) {
        data = anonRes.data;
        error = null;
        count = anonRes.count;
      } else {
        return NextResponse.json({
          connected: false,
          configured: true,
          error: error.message,
          anonError: anonRes.error.message,
          previewAnon,
          previewService,
          message: error.message || 'Erro ao consultar tabela faqs no Supabase.',
        });
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      deploy_version: 'v2.1_conversas_chat',
      connected: true,
      configured: true,
      latencyMs,
      message: 'Banco de dados Supabase conectado com sucesso e tabelas operacionais!',
      totalFaqsNoBanco: count || 0,
      supabaseUrl: rawUrl,
      previewAnon,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      configured: true,
      error: err.message,
      previewAnon,
      message: 'Falha de comunicação: ' + err.message,
    });
  }
}
