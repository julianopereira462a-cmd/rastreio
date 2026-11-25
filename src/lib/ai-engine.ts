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

// Obter saudação correta pelo fuso horário de Brasília (UTC-3)
function getGreetingByHour(): string {
  const now = new Date();
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  if (brHour >= 5 && brHour < 12) return 'Bom dia';
  if (brHour >= 12 && brHour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/**
 * Motor de Inteligência Artificial Contextual, Empático e Gentil para WhatsApp
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
  const timeGreeting = getGreetingByHour();

  // 1. TRATAMENTO ULTRA GENTIL PARA SAUDAÇÕES (Cumprimentos)
  const isGreeting = [
    'boa noite', 'boa noitre', 'boanoite',
    'bom dia', 'bomdia',
    'boa tarde', 'boatarde',
    'ola', 'olá', 'oi', 'oii', 'oiii',
    'opa', 'e ai', 'eai',
    'tudo bem', 'td bem', 'tudo bom', 'td bom',
    'como vai', 'fala'
  ].some((g) => normalizedInput === g || normalizedInput.startsWith(g + ' ') || normalizedInput.endsWith(' ' + g));

  const hasSpecificDoubt = Object.values(SYNONYM_GROUPS).some((group) =>
    group.some((w) => normalizedInput.includes(w))
  );

  // Se a pessoa apenas saudou (ex: "boa noite", "olá", "bom dia"), responde com carinho, educação e presteza
  if (isGreeting && !hasSpecificDoubt) {
    let saudacao = timeGreeting;
    if (normalizedInput.includes('noite') || normalizedInput.includes('noitre')) saudacao = 'Boa noite';
    else if (normalizedInput.includes('tarde')) saudacao = 'Boa tarde';
    else if (normalizedInput.includes('dia')) saudacao = 'Bom dia';

    const greetingsResponses = [
      `Olá! ${saudacao}! Tudo bem com você? Como posso te ajudar hoje? 😊`,
      `${saudacao}! Seja muito bem-vindo! Em que posso te ajudar hoje?`,
      `Olá, ${saudacao}! Tudo bem? Me conta como posso te orientar!`,
    ];

    return {
      text: greetingsResponses[Math.floor(Math.random() * greetingsResponses.length)],
      confidence: 100,
    };
  }

  // 2. TRATAMENTO PARA AGRADECIMENTOS
  const isGratitude = [
    'obrigado', 'obrigada', 'valeu', 'show', 'agradeco', 'obg', 'blz', 'beleza', 'perfeito', 'otimo'
  ].some((ag) => normalizedInput === ag || normalizedInput.startsWith(ag + ' '));

  if (isGratitude && !hasSpecificDoubt) {
    return {
      text: `Por nada! Qualquer outra dúvida ou se precisar de algo mais, estou sempre por aqui! Conte comigo! 👍`,
      confidence: 100,
    };
  }

  // 3. MATCHING SEMÂNTICO EXPERTO E ÁGIL COM OS FAQS
  let bestFaqMatch: FAQ | null = null;
  let highestScore = 0;

  for (const faq of availableFaqs) {
    if (!faq.is_active) continue;

    let score = 0;
    const normalizedQuestion = normalizeBrText(faq.question);
    const normalizedAnswer = normalizeBrText(faq.answer);

    // Match direto
    if (normalizedInput === normalizedQuestion || normalizedInput.includes(normalizedQuestion)) {
      score += 60;
    }

    // Palavras em comum
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

    // Detecção Inteligente de Sinônimos
    for (const group of Object.values(SYNONYM_GROUPS)) {
      const hasInputGroup = inputWords.some((w) => group.includes(w));
      const hasQuestionGroup = questionWords.some((w) => group.includes(w));
      const hasAnswerGroup = group.some((g) => normalizedAnswer.includes(g));

      if (hasInputGroup && (hasQuestionGroup || hasAnswerGroup)) {
        score += 35;
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

  // Se houve match com FAQ de alta confiança, já entrega a resposta oficial cadastrada com toda gentileza!
  if (bestFaqMatch && highestScore >= 35) {
    return {
      text: bestFaqMatch.answer,
      matchedFaq: bestFaqMatch,
      mediaToSend,
      confidence: Math.min(100, Math.round(highestScore)),
    };
  }

  // 4. CONSTRUÇÃO DO CONTEXTO RAG PARA CASOS COMPLEXOS
  const faqContext = availableFaqs
    .filter((f) => f.is_active)
    .map(
      (f, i) =>
        `[ITEM ${i + 1}] Pergunta: "${f.question}"\nResposta Oficial: "${f.answer}"${f.media_url ? ' (Contém Foto)' : ''}`
    )
    .join('\n\n');

  const historyText = conversationHistory
    .slice(-6)
    .map((msg) => {
      const sender = msg.sender_type === 'contact' ? 'Cliente' : 'Atendente';
      return `${sender}: ${msg.content}`;
    })
    .join('\n');

  const systemPrompt = `
Você é o atendente de WhatsApp da empresa "${settings.company_name || 'nossa equipe'}".
Seu tom é EXTREMAMENTE gentil, acolhedor, profissional e prestativo.
- Sempre cumprimente com educação (ex: "Olá! Tudo bem?").
- Responda de forma clara, natural e humana (estilo WhatsApp do Brasil).
- NUNCA diga que é robô ou IA.
- Use as respostas oficiais cadastradas sempre que o assunto coincidir.

PERGUNTAS E RESPOSTAS CADASTRADAS:
${faqContext || 'Nenhuma'}
`;

  // 5. TENTATIVA COM IA OU FALLBACK SUPER GENTIL
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

    if (aiResponseText && aiResponseText.length > 3) {
      return {
        text: aiResponseText,
        matchedFaq: bestFaqMatch || undefined,
        mediaToSend,
        confidence: 85,
      };
    }
  } catch (error: any) {
    console.warn('[AI Engine Error - Usando Fallback Gentil]');
  }

  // Fallback se houver algum FAQ detectado
  if (bestFaqMatch) {
    return {
      text: bestFaqMatch.answer,
      matchedFaq: bestFaqMatch,
      mediaToSend,
      confidence: 90,
    };
  }

  // Fallback humanizado e ultra gentil
  return {
    text: `Olá! ${timeGreeting}! Tudo bem? Seja muito bem-vindo! Me conta certinho o que você precisa que eu já te oriento na hora! 😊`,
    confidence: 60,
  };
}

/**
 * Chamada com suporte a modelos Gemini e OpenAI
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
Histórico da conversa:
${historyText || '(Início)'}

Cliente (${clientName || 'Novo Contato'}): ${clientMessage}
Atendente:`;

  if (!apiKey) {
    return '';
  }

  // Tentativa Gemini com timeout de 5 segundos
  if (provider === 'gemini' || !provider) {
    const modelsToTry = [model, 'gemini-2.5-flash', 'gemini-flash-latest'].filter(Boolean);

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4500);

        const res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${promptUser}` }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          }),
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return cleanResponse(text);
        }
      } catch (e) {
        // Tenta próximo modelo
      }
    }

    return '';
  }

  // OpenAI / Groq
  const endpoint =
    provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const defaultModel = provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o-mini';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  const res = await fetch(endpoint, {
    method: 'POST',
    signal: controller.signal,
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
      temperature: 0.7,
      max_tokens: 350,
    }),
  });
  clearTimeout(timeout);

  if (res.ok) {
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (text) return cleanResponse(text);
  }

  return '';
}

function cleanResponse(text: string): string {
  return text
    .replace(/^Atendente:\s*/i, '')
    .replace(/^Sistema:\s*/i, '')
    .trim();
}
