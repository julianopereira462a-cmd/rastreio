'use client';

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  HelpCircle,
  Image as ImageIcon,
  Upload,
  X,
  Trash2,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
import { FAQ } from '@/types';

// Otimizador de imagem no navegador (Canvas) para garantir upload leve e ultra rápido
function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const elem = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        elem.width = width;
        elem.height = height;
        const ctx = elem.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(elem.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function FaqsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Form State Simplificado: Apenas Pergunta, Resposta e Foto
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formMediaUrl, setFormMediaUrl] = useState('');

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/faqs');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFaqs(data);
      }
    } catch (err) {
      console.error('Erro ao carregar FAQs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const openModal = (faq?: FAQ) => {
    if (faq) {
      setEditingFaq(faq);
      setFormQuestion(faq.question);
      setFormAnswer(faq.answer);
      setFormMediaUrl(faq.media_url || '');
    } else {
      setEditingFaq(null);
      setFormQuestion('');
      setFormAnswer('');
      setFormMediaUrl('');
    }
    setIsModalOpen(true);
  };

  // Upload local de foto com compressão automática
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file);
        setFormMediaUrl(compressedBase64);
      } catch (err) {
        console.error('Erro ao processar imagem:', err);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const payload = {
      id: editingFaq?.id,
      question: formQuestion,
      answer: formAnswer,
      media_url: formMediaUrl || null,
      media_type: 'image',
      priority: 10,
      is_active: true,
      question_variations: [],
      keywords: [],
    };

    try {
      const endpoint = '/api/faqs';
      const method = editingFaq ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert('Erro ao salvar: ' + (errData?.error || 'Tente novamente'));
        return;
      }

      setIsModalOpen(false);
      setSuccessToast(editingFaq ? 'Pergunta atualizada!' : 'Pergunta cadastrada com sucesso!');
      setTimeout(() => setSuccessToast(''), 4000);
      fetchFaqs();
    } catch (err: any) {
      alert('Erro de conexão ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta pergunta?')) return;
    try {
      await fetch(`/api/faqs?id=${id}`, { method: 'DELETE' });
      setSuccessToast('Pergunta removida!');
      setTimeout(() => setSuccessToast(''), 3000);
      fetchFaqs();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto w-full">
      {/* Toast de Sucesso */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 font-semibold text-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          {successToast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Perguntas & Respostas com Fotos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre a pergunta, a resposta que o cliente vai receber e a foto opcional para enviar no WhatsApp.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm shadow-emerald-200 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Pergunta
        </button>
      </div>

      {/* Busca Rápida */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-sm">
        <Search className="w-5 h-5 text-slate-400 ml-1" />
        <input
          type="text"
          placeholder="Pesquisar por pergunta ou resposta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Lista de Perguntas */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Carregando perguntas da nuvem...</div>
        ) : filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-700">Nenhuma pergunta cadastrada</p>
            <p className="text-sm text-slate-400 mt-1">
              Clique em "+ Adicionar Pergunta" para cadastrar sua primeira resposta.
            </p>
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm transition-all hover:border-slate-300"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Pergunta do Cliente
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {faq.question}
                    </h3>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Resposta Automática no WhatsApp
                    </span>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100 mt-1 whitespace-pre-wrap leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>

                  {faq.media_url && (
                    <div className="pt-1 flex items-center gap-3">
                      <img
                        src={faq.media_url}
                        alt="Foto da Resposta"
                        className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                      <div>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit mb-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Foto Anexada
                        </span>
                        <p className="text-xs text-slate-500">Esta foto será enviada junto com a resposta no WhatsApp.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openModal(faq)}
                    className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(faq.id)}
                    className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Simplificado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                {editingFaq ? 'Editar Pergunta' : 'Nova Pergunta para o WhatsApp'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pergunta do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Como funciona a CNH Categoria A?"
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Resposta que será enviada no WhatsApp *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Digite aqui exatamente a explicação e o texto que o cliente vai receber..."
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none shadow-sm leading-relaxed"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Foto ou Imagem (Opcional)
                </label>

                {formMediaUrl ? (
                  <div className="relative border border-slate-200 rounded-xl p-3 flex items-center gap-4 bg-slate-50">
                    <img
                      src={formMediaUrl}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded-lg border shadow-sm"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-emerald-700">✓ Foto anexada com sucesso!</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Será enviada no WhatsApp junto com o texto.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormMediaUrl('')}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-semibold"
                    >
                      Remover foto
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      id="photo-upload-comp"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-upload-comp"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        Clique aqui para escolher uma foto do seu computador
                      </div>
                      <p className="text-xs text-slate-400">PNG, JPG ou JPEG (otimizada automaticamente)</p>
                    </label>
                  </div>
                )}

                <div className="pt-1">
                  <input
                    type="url"
                    placeholder="Ou cole o link de uma imagem da internet aqui..."
                    value={formMediaUrl.startsWith('data:') ? '' : formMediaUrl}
                    onChange={(e) => setFormMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-slate-50 outline-none text-slate-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? 'Salvando na Nuvem...' : 'Salvar Pergunta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
