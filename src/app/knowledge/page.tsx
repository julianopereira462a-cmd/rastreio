'use client';

import React, { useEffect, useState } from 'react';
import { Plus, BookOpen, Trash2, Shield, Clock, CreditCard, Sparkles, X } from 'lucide-react';
import { KnowledgeItem } from '@/types';

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [section, setSection] = useState('Geral');

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/knowledge');
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, section }),
      });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      fetchKnowledge();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este item da base de conhecimento?')) return;
    try {
      await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
      fetchKnowledge();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Base de Conhecimento Geral
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Informações institucionais, políticas de garantia e regras que a IA consulta para responder com segurança.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2.5 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Informação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-sm">
            Carregando base de conhecimento...
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhum tópico cadastrado</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    {item.section}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{item.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.content}</p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center text-[11px] text-emerald-600 font-medium">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Ativo no contexto da IA
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Novo Conteúdo Institucional</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Política de Reembolso e Garantia"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Seção</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none"
                >
                  <option value="Institucional">Institucional</option>
                  <option value="Políticas">Políticas</option>
                  <option value="Serviços">Serviços</option>
                  <option value="Instruções">Instruções</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Conteúdo Explicativo</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explique os detalhes para que a IA possa informar com precisão..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
