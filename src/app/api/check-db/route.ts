import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    return NextResponse.json({
      connected: false,
      configured: false,
      message: 'Variáveis NEXT_PUBLIC_SUPABASE_URL ou chaves ainda não foram preenchidas no .env ou na Vercel.',
    });
  }

  const startTime = Date.now();

  try {
    // 1. Tentar com supabaseAdmin
    let { data, error, count } = await supabaseAdmin
      .from('faqs')
      .select('id', { count: 'exact' })
      .limit(1);

    // 2. Se falhar, tentar com o cliente público anon (supabase)
    if (error) {
      console.warn('[CheckDB] Tentando com cliente anon público...');
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
          error: error.message || JSON.stringify(error),
          anonError: anonRes.error.message || JSON.stringify(anonRes.error),
          message: error.message || 'Erro ao consultar tabela faqs no Supabase.',
        });
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      connected: true,
      configured: true,
      latencyMs,
      message: 'Banco de dados Supabase conectado com sucesso e tabelas operacionais!',
      totalFaqsNoBanco: count || 0,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      configured: true,
      error: err.message,
      message: 'Falha de comunicação com o Supabase: ' + err.message,
    });
  }
}
