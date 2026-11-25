'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HelpCircle,
  BookOpen,
  MessagesSquare,
  Bot,
  Settings,
  Sparkles,
  Smartphone,
  Power,
  PowerOff,
} from 'lucide-react';

const navItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Perguntas & Respostas',
    href: '/faqs',
    icon: HelpCircle,
    badge: 'Essencial',
  },
  {
    name: 'Base de Conhecimento',
    href: '/knowledge',
    icon: BookOpen,
    badge: null,
  },
  {
    name: 'Conversas & Chat',
    href: '/conversations',
    icon: MessagesSquare,
    badge: 'Ao Vivo',
  },
  {
    name: 'Simulador WhatsApp',
    href: '/simulator',
    icon: Smartphone,
    badge: 'Testar',
  },
  {
    name: 'Configurações & IA',
    href: '/settings',
    icon: Settings,
    badge: null,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [botEnabled, setBotEnabled] = useState<boolean>(true);
  const [toggling, setToggling] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.is_automation_enabled === 'boolean') {
          setBotEnabled(data.is_automation_enabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleBot = async () => {
    if (toggling) return;
    setToggling(true);
    const nextState = !botEnabled;
    setBotEnabled(nextState);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_automation_enabled: nextState }),
      });
    } catch (err) {
      console.error('Erro ao alternar status do bot:', err);
      setBotEnabled(!nextState); // reverte se der erro
    } finally {
      setToggling(false);
    }
  };

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-800 tracking-tight text-base">AutoZap</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                AI
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Automação Inteligente</p>
          </div>
        </div>
      </div>

      {/* BOT ON/OFF SWITCH - VISÍVEL EM TODAS AS TELAS */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70">
        <div
          className={`p-3 rounded-xl border transition-all ${
            botEnabled
              ? 'bg-emerald-50/90 border-emerald-300/80 shadow-sm'
              : 'bg-rose-50/90 border-rose-300/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                {botEnabled && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    botEnabled ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              Robô WhatsApp
            </span>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleBot}
              disabled={toggling}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                botEnabled ? 'bg-emerald-600' : 'bg-slate-300'
              } ${toggling ? 'opacity-60 cursor-wait' : ''}`}
              title={botEnabled ? 'Clique para desativar o robô' : 'Clique para ativar o robô'}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  botEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span
              className={`font-bold flex items-center gap-1 ${
                botEnabled ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {botEnabled ? (
                <>
                  <Power className="w-3 h-3 text-emerald-600" /> ATIVO (Respondendo)
                </>
              ) : (
                <>
                  <PowerOff className="w-3 h-3 text-rose-600" /> PAUSADO (Desligado)
                </>
              )}
            </span>
            <button
              onClick={handleToggleBot}
              disabled={toggling}
              className="text-[10px] underline font-semibold text-slate-500 hover:text-slate-800"
            >
              {botEnabled ? 'Pausar' : 'Ligar'}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navegação Principal
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Conexão Status */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Z-API WhatsApp
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
              Conectado
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            QR Code sincronizado e respondendo mensagens.
          </p>
        </div>
      </div>
    </aside>
  );
}
