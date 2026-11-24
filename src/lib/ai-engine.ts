import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

interface GenerateResponseInput {
  incomingMessage: string;
  contactWaId: string;
  contactName?: string;
  conversationHistory: Message[];
  settings: SystemSettings;
  availableFaqs: FAQ[];
  knowledgeBase: KnowledgeItem[];
}

interface AIResponseOutput {
  text: string;
  matchedFaq?: FAQ;
  mediaToSend?: {
    url: string;
    type: 'image' | 'document' | 'video' | 'audio';
    caption?: string;
    filename?: string;
  };
  confidence: number;
}

// Normalizador de texto para Português do Brasil (remove acentos e pontuação)
function normalizeBrText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^\w\s]/gi, ' ') // remove pontuação
    .replace(/\s+/g, ' ')
    .trim();
}

// Dicionário de Sinônimos e Intenções Comuns de WhatsApp
const SYNONYM_GROUPS: Record<string, string[]> = {
  legitimidade: [
    'verdadeira', 'legitima', 'original', 'quente', 'oficial', 'autentica',
    'valida', 'funciona', 'confiavel', 'golpe', 'seguro', 'confiar', 'garantido'
  ],
  preco: [
    'valor', 'preco', 'quanto custa', 'quanto e', 'quanto sai', 'tabela', 'pagar', 'pix', 'cartao'
  ],
  prazo: [
    'prazo', 'demora', 'tempo', 'dias', 'quando fica pronto', 'rapido', 'horas'
  ],
  documentos: [
    'documentos', 'preciso', 'enviar', 'foto', 'rg', 'cpf', 'comprovante', 'requisito'
  ]
};

/**
 * Motor de Inteligência Artificial Contextual e Semântico para WhatsApp
 */
export async function generateAIWhatsAppResponse(
  input: GenerateResponseInput
): Promise<AIResponseOutput> {
  const {
    incomingMessage,
    contactName,
    conversationHistory,
    settings,
    availableFaqs,
    knowledgeBase,
  } = input;

  const normalizedInput = normalizeBrText(incomingMessage);

  // 1. MATCHING SEMÂNTICO EXPERTO E ÁGIL
  let bestFaqMatch: FAQ | null = null;
  let highestScore = 0;

  for (const faq of availableFaqs) {
    if (!faq.is_active) continue;

    let score = 0;
    const normalizedQuestion = normalizeBrText(faq.question);
    const normalizedAnswer = normalizeBrText(faq.answer);

    // 1.1 Match direto
    if (normalizedInput === normalizedQuestion || normalizedInput.includes(normalizedQuestion)) {
      score += 60;
    }

    // 1.2 Palavras em comum com peso semântico
    const inputWords = normalizedInput.split(' ').filter((w) => w.length > 2);
    const questionWords = normalizedQuestion.split(' ').filter((w) => w.length > 2);

    let commonWordsCount = 0;
    for (const iw of inputWords) {
      if (questionWords.includes(iw)) {
        commonWordsCount++;
      }
    }

    if (questionWords.length > 0 && commonWordsCount > 0) {
      score += (commonWordsCount / questionWords.length) * 45;
    }

    // 1.3 Detecção Inteligente de Sinônimos (Ex: "é verdadeira?" -> "é original?")
    for (const group of Object.values(SYNONYM_GROUPS)) {
      const hasInputGroup = inputWords.some((w) => group.includes(w));
      const hasQuestionGroup = questionWords.some((w) => group.includes(w));
      const hasAnswerGroup = group.some((g) => normalizedAnswer.includes(g));

      if (hasInputGroup && (hasQuestionGroup || hasAnswerGroup)) {
        score += 35; // Forte impulso semântico por intenção equivalente
      }
    }

    if (score > highestScore && score >= 20) {
      highestScore = score;
      bestFaqMatch = faq;
    }
  }

  // Foto / Mídia vinculada se houver match
  let mediaToSend = undefined;
  if (bestFaqMatch && bestFaqMatch.media_url) {
    mediaToSend = {
      url: bestFaqMatch.media_url,
      type: bestFaqMatch.media_type || 'image',
      caption: bestFaqMatch.media_caption || bestFaqMatch.answer.slice(0, 150),
      filename: bestFaqMatch.media_filename,
    };
  }

  // 2. CONSTRUÇÃO DO CONTEXTO RELEVANTE (RAG)
  const faqContext = availableFaqs
    .filter((f) => f.is_active)
    .map(
      (f, i) =>
        `[ITEM ${i + 1}] Pergunta: "${f.question}"\nResposta Oficial: "${f.answer}"${f.media_url ? ' (Contém Foto)' : ''}`
    )
    .join('\n\n');

  const historyText = conversationHistory
    .slice(-8)
    .map((msg) => {
      const sender = msg.sender_type === 'contact' ? 'Cliente' : 'Atendente';
      return `${sender}: ${msg.content}`;
    })
    .join('\n');

  // 3. SYSTEM PROMPT DE ALTA INTELIGÊNCIA E EMPATIA
  const systemPrompt = `
Você é o atendente de WhatsApp da empresa "${settings.company_name}".
Seu foco é atender com rapidez, máxima simpatia, naturalidade e total segurança.

COMO ENTENDER O CLIENTE COM ESPERTEZA:
- O cliente pode perguntar de várias maneiras diferentes usando gírias ou sinônimos:
  Exemplo: "é verdadeira?", "é original?", "é legítima?", "é quente?", "funciona mesmo?", "é golpe?", "posso confiar?".
  Todas essas perguntas têm a MESMA intenção de checar a autenticidade e segurança.
- Identifique o real significado da pergunta do cliente e responda com a RESPOSTA CADASTRADA correspondente.
- NUNCA diga frases como "sou um atendente virtual", "sou uma IA" ou "sou um robô". Fale como uma pessoa brasileira real no WhatsApp.
- Seja ágil, direto e seguro nas respostas. Use parágrafos curtos e quebras de linha agradáveis.
- Se o cliente perguntar algo sobre preço, prazos ou garantias, responda ESTRITAMENTE com base no que está cadastrado. Nunca invente valores.

PERGUNTAS E RESPOSTAS CADASTRADAS NO SISTEMA:
${faqContext || 'Nenhuma pergunta cadastrada ainda.'}

${bestFaqMatch ? `INTENÇÃO DETECTADA PELO SISTEMA: A dúvida do cliente corresponde à pergunta "${bestFaqMatch.question}". Use como base a resposta oficial: "${bestFaqMatch.answer}".` : ''}
`;

  // 4. CHAMADA AO MODELO DE IA
  try {
    const aiResponseText = await callLLM({
      provider: settings.ai_provider,
      apiKey: settings.ai_api_key || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || '',
      model: settings.ai_model_name,
      systemPrompt,
      historyText,
      clientMessage: incomingMessage,
      clientName: contactName,
    });

    return {
      text: aiResponseText,
      matchedFaq: bestFaqMatch || undefined,
      mediaToSend,
      confidence: highestScore > 0 ? Math.min(100, Math.round(highestScore)) : 80,
    };
  } catch (error: any) {
    console.error('[AI Engine Error]', error);

    // Fallback inteligente: se detectou a intenção semântica, usa a resposta cadastrada diretamente!
    if (bestFaqMatch) {
      return {
        text: bestFaqMatch.answer,
        matchedFaq: bestFaqMatch,
        mediaToSend,
        confidence: 90,
      };
    }

    return {
      text: `Entendi perfeitamente sua dúvida! Me conta um pouco mais para eu te orientar certinho.`,
      confidence: 50,
    };
  }
}

/**
 * Chamada unificada para Gemini e OpenAI via API REST
 */
async function callLLM({
  provider,
  apiKey,
  model,
  systemPrompt,
  historyText,
  clientMessage,
  clientName,
}: {
  provider: 'gemini' | 'openai' | 'groq';
  apiKey: string;
  model: string;
  systemPrompt: string;
  historyText: string;
  clientMessage: string;
  clientName?: string;
}): Promise<string> {
  const promptUser = `
Histórico recente da conversa:
${historyText || '(Início da conversa)'}

Cliente (${clientName || 'Novo Contato'}): ${clientMessage}

Atendente:`;

  if (!apiKey) {
    return `Sim, com certeza! Todos os nossos processos são 100% legítimos e oficiais, com acompanhamento direto até a conclusão. Como posso te orientar nos próximos passos?`;
  }

  // 1. Google Gemini API
  if (provider === 'gemini' || !provider) {
    const geminiModel = model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\n${promptUser}` }],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 400,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'Erro Gemini');

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return cleanResponse(text || '');
  }

  // 2. OpenAI / Groq
  const endpoint =
    provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const defaultModel = provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o-mini';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptUser },
      ],
      temperature: 0.6,
      max_tokens: 400,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro OpenAI');

  const text = data?.choices?.[0]?.message?.content;
  return cleanResponse(text || '');
}

function cleanResponse(text: string): string {
  return text
    .replace(/^Atendente:\s*/i, '')
    .replace(/^Sistema:\s*/i, '')
    .trim();
}
