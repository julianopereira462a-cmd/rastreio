import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'AutoZap AI - Sistema Inteligente de Automação para WhatsApp',
  description: 'Atendimento humanizado, memória contextual, envio de fotos e gerenciador de respostas com Meta Cloud API e Supabase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen bg-slate-50 antialiased text-slate-900">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
