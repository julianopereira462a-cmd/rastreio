import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { FAQ } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function autoGenerateVariationsAndKeywords(question: string, answer?: string): { variations: string[]; keywords: string[] } {
  const normQ = (question || '').toLowerCase().trim();
  const variations: Set<string> = new Set();
  const keywords: Set<string> = new Set();

  variations.add(normQ);
  variations.add(normQ.replace(/[?.,!/]/g, '').trim());

  const parts = question.split(/[?,/]/).map((p) => p.trim().toLowerCase()).filter((p) => p.length >= 2);
  for (const p of parts) {
    variations.add(p);
  }

  const words = normQ.replace(/[^\w\sáéíóúâêîôûãõç]/gi, ' ').split(/\s+/).filter((w) => w.length >= 3);
  for (const w of words) {
    keywords.add(w);
  }

  // Documentos
  if (normQ.includes('document') || normQ.includes('rg') || normQ.includes('cpf') || (answer && answer.toLowerCase().includes('rg'))) {
    [
      'documento',
      'documentos',
      'documentação',
      'qual documento precisa',
      'quais documentos precisa',
      'quais documentos sao necessarios',
      'quais documentos são necessários',
      'o que precisa de documento',
      'o que preciso enviar',
      'o que precisa mandar',
      'quais fotos precisa',
      'precisa de rg',
      'precisa de cpf',
      'foto 3x4',
      'rg frente e verso',
      'papelada',
      'quais os documentos',
      'qual o documento',
    ].forEach((v) => variations.add(v));
    ['documentos', 'documento', 'documentação', 'rg', 'cpf', 'foto 3x4', 'frente e verso', 'requisitos', 'mandar', 'enviar'].forEach((k) => keywords.add(k));
  }

  // Categoria A (Moto)
  if (normQ.includes('categoria a') || normQ.includes('cnh a') || normQ.includes('moto')) {
    [
      'cnh a qual valor ?',
      'cnh a qual valor',
      'qual valor cnh a',
      'categoria a',
      'categoria a qual valor',
      'qual o valor da categoria a',
      'quanto custa a categoria a',
      'valor categoria a',
      'quanto sai a de moto',
      'preco cnh a',
      'cnh a ?',
      'categoria a ?',
      'valor da a',
      'quanto custa a a',
      'moto',
      'motocicleta',
      'quanto ta a de moto',
      'preco moto',
      'cat. a',
      'cat a',
      'cat a qual valor',
      'carteira a',
      'carteira de moto',
      'habilitacao a',
      'letra a',
    ].forEach((v) => variations.add(v));
    ['categoria a', 'cnh a', 'cat a', 'cat. a', 'moto', 'motocicleta', 'valor moto', 'preco moto', 'carteira a'].forEach((k) => keywords.add(k));
  }

  // Categoria B (Carro)
  if (normQ.includes('categoria b') || normQ.includes('cnh b') || normQ.includes('carro')) {
    [
      'cnh b qual valor ?',
      'cnh b qual valor',
      'qual valor cnh b',
      'categoria b',
      'categoria b qual valor',
      'qual o valor da categoria b',
      'quanto custa a categoria b',
      'valor categoria b',
      'quanto sai a de carro',
      'preco cnh b',
      'cnh b ?',
      'categoria b ?',
      'valor da b',
      'quanto custa a b',
      'carro',
      'automovel',
      'quanto ta a de carro',
      'preco carro',
      'cat. b',
      'cat b',
      'cat b qual valor',
      'carteira b',
      'carteira de carro',
      'habilitacao b',
      'letra b',
    ].forEach((v) => variations.add(v));
    ['categoria b', 'cnh b', 'cat b', 'cat. b', 'carro', 'automovel', 'valor carro', 'preco carro', 'carteira b'].forEach((k) => keywords.add(k));
  }

  // Categoria AB (Carro e Moto)
  if (normQ.includes('categoria ab') || normQ.includes('cnh ab') || (normQ.includes('carro') && normQ.includes('moto'))) {
    [
      'cnh ab qual valor ?',
      'cnh ab qual valor',
      'qual valor cnh ab',
      'categoria ab',
      'categoria ab qual valor',
      'qual o valor da categoria ab',
      'quanto custa a categoria ab',
      'valor categoria ab',
      'carro e moto',
      'moto e carro',
      'duas e quatro rodas',
      'cat ab',
      'cat. ab',
      'cat ab qual valor',
      'carteira ab',
      'habilitacao ab',
      'letra ab',
      'ab',
    ].forEach((v) => variations.add(v));
    ['categoria ab', 'cnh ab', 'cat ab', 'ab', 'carro e moto', 'moto e carro', 'duas e quatro rodas'].forEach((k) => keywords.add(k));
  }

  // Categoria AD (Moto e Ônibus / Van)
  if (normQ.includes('categoria ad') || normQ.includes('cnh ad') || normQ.includes('ad') || normQ.includes('a/d') || (normQ.includes('moto') && (normQ.includes('onibus') || normQ.includes('van')))) {
    [
      'cnh ad qual valor ?',
      'cnh ad qual valor',
      'qual valor cnh ad',
      'categoria ad',
      'categoria ad qual valor',
      'qual o valor da categoria ad',
      'quanto custa a categoria ad',
      'valor categoria ad',
      'moto e onibus',
      'onibus e moto',
      'moto e van',
      'van e moto',
      'cat ad',
      'cat. ad',
      'cat ad qual valor',
      'carteira ad',
      'habilitacao ad',
      'letra ad',
      'ad',
      'a/d',
      'a d',
    ].forEach((v) => variations.add(v));
    ['categoria ad', 'cnh ad', 'cat ad', 'ad', 'a/d', 'moto e onibus', 'moto e van'].forEach((k) => keywords.add(k));
  }

  // Categoria C (Caminhão)
  if (normQ.includes('categoria c') || normQ.includes('cnh c') || normQ.includes('caminhao') || normQ.includes('caminhão')) {
    [
      'cnh c qual valor ?',
      'cnh c qual valor',
      'qual valor cnh c',
      'categoria c',
      'categoria c qual valor',
      'qual o valor da categoria c',
      'quanto custa a categoria c',
      'valor categoria c',
      'caminhao',
      'caminhão',
      'cat c',
      'cat. c',
      'carteira c',
      'habilitacao c',
      'letra c',
    ].forEach((v) => variations.add(v));
    ['categoria c', 'cnh c', 'cat c', 'caminhao', 'caminhão'].forEach((k) => keywords.add(k));
  }

  // Categoria D (Ônibus / Van)
  if (normQ.includes('categoria d') || normQ.includes('cnh d') || normQ.includes('onibus') || normQ.includes('ônibus') || normQ.includes('van')) {
    [
      'cnh d qual valor ?',
      'cnh d qual valor',
      'qual valor cnh d',
      'categoria d',
      'categoria d qual valor',
      'qual o valor da categoria d',
      'quanto custa a categoria d',
      'valor categoria d',
      'quanto sai a de onibus',
      'preco cnh d',
      'cnh d ?',
      'categoria d ?',
      'valor da d',
      'quanto custa a d',
      'onibus',
      'ônibus',
      'van',
      'cat. d',
      'cat d',
      'cat d qual valor',
      'carteira d',
      'habilitacao d',
      'letra d',
    ].forEach((v) => variations.add(v));
    ['categoria d', 'cnh d', 'cat d', 'onibus', 'ônibus', 'van', 'valor onibus'].forEach((k) => keywords.add(k));
  }

  // Categoria E (Carreta)
  if (normQ.includes('categoria e') || normQ.includes('cnh e') || normQ.includes('carreta')) {
    [
      'cnh e qual valor ?',
      'cnh e qual valor',
      'qual valor cnh e',
      'categoria e',
      'categoria e qual valor',
      'qual o valor da categoria e',
      'quanto custa a categoria e',
      'valor categoria e',
      'carreta',
      'cat. e',
      'cat e',
      'cat e qual valor',
      'carteira e',
      'habilitacao e',
      'letra e',
    ].forEach((v) => variations.add(v));
    ['categoria e', 'cnh e', 'cat e', 'carreta'].forEach((k) => keywords.add(k));
  }

  // CNH Física
  if (normQ.includes('fisica') || normQ.includes('física') || normQ.includes('impressa') || normQ.includes('papel')) {
    [
      'e a fisica',
      'e a física',
      'e a fisica ?',
      'e a física ?',
      'emite a fisica',
      'emitem a fisica',
      'emitem a física ?',
      'tem a fisica',
      'cnh fisica',
      'cnh física',
      'impressa',
      'via impressa',
      'carteira de papel',
    ].forEach((v) => variations.add(v));
    ['fisica', 'física', 'impressa', 'papel'].forEach((k) => keywords.add(k));
  }

  // Legítima / Original
  if (normQ.includes('legitima') || normQ.includes('legítima') || normQ.includes('verdadeira') || normQ.includes('original') || normQ.includes('quente')) {
    [
      'e verdadeira',
      'é verdadeira',
      'e verdadeira ?',
      'é verdadeira ?',
      'original',
      'é original',
      'e quente',
      'é quente',
      'legitima',
      'legítima',
      'cai em blitz',
      'passa na blitz',
      'confiavel',
      'é golpe',
      'oficial',
    ].forEach((v) => variations.add(v));
    ['legitima', 'legítima', 'verdadeira', 'original', 'quente', 'blitz', 'oficial'].forEach((k) => keywords.add(k));
  }

  return {
    variations: Array.from(variations),
    keywords: Array.from(keywords),
  };
}

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('faqs')
      .select('*')
      .order('priority', { ascending: false });

    if (!error && data) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let variations = Array.isArray(body.question_variations) && body.question_variations.length > 0
      ? body.question_variations
      : [];
    let keywords = Array.isArray(body.keywords) && body.keywords.length > 0
      ? body.keywords
      : [];

    if (variations.length === 0 || keywords.length === 0) {
      const generated = autoGenerateVariationsAndKeywords(body.question, body.answer);
      if (variations.length === 0) variations = generated.variations;
      if (keywords.length === 0) keywords = generated.keywords;
    }

    const newFaq: FAQ = {
      id: body.id || `faq_${Date.now()}`,
      category_id: body.category_id || null,
      question: body.question,
      question_variations: variations,
      keywords: keywords,
      answer: body.answer,
      media_url: body.media_url || null,
      media_type: body.media_type || 'image',
      media_caption: body.media_caption || '',
      media_filename: body.media_filename || '',
      priority: Number(body.priority) || 10,
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
      if (error) {
        console.error('Supabase FAQ Insert Error:', error);
      }
    }

    return NextResponse.json(newFaq, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (updates.question && (!updates.question_variations || updates.question_variations.length === 0)) {
      const generated = autoGenerateVariationsAndKeywords(updates.question, updates.answer);
      updates.question_variations = generated.variations;
      if (!updates.keywords || updates.keywords.length === 0) {
        updates.keywords = generated.keywords;
      }
    }

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
      if (error) {
        console.error('Supabase FAQ Update Error:', error);
      }
    }

    return NextResponse.json({ id, ...updates });
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

  return NextResponse.json({ success: true });
}
