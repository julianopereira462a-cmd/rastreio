import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';
import { sendZApiText, sendZApiImage } from '@/lib/zapi';
import { Conversation, Message } from '@/types';

// Mock realista inicial para demonstração caso banco esteja vazio
let memoryConversations: Array<Conversation & { messages: Message[] }> = [];

export async function GET() {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*, contact:contacts(*), messages:messages(*)')
      .order('last_message_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const formatted = data.map((conv) => ({
        ...conv,
        messages: Array.isArray(conv.messages)
          ? conv.messages.sort(
              (a: any, b: any) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          : [],
      }));
      return NextResponse.json(formatted);
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
      let waId = '';
      if (isSupabaseConfigured() && contactId) {
        const { data: ct } = await supabaseAdmin
          .from('contacts')
          .select('wa_id')
          .eq('id', contactId)
          .single();
        if (ct?.wa_id) waId = ct.wa_id;
      }

      // Enviar via Z-API ao WhatsApp do cliente
      if (waId && isSupabaseConfigured()) {
        try {
          const { data: sData } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .single();

          const zapiConfig = {
            instanceId:
              sData?.zapi_instance_id ||
              sData?.whatsapp_phone_number_id ||
              process.env.ZAPI_INSTANCE_ID,
            token:
              sData?.zapi_token ||
              sData?.whatsapp_access_token ||
              process.env.ZAPI_TOKEN,
            clientToken:
              sData?.zapi_client_token ||
              sData?.whatsapp_verify_token ||
              process.env.ZAPI_CLIENT_TOKEN,
          };

          if (mediaUrl) {
            await sendZApiImage(waId, mediaUrl, messageText || '', zapiConfig);
          } else if (messageText) {
            await sendZApiText(waId, messageText, zapiConfig);
          }
        } catch (zErr) {
          console.error('Erro ao enviar mensagem manual via Z-API:', zErr);
        }
      }

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

      if (isSupabaseConfigured() && conversationId) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          message_type: mediaUrl ? 'image' : 'text',
          content: messageText || '',
          media_url: mediaUrl,
          status: 'delivered',
        });

        await supabaseAdmin
          .from('conversations')
          .update({
            last_message_preview: messageText || '[Mídia enviada]',
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
      }

      return NextResponse.json({ success: true, message: newMsg });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
