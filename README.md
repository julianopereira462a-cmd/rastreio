# AutoZap AI - Sistema Inteligente de Automação para WhatsApp

Sistema completo e profissional de atendimento automático via **WhatsApp Business Cloud API (Meta)**, hospedado na **Vercel** com banco de dados **Supabase** e Inteligência Artificial contextual (**Google Gemini / OpenAI**).

---

## 🚀 Principais Funcionalidades

1. **Comunicação 100% Humanizada (Anti-Robô):**
   - Não usa termos mecânicos ("sou um robô", "sou um assistente virtual").
   - Linguagem natural brasileira, clara, educada e convincente.
   - Não inicia todas as frases de forma repetitiva.
2. **Buffer Inteligente de Mensagens Consecutivas (Debounce):**
   - Agrupa mensagens enviadas em sequência pelo cliente antes de disparar a resposta.
   - Simulação de digitação proporcional ao tamanho da resposta.
3. **Memória Conversacional por Contato:**
   - Acompanha o contexto e assunto tratado nas mensagens anteriores.
   - Reconhece intenções sem perder o fio da meada.
4. **Gerenciador de Perguntas e Respostas (FAQ com Fotos):**
   - Cadastro de perguntas principais, variações, palavras-chave e prioridades.
   - **Envio de fotos e imagens explicativas** diretamente no WhatsApp junto com a resposta.
5. **Base de Conhecimento RAG Institucional:**
   - Regras inegociáveis: a IA nunca inventa preços, garantias ou prazos que não estejam cadastrados.
6. **Central de Conversas ao Vivo (Live Chat):**
   - Histórico em tempo real de cada contato.
   - Botão para pausar a automação e assumir o atendimento manualmente.
7. **Simulador Interativo de WhatsApp:**
   - Smartphone virtual integrado no painel para testar respostas, digitação e fotos instantaneamente.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Backend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Banco de Dados:** Supabase (PostgreSQL com Row Level Security e Triggers)
- **Armazenamento de Arquivos:** Supabase Storage (Bucket `whatsapp-media`)
- **API de Mensagens:** WhatsApp Business Cloud API Oficial da Meta (Graph API v20.0)
- **Inteligência Artificial:** Google Gemini (1.5 Flash) e OpenAI (GPT-4o mini)
- **Hospedagem:** Vercel

---

## 📋 Como Configurar e Rodar o Projeto

### 1. Configurar o Banco no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto.
2. Vá em **SQL Editor** no painel do Supabase.
3. Abra o arquivo `supabase/schema.sql` deste projeto, copie todo o conteúdo e execute no SQL Editor.
4. Vá em **Storage**, crie um bucket público chamado `whatsapp-media` para armazenar as fotos enviadas.
5. Em **Project Settings > API**, copie a **Project URL**, a chave **anon (public)** e a **service_role (secret)**.

### 2. Configurar o WhatsApp Cloud API na Meta
1. Acesse o portal [developers.facebook.com](https://developers.facebook.com).
2. Crie ou selecione seu aplicativo do tipo **Negócios (Business)**.
3. Adicione o produto **WhatsApp**.
4. Obtenha seu **Phone Number ID**, **WhatsApp Business Account ID** e um **Token de Acesso Permanente**.
5. Em **Configuração do Webhook**, defina:
   - **URL de Retorno de Chamada:** `https://seu-dominio.vercel.app/api/webhook/whatsapp`
   - **Token de Verificação:** o mesmo valor definido em `WHATSAPP_VERIFY_TOKEN` (padrão: `autozap_secure_token_2026`).
   - Assine o campo: `messages`.

### 3. Rodar Localmente
```bash
# Copiar arquivo de ambiente
cp .env.example .env.local

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

---

## 🚀 Como Publicar na Vercel

1. Suba este projeto para um repositório no seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Nas **Environment Variables** da Vercel, adicione as variáveis presentes no arquivo `.env.example`.
4. Clique em **Deploy**.
5. Copie a URL do seu deploy (ex: `https://meu-autozap.vercel.app`) e adicione no Webhook da Meta:
   `https://meu-autozap.vercel.app/api/webhook/whatsapp`.
