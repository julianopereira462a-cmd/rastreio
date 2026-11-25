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

// Mapa de Categorias de CNH e Veículos
const CATEGORY_MAP: Record<string, string[]> = {
  a: ['categoria a', 'cnh a', 'moto', 'motocicleta', 'carteira a', 'habilitacao a', 'letra a', 'motoquinha', 'duas rodas'],
  b: ['categoria b', 'cnh b', 'carro', 'automovel', 'carteira b', 'habilitacao b', 'letra b', 'quatro rodas'],
  ab: ['categoria ab', 'cnh ab', 'carro e moto', 'moto e carro', 'ab'],
  c: ['categoria c', 'cnh c', 'caminhao'],
  d: ['categoria d', 'cnh d', 'onibus', 'van'],
  e: ['categoria e', 'cnh e', 'carreta'],
};

// Dicionário de Sinônimos e Intenções Comuns de WhatsApp
const SYNONYM_GROUPS: Record<string, string[]> = {
  legitimidade: [
    'verdadeira', 'legitima', 'original', 'quente', 'oficial', 'autentica',
    'valida', 'funciona', 'confiavel', 'golpe', 'seguro', 'confiar', 'garantido'
  ],
  preco: [
    'valor', 'preco', 'quanto custa', 'quanto e', 'quanto sai', 'tabela', 'pagar', 'pix', 'cartao', 'custa', 'valores', 'quanto ta'
  ],
  prazo: [
    'prazo', 'demora', 'tempo', 'dias', 'quando fica pronto', 'rapido', 'horas', 'entrega', 'entregar', 'chega', 'demorar', 'demoram'
  ],
  documentos: [
    'documentos', 'documentacao', 'preciso', 'enviar', 'foto', 'rg', 'cpf', 'comprovante', 'requisito', 'mandar', 'necessario', 'necessarios'
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

// Formatar resposta educada e completa se o usuário cadastrou apenas número
function formatAnswerPolitely(faq: FAQ): string {
  const ans = faq.answer.trim();
  // Se for apenas um número puro como "700" ou "R$ 700"
  if (/^R?\$?\s*\d+(\.\d{3})*(,\d{2})?$/.test(ans)) {
    const cleanNum = ans.replace(/[^\d]/g, '');
    const num = Number(cleanNum);
    const formatted = !isNaN(num) ? `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ans;
    return `O valor para ${faq.question.replace(/\?+/g, '').trim()} é de ${formatted} à vista no PIX, ou parcelado em até 12x no cartão de crédito! Você gostaria de dar início ao processo ou tem alguma dúvida?`;
  }
  return ans;
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

  // 1. TRATAMENTO ULTRA GENTIL PARA SAUDAÇÕES PURAS (Cumprimentos)
  const isGreetingWord = [
    'boa noite', 'boa noitre', 'boanoite',
    'bom dia', 'bomdia',
    'boa tarde', 'boatarde',
    'ola', 'olá', 'oi', 'oii', 'oiii',
    'opa', 'e ai', 'eai',
    'tudo bem', 'td bem', 'tudo bom', 'td bom',
    'como vai', 'fala'
  ].some((g) => normalizedInput === g || normalizedInput.startsWith(g + ' ') || normalizedInput.endsWith(' ' + g));

  const hasSpecificCategory = Object.values(CATEGORY_MAP).some((group) =>
    group.some((w) => normalizedInput.includes(w) || (' ' + normalizedInput + ' ').includes(' ' + w + ' '))
  );

  const hasSpecificDoubt =
    hasSpecificCategory ||
    Object.values(SYNONYM_GROUPS).some((group) =>
      group.some((w) => normalizedInput.includes(w))
    ) ||
    normalizedInput.includes('cnh');

  // Se a pessoa apenas saudou (sem perguntar nada de produto ou categoria)
  if (isGreetingWord && !hasSpecificDoubt) {
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

    // 3.1 Match exato ou substring mútua
    if (normalizedInput === normalizedQuestion) {
      score += 100;
    } else if (normalizedInput.includes(normalizedQuestion)) {
      score += 75;
    } else if (normalizedQuestion.includes(normalizedInput) && normalizedInput.length >= 3) {
      // Ex: "cnh a" dentro de "qual valor da categoria a cnh a"
      score += 80;
    }

    // 3.2 Variações cadastradas do FAQ
    if (Array.isArray(faq.question_variations)) {
      for (const v of faq.question_variations) {
        const normV = normalizeBrText(v);
        if (normV && normV.length >= 2) {
          if (normalizedInput === normV) score += 95;
          else if (normalizedInput.includes(normV) || normV.includes(normalizedInput)) score += 70;
        }
      }
    }

    // 3.3 Palavras-chave cadastradas
    if (Array.isArray(faq.keywords)) {
      for (const kw of faq.keywords) {
        const normKw = normalizeBrText(kw);
        if (normKw && normalizedInput.includes(normKw)) score += 35;
      }
    }

    // 3.4 Detecção de Categorias de Habilitação (A, B, AB, C, D, E)
    for (const [cat, syns] of Object.entries(CATEGORY_MAP)) {
      const paddedInput = ' ' + normalizedInput + ' ';
      const paddedQ = ' ' + normalizedQuestion + ' ';
      const inputHasCat = syns.some((item) => paddedInput.includes(' ' + item + ' ') || normalizedInput.includes(item));
      const faqHasCat = syns.some((item) => paddedQ.includes(' ' + item + ' ') || normalizedQuestion.includes(item));

      if (inputHasCat && faqHasCat) {
        score += 85; // Mesma categoria encontrada!
      } else if (inputHasCat && !faqHasCat && normalizedQuestion.includes('cnh digital')) {
        score -= 45; // Penaliza FAQ genérico de CNH Digital se o cliente pediu categoria específica
      }
    }

    // 3.5 Palavras em comum (mantendo letras de categoria a, b, c, d, e)
    const isMeaningful = (w: string) => w.length >= 2 || ['a', 'b', 'c', 'd', 'e'].includes(w);
    const inputWords = normalizedInput.split(' ').filter(isMeaningful);
    const questionWords = normalizedQuestion.split(' ').filter(isMeaningful);

    let commonCount = 0;
    for (const iw of inputWords) {
      if (questionWords.includes(iw)) commonCount++;
    }
    if (questionWords.length > 0 && commonCount > 0) {
      score += (commonCount / Math.max(inputWords.length, questionWords.length)) * 50;
    }

    // 3.6 Grupos de Sinônimos (preço, prazo, legitimidade, documentos)
    for (const group of Object.values(SYNONYM_GROUPS)) {
      const hasInputGroup = inputWords.some((w) => group.includes(w)) || group.some((g) => normalizedInput.includes(g));
      const hasQuestionGroup = questionWords.some((w) => group.includes(w)) || group.some((g) => normalizedQuestion.includes(g));
      const hasAnswerGroup = group.some((g) => normalizedAnswer.includes(g));

      if (hasInputGroup && (hasQuestionGroup || hasAnswerGroup)) {
        score += 40;
      }
    }

    if (score > highestScore && score >= 25) {
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
      caption: bestFaqMatch.media_caption || formatAnswerPolitely(bestFaqMatch).slice(0, 150),
      filename: bestFaqMatch.media_filename,
    };
  }

  // Se houve match com FAQ acima do limiar, já entrega a resposta oficial formatada com carinho!
  if (bestFaqMatch && highestScore >= 35) {
    return {
      text: formatAnswerPolitely(bestFaqMatch),
      matchedFaq: bestFaqMatch,
      mediaToSend,
      confidence: Math.min(100, Math.round(highestScore)),
    };
  }

  // 4. CONSTRUÇÃO DO CONTEXTO RAG PARA IA
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
Você é o atendente de WhatsApp da empresa "${settings.company_name || 'Assessoria CNH'}".
Seu tom é EXTREMAMENTE gentil, prestativo, educado e natural (WhatsApp do Brasil).
- Se o cliente perguntar de preços, prazos ou documentos, responda ESTRITAMENTE com base nos itens cadastrados:
${faqContext}

NUNCA diga que é robô ou IA.
`;

  // 5. TENTATIVA COM IA OU FALLBACK GENTIL
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

    if (aiResponseText && aiResponseText.length > 5) {
      return {
        text: aiResponseText,
        matchedFaq: bestFaqMatch || undefined,
        mediaToSend,
        confidence: 85,
      };
    }
  } catch (error: any) {
    console.warn('[AI Engine Error - Fallback]');
  }

  // Se teve algum match mínimo
  if (bestFaqMatch) {
    return {
      text: formatAnswerPolitely(bestFaqMatch),
      matchedFaq: bestFaqMatch,
      mediaToSend,
      confidence: 85,
    };
  }

  // Fallback acolhedor e prestativo
  return {
    text: `Olá! ${timeGreeting}! Tudo bem? Me conta certinho: você precisa de CNH Categoria A (moto), B (carro) ou renovação? Já te passo os valores e detalhes na hora! 😊`,
    confidence: 60,
  };
}

/**
 * Chamada de LLM com timeout resiliente
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

  if (!apiKey) return '';

  if (provider === 'gemini' || !provider) {
    const modelsToTry = [model, 'gemini-2.5-flash', 'gemini-flash-latest'].filter(Boolean);

    for (const m of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${promptUser}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 350 },
          }),
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return cleanResponse(text);
        }
      } catch (e) {}
    }
    return '';
  }

  const endpoint =
    provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

  const defaultModel = provider === 'groq' ? 'llama-3.1-70b-versatile' : 'gpt-4o-mini';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

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
