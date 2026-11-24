import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { FAQ } from '@/types';

// Mock de memória para quando o Supabase ainda não estiver conectado em desenvolvimento
let memoryFaqs: FAQ[] = [
  {
    id: 'f0',
    question: 'É original / verdadeira?',
    question_variations: ['é quente', 'é legítima', 'funciona mesmo', 'é confiável', 'posso confiar', 'é golpe'],
    keywords: ['verdadeira', 'legítima', 'original', 'quente', 'confiável', 'oficial'],
    answer: 'Sim, 100% original e legítima! O processo é emitido diretamente pelo sistema oficial com validação por QR Code no aplicativo do governo. Você mesmo pode consultar a autenticidade assim que for emitida.',
    media_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    priority: 10,
    is_active: true,
    hit_count: 72,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f1',
    question: 'Qual o valor da CNH Digital?',
    question_variations: ['quanto custa cnh digital', 'preço cnh digital', 'valor da renovação', 'tabela de preço cnh'],
    keywords: ['preço', 'valor', 'quanto custa', 'cnh', 'digital', 'renovação'],
    answer: 'O valor da CNH Digital começa a partir de R$ 450,00 à vista no PIX com desconto, ou parcelado em até 12x no cartão de crédito. Esse valor já inclui a assessoria completa e o acompanhamento até a emissão no aplicativo.',
    media_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
    media_type: 'image',
    media_caption: 'Tabela de serviços e valores atualizados da CNH Digital',
    priority: 10,
    is_active: true,
    hit_count: 38,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f2',
    question: 'Quais documentos são necessários?',
    question_variations: ['o que preciso enviar', 'documentos necessários', 'precisa de rg', 'documentação'],
    keywords: ['documentos', 'rg', 'cpf', 'comprovante', 'preciso', 'enviar', 'foto'],
    answer: 'Você só vai precisar de foto nítida do seu RG ou CNH anterior, CPF e comprovante de endereço recente (máximo 90 dias). Você pode me mandar as fotos diretamente aqui pelo WhatsApp!',
    media_url: '',
    priority: 9,
    is_active: true,
    hit_count: 54,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f3',
    question: 'Qual o prazo de entrega?',
    question_variations: ['quanto tempo demora', 'em quantos dias fica pronto', 'qual o prazo'],
    keywords: ['prazo', 'demora', 'tempo', 'dias', 'quando fica pronto'],
    answer: 'Normalmente o processo leva de 3 a 7 dias úteis após o envio completo dos documentos e confirmação do pagamento.',
    priority: 8,
    is_active: true,
    hit_count: 27,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json(memoryFaqs);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const newFaq: FAQ = {
      id: body.id || `faq_${Date.now()}`,
      category_id: body.category_id || null,
      question: body.question,
      question_variations: body.question_variations || [],
      keywords: body.keywords || [],
      answer: body.answer,
      media_url: body.media_url || null,
      media_type: body.media_type || 'image',
      media_caption: body.media_caption || '',
      media_filename: body.media_filename || '',
      priority: Number(body.priority) || 1,
      is_active: body.is_active ?? true,
      hit_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('faqs')
        .insert({
          category_id: newFaq.category_id,
          question: newFaq.question,
          question_variations: newFaq.question_variations,
          keywords: newFaq.keywords,
          answer: newFaq.answer,
          media_url: newFaq.media_url,
          media_type: newFaq.media_type,
          media_caption: newFaq.media_caption,
          media_filename: newFaq.media_filename,
          priority: newFaq.priority,
          is_active: newFaq.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data, { status: 201 });
      }
    }

    memoryFaqs.unshift(newFaq);
    return NextResponse.json(newFaq, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAdmin
        .from('faqs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json(data);
      }
    }

    const index = memoryFaqs.findIndex((f) => f.id === id);
    if (index !== -1) {
      memoryFaqs[index] = { ...memoryFaqs[index], ...updates, updated_at: new Date().toISOString() };
      return NextResponse.json(memoryFaqs[index]);
    }

    return NextResponse.json({ error: 'FAQ não encontrado' }, { status: 404 });
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
    await supabaseAdmin.from('faqs').delete().eq('id', id);
  }

  memoryFaqs = memoryFaqs.filter((f) => f.id !== id);
  return NextResponse.json({ success: true });
}
