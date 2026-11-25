'use client';

import React, { useEffect, useState } from 'react';
import {
  Search,
  Send,
  PauseCircle,
  PlayCircle,
  CheckCheck,
  User,
  Bot,
  Image as ImageIcon,
  Paperclip,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Conversation, Message } from '@/types';

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [inputMediaUrl, setInputMediaUrl] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (Array.isArray(data)) {
        setConversations(data);
        if (!selectedConv && data.length > 0) {
          setSelectedConv(data[0]);
        } else if (selectedConv) {
          const updated = data.find((c) => c.id === selectedConv.id);
          if (updated) setSelectedConv(updated);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    // Atualização em tempo real das conversas a cada 3 segundos
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  const handleTogglePause = async () => {
    if (!selectedConv) return;
    const isCurrentlyPaused = selectedConv.status === 'paused_human';
    const newPausedState = !isCurrentlyPaused;

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_pause',
          conversationId: selectedConv.id,
          contactId: selectedConv.contact_id,
          isPaused: newPausedState,
        }),
      });

      setSelectedConv({
        ...selectedConv,
        status: newPausedState ? 'paused_human' : 'active',
        contact: {
          ...selectedConv.contact,
          is_automation_paused: newPausedState,
        },
      });

      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || (!inputText.trim() && !inputMediaUrl.trim())) return;

    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_manual_message',
          conversationId: selectedConv.id,
          contactId: selectedConv.contact_id,
          messageText: inputText,
          mediaUrl: inputMediaUrl || null,
        }),
      });

      setInputText('');
      setInputMediaUrl('');
      setShowMediaInput(false);
      fetchConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-[calc(100vh-1px)] overflow-hidden">
      {/* Lista de Contatos / Conversas */}
      <div className="w-80 md:w-96 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-900">Conversas</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {conversations.length} ativas
            </span>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 outline-none bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {conversations.map((conv) => {
            const isSelected = selectedConv?.id === conv.id;
            const isPaused = conv.status === 'paused_human';

            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`p-4 cursor-pointer transition-colors flex items-start gap-3 ${
                  isSelected ? 'bg-emerald-50/70 border-r-4 border-emerald-600' : 'hover:bg-slate-50'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0 font-bold text-sm">
                  {conv.contact?.name ? conv.contact.name[0] : 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 truncate">
                      {conv.contact?.name || conv.contact?.wa_id}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {conv.last_message_preview || 'Nova conversa'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {isPaused ? (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <User className="w-3 h-3" /> Atendimento Humano
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Bot className="w-3 h-3" /> IA Atendendo
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Janela de Chat Aberta */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col bg-slate-100">
          {/* Header do Chat */}
          <div className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                {selectedConv.contact?.name ? selectedConv.contact.name[0] : 'C'}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {selectedConv.contact?.name || 'Contato WhatsApp'}
                </h2>
                <p className="text-xs text-slate-500">{selectedConv.contact?.wa_id}</p>
              </div>
            </div>

            {/* Controle de Automação */}
            <div className="flex items-center gap-3">
              {selectedConv.status === 'paused_human' ? (
                <button
                  onClick={handleTogglePause}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  Devolver para a IA
                </button>
              ) : (
                <button
                  onClick={handleTogglePause}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm transition-colors"
                >
                  <PauseCircle className="w-4 h-4" />
                  Assumir Conversa Manualmente
                </button>
              )}
            </div>
          </div>

          {/* Área de Mensagens (Estilo WhatsApp) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 wa-chat-bg">
            {selectedConv.messages?.map((msg: Message) => {
              const isContact = msg.sender_type === 'contact';
              const isAI = msg.sender_type === 'ai';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isContact ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-md rounded-2xl p-3.5 shadow-sm space-y-2 ${
                      isContact
                        ? 'bg-white text-slate-800 rounded-tl-sm'
                        : isAI
                        ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-sm'
                        : 'bg-emerald-600 text-white rounded-tr-sm'
                    }`}
                  >
                    {/* Imagem se houver */}
                    {msg.media_url && (
                      <div className="overflow-hidden rounded-lg">
                        <img
                          src={msg.media_url}
                          alt="Mídia"
                          className="w-full max-h-60 object-cover"
                        />
                      </div>
                    )}

                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                    <div className="flex items-center justify-end gap-1 text-[10px] opacity-70">
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!isContact && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de Envio de Mensagem */}
          <div className="p-4 bg-white border-t border-slate-200">
            {showMediaInput && (
              <div className="mb-3 p-3 bg-slate-50 border rounded-xl flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="url"
                  placeholder="Cole a URL da foto ou imagem para enviar ao WhatsApp..."
                  value={inputMediaUrl}
                  onChange={(e) => setInputMediaUrl(e.target.value)}
                  className="w-full text-xs bg-transparent outline-none text-slate-800"
                />
              </div>
            )}

            <form onSubmit={handleSendManual} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMediaInput(!showMediaInput)}
                className={`p-2.5 rounded-xl border transition-colors ${
                  showMediaInput ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Anexar Imagem"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              <input
                type="text"
                placeholder={
                  selectedConv.status === 'paused_human'
                    ? 'Digite sua resposta manual como atendente humano...'
                    : 'A IA está ativa. Digite se desejar enviar uma resposta agora...'
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Selecione uma conversa para visualizar
        </div>
      )}
    </div>
  );
}
