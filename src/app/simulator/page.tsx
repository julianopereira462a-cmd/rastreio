'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RefreshCw,
  CheckCheck,
  Bot,
  Image as ImageIcon,
  Zap,
  Info,
  Clock,
  ShieldAlert,
} from 'lucide-react';

interface SimMessage {
  id: string;
  sender: 'client' | 'ai';
  text: string;
  mediaUrl?: string;
  matchedFaq?: string;
  time: string;
}

export default function SimulatorPage() {
  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Olá! Como posso ajudar você hoje?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastDebugInfo, setLastDebugInfo] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || isTyping) return;

    const userMsg: SimMessage = {
      id: `user_${Date.now()}`,
      sender: 'client',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newHistory.map((m) => ({ sender: m.sender, text: m.text })),
          clientName: 'Cliente Teste',
        }),
      });

      const data = await res.json();
      setLastDebugInfo(data);

      const aiMsg: SimMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: data.text,
        mediaUrl: data.mediaToSend?.url,
        matchedFaq: data.matchedFaq,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Erro na simulação:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: 'Olá! Como posso te ajudar hoje?',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLastDebugInfo(null);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Simulador Interativo de WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Teste a inteligência, o tempo de digitação, a memória contextual e o envio automático de imagens em tempo real.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reiniciar Conversa
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Painel Esquerdo: Instruções e Cenários Rápidos */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Cenários de Teste Rápido
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clique nos botões abaixo para simular mensagens reais de clientes e validar se a IA consulta o FAQ e a Base de Conhecimento:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleSendMessage('É verdadeira? É original ou tem risco?')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
              >
                <span>🛡️ "É verdadeira? É original?"</span>
                <span className="text-[11px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100">
                  Testar Autenticidade + Foto
                </span>
              </button>

              <button
                onClick={() => handleSendMessage('Qual o valor da CNH Digital?')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
              >
                <span>💰 "Qual o valor da CNH Digital?"</span>
                <span className="text-[11px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100">
                  Testar Foto + Preço
                </span>
              </button>

              <button
                onClick={() => handleSendMessage('Quais documentos eu preciso enviar?')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
              >
                <span>📄 "Quais documentos eu preciso enviar?"</span>
                <span className="text-[11px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100">
                  Testar FAQ
                </span>
              </button>

              <button
                onClick={() => handleSendMessage('Qual o prazo de entrega?')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
              >
                <span>⏱️ "Qual o prazo de entrega?"</span>
                <span className="text-[11px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100">
                  Testar Prazo
                </span>
              </button>

              <button
                onClick={() => handleSendMessage('Quero falar com um atendente humano')}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/50 text-xs font-medium text-slate-800 transition-all flex items-center justify-between group"
              >
                <span>👤 "Quero falar com um atendente humano"</span>
                <span className="text-[11px] text-amber-600 font-bold opacity-0 group-hover:opacity-100">
                  Testar Transição
                </span>
              </button>
            </div>
          </div>

          {/* Painel de Diagnóstico do RAG */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Diagnóstico da Resposta da IA
            </h3>
            {lastDebugInfo ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">FAQ Identificado:</span>
                  <span className="font-semibold text-slate-800">
                    {lastDebugInfo.matchedFaq || 'Resposta contextual livre'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Foto Anexa:</span>
                  <span className="font-semibold text-emerald-600">
                    {lastDebugInfo.mediaToSend ? 'Sim (Enviada no WhatsApp)' : 'Nenhuma'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Tempo de Digitação Simulado:</span>
                  <span className="font-semibold text-blue-600">
                    {lastDebugInfo.delaySimulatedMs ? `${(lastDebugInfo.delaySimulatedMs / 1000).toFixed(1)}s` : '1.5s'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Envie uma mensagem no simulador para inspecionar os detalhes do processamento da IA.
              </p>
            )}
          </div>
        </div>

        {/* Painel Direito: Smartphone Virtual do WhatsApp */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-md bg-slate-900 rounded-[40px] p-3 shadow-2xl border-4 border-slate-800">
            {/* Dynamic Island / Speaker */}
            <div className="h-4 w-28 bg-black rounded-full mx-auto mb-2" />

            <div className="bg-[#efeae2] rounded-[32px] overflow-hidden flex flex-col h-[640px] relative border border-slate-700">
              {/* WhatsApp App Bar */}
              <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow">
                    AZ
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight">Atendimento WhatsApp</h3>
                    <p className="text-[11px] text-emerald-200">
                      {isTyping ? 'digitando...' : 'online'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 wa-chat-bg">
                {/* Aviso criptografia WhatsApp */}
                <div className="bg-[#ffeecd] text-[#54656f] text-[10px] p-2 rounded-lg text-center max-w-[280px] mx-auto shadow-sm">
                  🔒 As mensagens são protegidas com a criptografia de ponta a ponta.
                </div>

                {messages.map((m) => {
                  const isUser = m.sender === 'client';

                  return (
                    <div
                      key={m.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-sm space-y-1.5 ${
                          isUser
                            ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                            : 'bg-white text-slate-900 rounded-tl-none'
                        }`}
                      >
                        {/* Imagem Enviada */}
                        {m.mediaUrl && (
                          <div className="rounded-xl overflow-hidden mb-1 border border-slate-200">
                            <img
                              src={m.mediaUrl}
                              alt="Anexo"
                              className="w-full max-h-48 object-cover"
                            />
                          </div>
                        )}

                        <p className="text-xs whitespace-pre-wrap leading-relaxed">{m.text}</p>

                        <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400">
                          <span>{m.time}</span>
                          {isUser && <CheckCheck className="w-3 h-3 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input do WhatsApp */}
              <div className="p-2.5 bg-[#f0f2f5] border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder="Mensagem..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-white px-3.5 py-2 rounded-full text-xs outline-none border border-slate-200 shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shadow transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
