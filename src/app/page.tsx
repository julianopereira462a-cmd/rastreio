'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  Smartphone,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalConversations: 142,
    messagesReceived: 894,
    messagesSent: 1024,
    clientsServed: 128,
    activeNow: 4,
    faqHits: 512,
    mediaSent: 184,
  });

  const [dbStatus, setDbStatus] = useState<{
    checking: boolean;
    connected?: boolean;
    configured?: boolean;
    message?: string;
    latencyMs?: number;
    totalFaqsNoBanco?: number;
  }>({ checking: true });

  const checkDatabaseConnection = async () => {
    setDbStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch('/api/check-db');
      const data = await res.json();
      setDbStatus({
        checking: false,
        connected: Boolean(data.connected),
        configured: Boolean(data.configured),
        message: data.message,
        latencyMs: data.latencyMs,
        totalFaqsNoBanco: data.totalFaqsNoBanco,
      });
    } catch (err) {
      setDbStatus({
        checking: false,
        connected: false,
        configured: false,
        message: 'Não foi possível contatar a API de verificação do banco.',
      });
    }
  };

  useEffect(() => {
    checkDatabaseConnection();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard de Atendimento
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visão geral em tempo real da sua operação de WhatsApp inteligente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-200 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Abrir Simulador WhatsApp
          </Link>
          <Link
            href="/faqs"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Perguntas & Fotos
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Conversas</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalConversations}</div>
          <div className="flex items-center text-xs text-emerald-600 font-medium mt-2">
            <TrendingUp className="w-3.5 h-3.5 mr-1" /> +18% esta semana
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Mensagens Enviadas</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.messagesSent}</div>
          <div className="text-xs text-slate-500 mt-2">
            Recebidas: <span className="font-semibold text-slate-700">{stats.messagesReceived}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Perguntas Respondidas</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.faqHits}</div>
          <div className="text-xs text-purple-600 font-medium mt-2">
            Captação por intenção inteligente
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fotos Enviadas</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.mediaSent}</div>
          <div className="text-xs text-amber-600 font-medium mt-2">
            Entregues direto no WhatsApp
          </div>
        </div>
      </div>

      {/* Operational Status & Architecture Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status das Conexões */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Status dos Módulos</h2>
            <button
              onClick={checkDatabaseConnection}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
              title="Recarregar status da conexão"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${dbStatus.checking ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Supabase Status Card */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-800">Banco de Dados Supabase</span>
                </div>
                {dbStatus.checking ? (
                  <span className="text-[11px] bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded animate-pulse">
                    Verificando...
                  </span>
                ) : dbStatus.connected ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                    ✓ Conectado ({dbStatus.latencyMs}ms)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    Modo Local / Demo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {dbStatus.message || 'Verificando conexão com o banco de dados...'}
              </p>
              {dbStatus.connected && (
                <div className="text-[11px] text-emerald-700 font-medium">
                  {dbStatus.totalFaqsNoBanco} perguntas salvas na nuvem.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">WhatsApp Cloud API</div>
                  <div className="text-xs text-slate-500">Oficial Meta v20.0</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Ativo
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Motor de IA Contextual</div>
                  <div className="text-xs text-slate-500">Google Gemini & OpenAI</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                Pronto
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-800">Buffer Anti-Robô</div>
                  <div className="text-xs text-slate-500">Agrupamento consecutivo ativo</div>
                </div>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                4s delay
              </span>
            </div>
          </div>
        </div>

        {/* Respostas mais acionadas */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Perguntas Mais Respondidas</h2>
            <Link href="/faqs" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">É original / verdadeira?</p>
                <p className="text-xs text-slate-500 mt-0.5">Explica QR Code oficial + foto de comprovação</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900">72</span>
                <p className="text-[11px] text-slate-400">envios automáticos</p>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Qual o valor da CNH Digital?</p>
                <p className="text-xs text-slate-500 mt-0.5">Resposta com foto explicativa</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900">54</span>
                <p className="text-[11px] text-slate-400">envios automáticos</p>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">Quais documentos são necessários?</p>
                <p className="text-xs text-slate-500 mt-0.5">Explica RG, CPF e comprovante</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-slate-900">38</span>
                <p className="text-[11px] text-slate-400">envios automáticos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
