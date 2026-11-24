import { NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

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
    // Testar consulta real na tabela faqs
    const { data, error, count } = await supabaseAdmin
      .from('faqs')
      .select('*', { count: 'exact', head: true });

    const latencyMs = Date.now() - startTime;

    if (error) {
      return NextResponse.json({
        connected: false,
        configured: true,
        error: error.message,
        message: 'Conectou ao host, mas ocorreu um erro ao consultar as tabelas. Verifique se executou o script schema.sql no SQL Editor do Supabase.',
      });
    }

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
      message: 'Falha de comunicação com o Supabase.',
    });
  }
}
