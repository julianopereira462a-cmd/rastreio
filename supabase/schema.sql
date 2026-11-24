-- ========================================================
-- SISTEMA DE AUTOMAÇÃO INTELIGENTE DE WHATSAPP (AUTOZAP AI)
-- Schema completo para Supabase (PostgreSQL)
-- ========================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABELA DE CONFIGURAÇÕES GERAIS DO SISTEMA
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL DEFAULT 'Minha Empresa',
    ai_tone TEXT NOT NULL DEFAULT 'amigável, profissional, humanizado e objetivo',
    ai_persona TEXT NOT NULL DEFAULT 'Você é um atendente humano dedicado da empresa. Nunca diga que é um robô ou IA. Escreva com naturalidade de WhatsApp, usando linguagem brasileira, clara e simpática. Use quebras de linha curtas. Nunca invente preços ou garantias não cadastradas.',
    response_delay_seconds INTEGER NOT NULL DEFAULT 4, -- Buffer para mensagens consecutivas
    typing_simulation_enabled BOOLEAN NOT NULL DEFAULT true,
    max_response_length TEXT NOT NULL DEFAULT 'médio', -- 'curto', 'médio', 'detalhado'
    forbidden_topics TEXT DEFAULT 'Não prometer prazos não confirmados, não inventar descontos não cadastrados, não confirmar aprovação sem documentação oficial.',
    escalation_instructions TEXT DEFAULT 'Quando o cliente solicitar falar com atendente humano ou o assunto não for reconhecido, informe com gentileza que um especialista vai continuar o atendimento em instantes.',
    
    -- Configurações WhatsApp Cloud API
    whatsapp_phone_number_id TEXT DEFAULT '',
    whatsapp_waba_id TEXT DEFAULT '',
    whatsapp_access_token TEXT DEFAULT '',
    whatsapp_verify_token TEXT DEFAULT 'autozap_secure_token_2026',
    
    -- Configurações de Provedor de IA
    ai_provider TEXT NOT NULL DEFAULT 'gemini', -- 'gemini' | 'openai' | 'groq'
    ai_api_key TEXT DEFAULT '',
    ai_model_name TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    
    is_automation_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir registro padrão se não existir
INSERT INTO system_settings (id, company_name)
SELECT '00000000-0000-0000-0000-000000000001', 'Minha Empresa'
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = '00000000-0000-0000-0000-000000000001');

-- 2. TABELA DE CATEGORIAS DE SERVIÇOS / FAQ
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categorias padrão para demonstração
INSERT INTO categories (name, description) VALUES
('Serviços Principais', 'Serviços centrais da empresa, valores e prazos'),
('Documentos e Requisitos', 'O que o cliente precisa apresentar'),
('Pagamento e Condições', 'Formas de pagamento, parcelamento e chaves PIX'),
('Dúvidas Gerais', 'Horário de atendimento, localização e garantias')
ON CONFLICT (name) DO NOTHING;

-- 3. GERENCIADOR DE PERGUNTAS E RESPOSTAS (FAQ INTELIGENTE COM MÍDIA)
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    question TEXT NOT NULL,
    question_variations TEXT[] DEFAULT '{}',
    keywords TEXT[] DEFAULT '{}',
    answer TEXT NOT NULL,
    
    -- Anexos de Mídia (enviados diretamente no WhatsApp)
    media_url TEXT,
    media_type TEXT, -- 'image' | 'document' | 'video' | 'audio'
    media_caption TEXT,
    media_filename TEXT,
    
    priority INTEGER DEFAULT 1, -- Quanto maior, mais prioritário
    is_active BOOLEAN DEFAULT true,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Exemplos iniciais realistas
INSERT INTO faqs (question, question_variations, keywords, answer, priority, is_active)
VALUES 
(
  'Qual o valor da CNH Digital?',
  ARRAY['quanto custa cnh digital', 'preço cnh digital', 'valor da renovação', 'tabela de preço cnh'],
  ARRAY['preço', 'valor', 'quanto custa', 'cnh', 'digital', 'renovação'],
  'O valor da CNH Digital começa a partir de R$ 450,00 à vista no PIX, ou parcelado em até 12x no cartão de crédito. Esse valor já inclui a assessoria completa e o acompanhamento até a emissão no aplicativo.',
  10,
  true
),
(
  'Quais documentos são necessários?',
  ARRAY['documentos que precisa', 'o que preciso enviar', 'documentação necessária', 'precisa de rg'],
  ARRAY['documentos', 'rg', 'cpf', 'comprovante', 'preciso', 'enviar'],
  'Você só vai precisar de foto nítida do seu RG ou CNH anterior, CPF e comprovante de endereço recente (máximo 90 dias). Você pode me mandar as fotos diretamente aqui pelo WhatsApp!',
  9,
  true
),
(
  'Qual o prazo de entrega?',
  ARRAY['quanto tempo demora', 'em quantos dias fica pronto', 'qual o prazo'],
  ARRAY['prazo', 'demora', 'tempo', 'dias', 'quando fica pronto'],
  'Normalmente o processo leva de 3 a 7 dias úteis após o envio completo dos documentos e confirmação do pagamento.',
  8,
  true
)
ON CONFLICT DO NOTHING;

-- 4. BASE DE CONHECIMENTO INSTITUCIONAL (RAG / CONTEXTO GERAL)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'Geral', -- 'Institucional', 'Serviços', 'Políticas', 'Instruções'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO knowledge_base (title, content, section) VALUES
('Horário de Atendimento', 'Nosso atendimento presencial e telefônico funciona de segunda a sexta-feira, das 08h às 18h, e aos sábados das 08h às 12h. O suporte pelo WhatsApp funciona 24 horas.', 'Institucional'),
('Formas de Pagamento', 'Aceitamos PIX à vista com 5% de desconto, boleto bancário à vista, ou parcelamento em até 12x no cartão de crédito.', 'Políticas'),
('Política de Garantia', 'Garantimos suporte integral e reenvio sem custos adicionais em caso de inconsistência sistêmica na emissão.', 'Políticas')
ON CONFLICT DO NOTHING;

-- 5. TABELA DE CONTATOS / CLIENTES
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wa_id TEXT NOT NULL UNIQUE, -- Número no formato WhatsApp (ex: 5511999998888)
    name TEXT,
    profile_pic_url TEXT,
    is_automation_paused BOOLEAN DEFAULT false, -- Pausado para atendimento humano manual
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE CONVERSAS (SESSÕES / THREADS)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'paused_human', 'resolved'
    unread_count INTEGER DEFAULT 0,
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABELA DE MENSAGENS (HISTÓRICO COMPLETO)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    wa_message_id TEXT UNIQUE, -- ID oficial da mensagem retornado pelo WhatsApp
    sender_type TEXT NOT NULL, -- 'contact' (cliente), 'ai' (automático), 'agent' (humano)
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video'
    content TEXT NOT NULL,
    media_url TEXT,
    media_mime_type TEXT,
    status TEXT NOT NULL DEFAULT 'delivered', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    metadata JSONB DEFAULT '{}'::jsonb, -- Armazena tokens usados, pontuação de confiança, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. BUFFER DE PROCESSAMENTO DE MENSAGENS CONSECUTIVAS (DEBOUNCE / ANTI-ROBÔ)
-- Evita respostas disparadas a cada "oi", "tudo bem?", "quanto custa?". Agrupa as mensagens recebidas dentro da janela.
CREATE TABLE IF NOT EXISTS message_buffer (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wa_id TEXT NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    incoming_text TEXT NOT NULL,
    wa_message_id TEXT,
    media_url TEXT,
    media_type TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed BOOLEAN DEFAULT false
);

-- 9. TABELA DE LOGS DE EXECUÇÃO E WEBHOOKS
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL, -- 'webhook_received', 'ai_generated', 'whatsapp_sent', 'error'
    level TEXT NOT NULL DEFAULT 'info', -- 'info', 'warn', 'error'
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_contacts_wa_id ON contacts(wa_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buffer_wa_id_unprocessed ON message_buffer(wa_id) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_faqs_active_priority ON faqs(is_active, priority DESC);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (Permitir acesso autenticado total e chave de serviço/anônimo para o backend)
CREATE POLICY "Permitir leitura e escrita para autenticados" ON system_settings FOR ALL USING (true);
CREATE POLICY "Permitir tudo em categories" ON categories FOR ALL USING (true);
CREATE POLICY "Permitir tudo em faqs" ON faqs FOR ALL USING (true);
CREATE POLICY "Permitir tudo em knowledge_base" ON knowledge_base FOR ALL USING (true);
CREATE POLICY "Permitir tudo em contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Permitir tudo em conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Permitir tudo em messages" ON messages FOR ALL USING (true);
CREATE POLICY "Permitir tudo em message_buffer" ON message_buffer FOR ALL USING (true);
CREATE POLICY "Permitir tudo em system_logs" ON system_logs FOR ALL USING (true);

-- STORAGE BUCKET PARA UPLOAD DE MÍDIAS (IMAGENS, PDFS, VÍDEOS)
-- Nota: No painel do Supabase Storage, criar um bucket chamado "whatsapp-media" com acesso público para que o WhatsApp Cloud API possa ler e entregar a imagem.
