import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { Conversation, Message } from '@/types';

// Mock realista inicial para demonstração
let memoryConversations: Array<Conversation & { messages: Message[] }> = [
  {
    id: 'conv_1',
    contact_id: 'ct_1',
    contact: {
      id: 'ct_1',
      wa_id: '5511988887777',
      name: 'Carlos Mendes',
      is_automation_paused: false,
      tags: ['CNH Digital', 'Interessado'],
      metadata: {},
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      last_interaction_at: new Date().toISOString(),
    },
    status: 'active',
    unread_count: 0,
    last_message_preview: 'O valor da CNH Digital começa a partir de R$ 450,00...',
    last_message_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    messages: [
      {
        id: 'm1',
        conversation_id: 'conv_1',
        sender_type: 'contact',
        message_type: 'text',
        content: 'Olá, boa tarde! Gostaria de saber mais sobre a CNH digital.',
        status: 'read',
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'm2',
        conversation_id: 'conv_1',
        sender_type: 'ai',
        message_type: 'text',
        content: 'Boa tarde! Tudo bem? Que ótimo você nos procurar. Você deseja fazer a primeira emissão ou seria renovação da sua CNH?',
        status: 'read',
        created_at: new Date(Date.now() - 3600000 * 2 + 5000).toISOString(),
      },
      {
        id: 'm3',
        conversation_id: 'conv_1',
        sender_type: 'contact',
        message_type: 'text',
        content: 'É renovação. Quanto custa?',
        status: 'read',
        created_at: new Date(Date.now() - 60000 * 10).toISOString(),
      },
      {
        id: 'm4',
        conversation_id: 'conv_1',
        sender_type: 'ai',
        message_type: 'text',
        content: 'O valor da CNH Digital começa a partir de R$ 450,00 à vista no PIX, ou em até 12x no cartão de crédito. Esse valor já inclui a assessoria completa e o acompanhamento até a emissão no aplicativo.',
        media_url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80',
        status: 'delivered',
        created_at: new Date(Date.now() - 60000 * 10 + 4000).toISOString(),
      },
    ],
  },
  {
    id: 'conv_2',
    contact_id: 'ct_2',
    contact: {
      id: 'ct_2',
      wa_id: '5521977776666',
      name: 'Mariana Souza',
      is_automation_paused: true, // Pausado para humano!
      tags: ['Dúvida Específica'],
      metadata: {},
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      last_interaction_at: new Date(Date.now() - 60000 * 30).toISOString(),
    },
    status: 'paused_human',
    unread_count: 1,
    last_message_preview: 'Gostaria de falar com um atendente humano por favor.',
    last_message_at: new Date(Date.now() - 60000 * 30).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    messages: [
      {
        id: 'm5',
        conversation_id: 'conv_2',
        sender_type: 'contact',
        message_type: 'text',
        content: 'Gostaria de falar com um atendente humano por favor.',
        status: 'read',
        created_at: new Date(Date.now() - 60000 * 30).toISOString(),
      },
    ],
  },
];

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*, contact:contacts(*)')
      .order('last_message_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return NextResponse.json(data);
    }
  }

  return NextResponse.json(memoryConversations);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, conversationId, contactId, isPaused, messageText, mediaUrl } = body;

    // Ação: Pausar ou Retomar Automação da IA para um Contato
    if (action === 'toggle_pause') {
      if (isSupabaseConfigured() && contactId) {
        await supabaseAdmin
          .from('contacts')
          .update({ is_automation_paused: isPaused })
          .eq('id', contactId);

        await supabaseAdmin
          .from('conversations')
          .update({ status: isPaused ? 'paused_human' : 'active' })
          .eq('id', conversationId);
      }

      const conv = memoryConversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.status = isPaused ? 'paused_human' : 'active';
        if (conv.contact) conv.contact.is_automation_paused = isPaused;
      }

      return NextResponse.json({ success: true, isPaused });
    }

    // Ação: Enviar Mensagem Manual (Atendente Humano)
    if (action === 'send_manual_message') {
      const conv = memoryConversations.find((c) => c.id === conversationId);

      const newMsg: Message = {
        id: `msg_manual_${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent',
        message_type: mediaUrl ? 'image' : 'text',
        content: messageText || '',
        media_url: mediaUrl,
        status: 'delivered',
        created_at: new Date().toISOString(),
      };

      if (conv) {
        conv.messages.push(newMsg);
        conv.last_message_preview = messageText || '[Mídia enviada]';
        conv.last_message_at = new Date().toISOString();
      }

      if (isSupabaseConfigured()) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          message_type: mediaUrl ? 'image' : 'text',
          content: messageText || '',
          media_url: mediaUrl,
          status: 'delivered',
        });
      }

      return NextResponse.json({ success: true, message: newMsg });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
