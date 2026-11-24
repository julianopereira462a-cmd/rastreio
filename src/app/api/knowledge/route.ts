import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { KnowledgeItem } from '@/types';

let memoryKnowledge: KnowledgeItem[] = [
  {
    id: 'k1',
    title: 'Horário de Atendimento e Suporte',
    content: 'O atendimento presencial funciona de segunda a sexta das 08h às 18h. O atendimento via WhatsApp funciona 24 horas todos os dias com suporte inteligente.',
    section: 'Institucional',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'k2',
    title: 'Condições de Pagamento e Chave PIX',
    content: 'Aceitamos PIX à vista com 5% de desconto especial, boleto bancário à vista, ou parcelamento em até 12x no cartão de crédito.',
    section: 'Políticas',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'k3',
    title: 'Segurança e Garantia dos Serviços',
    content: 'Todos os processos seguem a legislação brasileira e são acompanhados por especialistas. Caso haja qualquer pendência sistêmica, garantimos suporte total até a resolução.',
    section: 'Garantias',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json(memoryKnowledge);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newItem: KnowledgeItem = {
      id: body.id || `k_${Date.now()}`,
      title: body.title,
      content: body.content,
      section: body.section || 'Geral',
      is_active: body.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('knowledge_base')
        .insert({
          title: newItem.title,
          content: newItem.content,
          section: newItem.section,
          is_active: newItem.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data, { status: 201 });
      }
    }

    memoryKnowledge.unshift(newItem);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  }

  if (isSupabaseConfigured()) {
    await supabaseAdmin.from('knowledge_base').delete().eq('id', id);
  }

  memoryKnowledge = memoryKnowledge.filter((k) => k.id !== id);
  return NextResponse.json({ success: true });
}
