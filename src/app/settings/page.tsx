'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Bot,
  Key,
  Shield,
  Save,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import { SystemSettings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCopyWebhook = () => {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/webhook/zapi`
        : 'https://rastreio-dusky.vercel.app/api/webhook/zapi';
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert('Erro ao salvar configurações: ' + (errData?.error || 'Erro desconhecido'));
        return;
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert('Erro de conexão: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurações do WhatsApp & Inteligência Artificial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Conecte seu WhatsApp via QR Code, ajuste a personalidade da IA e gerencie as chaves de integração.
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Configurações salvas no Supabase com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Conexão WhatsApp via Z-API (QR Code) */}
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/25 shadow-sm space-y-5 bg-gradient-to-br from-white via-white to-emerald-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">
                    Conexão WhatsApp (Z-API por QR Code)
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Sem Burocracia • Conectar em 1 minuto
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Conecte o seu número de WhatsApp pessoal ou comercial escaneando o QR Code pelo celular.
                </p>
              </div>
            </div>

            <a
              href="https://www.z-api.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors w-fit"
            >
              Acessar site da Z-API <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Passo a passo rápido */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-600" /> Passo a passo simples para ativar:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-600">
              <li>
                Crie ou acesse sua conta no <a href="https://www.z-api.io" target="_blank" className="text-emerald-700 underline font-medium">z-api.io</a>.
              </li>
              <li>
                Crie uma <strong>Instância</strong> e escaneie o <strong>QR Code</strong> com o WhatsApp do seu celular (Menu do WhatsApp &gt; Aparelhos Conectados &gt; Conectar aparelho).
              </li>
              <li>
                Copie o <strong>ID da Instância</strong> e o <strong>Token</strong> do painel da Z-API e cole nos dois campos abaixo.
              </li>
              <li>
                No painel da Z-API, clique no menu lateral em <strong>Webhooks</strong> &gt; ative o interruptor <strong>Ao receber mensagem</strong> e cole a URL do Webhook abaixo.
              </li>
            </ol>
          </div>

          {/* Webhook URL para copiar */}
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
              URL do Webhook para colar no Z-API (Webhook / Ao Receber Mensagem)
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/api/webhook/zapi`
                    : 'https://rastreio-dusky.vercel.app/api/webhook/zapi'
                }
                className="w-full px-3.5 py-2 rounded-lg bg-white border border-emerald-300 font-mono text-xs text-slate-800 select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors shrink-0"
              >
                {copiedWebhook ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copiar URL
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Campos de credenciais da Z-API */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                ID da Instância (Instance ID)
              </label>
              <input
                type="text"
                placeholder="Ex: 3B4C5D6E... ou seu ID"
                value={settings.zapi_instance_id || ''}
                onChange={(e) => setSettings({ ...settings, zapi_instance_id: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Token da Instância (Token)
              </label>
              <input
                type="password"
                placeholder="Token gerado pela Z-API"
                value={settings.zapi_token || ''}
                onChange={(e) => setSettings({ ...settings, zapi_token: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Client Token <span className="text-slate-400 font-normal lowercase">(opcional)</span>
              </label>
              <input
                type="password"
                placeholder="Client Token (se houver)"
                value={settings.zapi_client_token || ''}
                onChange={(e) => setSettings({ ...settings, zapi_client_token: e.target.value.trim() })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 2. Comportamento e Personalidade da IA */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Bot className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              Personalidade e Comportamento da IA
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome da Empresa / Negócio
              </label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tom de Voz das Respostas
              </label>
              <input
                type="text"
                value={settings.ai_tone || ''}
                onChange={(e) => setSettings({ ...settings, ai_tone: e.target.value })}
                placeholder="Ex: simpático, acolhedor, profissional e direto"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Instrução Persona Base (System Prompt)
            </label>
            <textarea
              rows={3}
              value={settings.ai_persona || ''}
              onChange={(e) => setSettings({ ...settings, ai_persona: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              O sistema já inclui blindagem estrita para nunca dizer "sou um robô" ou usar respostas mecânicas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tópicos Proibidos (Nunca Mencionar / Inventar)
              </label>
              <textarea
                rows={3}
                value={settings.forbidden_topics || ''}
                onChange={(e) => setSettings({ ...settings, forbidden_topics: e.target.value })}
                placeholder="Ex: Não prometer aprovação imediata, não prometer descontos extras..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Instrução de Encaminhamento para Atendente Humano
              </label>
              <textarea
                rows={3}
                value={settings.escalation_instructions || ''}
                onChange={(e) => setSettings({ ...settings, escalation_instructions: e.target.value })}
                placeholder="Ex: Dizer que um consultor vai continuar o atendimento..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Buffer Anti-Robô & Temporização */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Tempo e Naturalidade das Respostas (Buffer Anti-Robô)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Intervalo de Espera / Debounce (segundos)
              </label>
              <input
                type="number"
                min={1}
                max={15}
                value={settings.response_delay_seconds || 4}
                onChange={(e) =>
                  setSettings({ ...settings, response_delay_seconds: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-emerald-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Espera este tempo para agrupar mensagens consecutivas enviadas pelo cliente antes de responder.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={settings.typing_simulation_enabled ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, typing_simulation_enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="text-sm font-semibold text-slate-800">
                  Simular "Digitando..." no WhatsApp antes de enviar
                </span>
              </label>
              <p className="text-xs text-slate-400 mt-1 pl-7">
                Dá a impressão real de digitação proporcional ao tamanho da resposta.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Provedor de Inteligência Artificial */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-base font-bold text-slate-900">
              Provedor de Inteligência Artificial
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Provedor
              </label>
              <select
                value={settings.ai_provider || 'gemini'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai_provider: e.target.value as any,
                    ai_model_name:
                      e.target.value === 'gemini'
                        ? 'gemini-1.5-flash'
                        : e.target.value === 'groq'
                        ? 'llama-3.1-70b-versatile'
                        : 'gpt-4o-mini',
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none bg-white"
              >
                <option value="gemini">Google Gemini (Recomendado / Ultra Rápido)</option>
                <option value="openai">OpenAI (GPT-4o mini)</option>
                <option value="groq">Groq (Llama 3.1)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nome do Modelo
              </label>
              <input
                type="text"
                value={settings.ai_model_name || 'gemini-1.5-flash'}
                onChange={(e) => setSettings({ ...settings, ai_model_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Chave de API (API Key)
              </label>
              <input
                type="text"
                placeholder="AIzaSy... ou AQ.Ab8..."
                value={settings.ai_api_key || ''}
                onChange={(e) => setSettings({ ...settings, ai_api_key: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Botão de Salvar Geral */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md shadow-emerald-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Salvando no Banco...' : 'Salvar Todas as Configurações'}
          </button>
        </div>
      </form>
    </div>
  );
}
