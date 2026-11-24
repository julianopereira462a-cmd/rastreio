'use client';

import React from 'react';
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
  ExternalLink,
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

      {/* WhatsApp Cloud API Status Pill */}
      <div className="p-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Meta Cloud API
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded">
              Conectado
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Webhooks ativos e escutando mensagens em tempo real.
          </p>
        </div>
      </div>
    </aside>
  );
}
