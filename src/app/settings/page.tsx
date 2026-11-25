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
} from 'lucide-react';
import { SystemSettings } from '@/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

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
            Configurações do Sistema & Inteligência Artificial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ajuste a personalidade da IA, limites de atendimento e chaves de integração.
          </p>
        </div>
        {savedSuccess && (
          <div className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-100 text-emerald-800 px-3.5 py-2 rounded-xl animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Configurações salvas no Supabase!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Comportamento e Personalidade da IA */}
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

        {/* 2. Buffer Anti-Robô & Temporização */}
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

        {/* 3. Provedor de Inteligência Artificial */}
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
