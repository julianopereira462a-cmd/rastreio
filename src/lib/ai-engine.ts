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

// Stopwords em Português para evitar matches falsos em palavras comuns
const PT_STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'pra', 'para', 'com', 'que', 'se', 'um', 'uma', 'uns', 'umas',
  'os', 'as', 'e', 'ou', 'mas', 'mais', 'me', 'te', 'eu', 'voce', 'vc',
  'ele', 'ela', 'o', 'a'
]);

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

// Obter saudação correta pelo fuso horário de Brasília (UTC-3)
function getGreetingByHour(): string {
  const now = new Date();
  const brHour = (now.getUTCHours() - 3 + 24) % 24;
  if (brHour >= 5 && brHour < 12) return 'Bom dia';
  if (brHour >= 12 && brHour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// Extrair prefixo de cumprimento caso o cliente tenha saudado antes da pergunta
function extractGreeting(normalizedInput: string): string {
  if (/\b(boa|boas)\s+(noite|noitre|noitee|noiteee|notie)\b/i.test(normalizedInput)) return 'Boa noite';
  if (/\b(boa|boas)\s+(tarde|tardee)\b/i.test(normalizedInput)) return 'Boa tarde';
  if (/\b(bom|bons)\s+(dia|diaa)\b/i.test(normalizedInput)) return 'Bom dia';
  if (/\b(ola|olá|oii?|oie|opa|salve|eai|eae)\b/i.test(normalizedInput)) return getGreetingByHour();
  return '';
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
  const detectedGreeting = extractGreeting(normalizedInput);

  // 1. TRATAMENTO ULTRA GENTIL PARA SAUDAÇÕES PURAS (Cumprimentos)
  const isGreetingWord = [
    'boa noite', 'boa noitre', 'boanoite', 'boa noitee', 'boa noiteee',
    'bom dia', 'bomdia', 'bom diaa',
    'boa tarde', 'boatarde', 'boa tardee',
    'ola', 'olá', 'olaa', 'oi', 'oii', 'oiii', 'oie',
    'opa', 'e ai', 'eai', 'eae', 'salve',
    'tudo bem', 'td bem', 'tudo bom', 'td bom',
    'como vai', 'fala', 'fala ai'
  ].some((g) => {
    return (
      normalizedInput === g ||
      normalizedInput.startsWith(g + ' ') ||
      normalizedInput.endsWith(' ' + g)
    );
  });

  // Verificação de intenções específicas no texto
  const hasLegitimidadeIntent = [
    'legitima', 'legitimo', 'verdadeira', 'verdadeiro', 'original', 'quente',
    'oficial', 'autentica', 'autentico', 'golpe', 'fraude', 'confiar', 'confiavel',
    'seguro', 'segura', 'garantia', 'garantido', 'blitz', 'prf', 'policia',
    'fiscalizacao', 'detran', 'uber', '99', 'ifood', 'da certo', 'funciona'
  ].some((term) => {
    return new RegExp(`\\b${term}\\b`, 'i').test(normalizedInput);
  });

  const hasCatAIntent = /\b(categoria\s+a|cnh\s+a|cat\s+a|letra\s+a|moto|motocicleta|motoquinha|duas\s+rodas|da\s+a|pra\s+a)\b/i.test(normalizedInput);
  const hasCatBIntent = /\b(categoria\s+b|cnh\s+b|cat\s+b|letra\s+b|carro|automovel|quatro\s+rodas|da\s+b|pra\s+b)\b/i.test(normalizedInput);
  const hasCatCIntent = /\b(categoria\s+c|cnh\s+c|cat\s+c|letra\s+c|caminhao|da\s+c|pra\s+c)\b/i.test(normalizedInput);
  const hasCatDIntent = /\b(categoria\s+d|cnh\s+d|cat\s+d|letra\s+d|onibus|van|da\s+d|pra\s+d)\b/i.test(normalizedInput);
  const hasCatEIntent = /\b(categoria\s+e|cnh\s+e|cat\s+e|letra\s+e|carreta|da\s+e|pra\s+e)\b/i.test(normalizedInput);

  const hasFisicaIntent = /\b(fisica|impressa|impresso|papel|plastificada|cartao)\b/i.test(normalizedInput);
  const hasDocumentosIntent = /\b(documento|documentos|documentacao|rg|cpf|comprovante|requisito)\b/i.test(normalizedInput);

  const hasSpecificDoubt =
    hasLegitimidadeIntent ||
    hasCatAIntent ||
    hasCatBIntent ||
    hasCatCIntent ||
    hasCatDIntent ||
    hasCatEIntent ||
    hasFisicaIntent ||
    hasDocumentosIntent ||
    /\b(cnh|valor|preco|quanto|custa|demora|prazo|dias)\b/i.test(normalizedInput);

  // Se a pessoa apenas saudou (ex: "boa noite", "boa noitre", "bom dia", "olá", "oi tudo bem?")
  if (isGreetingWord && !hasSpecificDoubt) {
    const greetingToUse = detectedGreeting || timeGreeting;

    const greetingsResponses = [
      `Olá! ${greetingToUse}! Tudo bem com você? Como posso te ajudar hoje? 😊`,
      `${greetingToUse}! Seja muito bem-vindo! Em que posso te ajudar hoje?`,
      `Olá, ${greetingToUse}! Tudo bem? Me conta como posso te orientar!`,
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
      score += 150;
    } else if (normalizedInput.includes(normalizedQuestion)) {
      score += 90;
    } else if (normalizedQuestion.includes(normalizedInput) && normalizedInput.length >= 3) {
      score += 85;
    }

    // 3.2 Variações cadastradas do FAQ
    if (Array.isArray(faq.question_variations)) {
      for (const v of faq.question_variations) {
        const normV = normalizeBrText(v);
        if (normV && normV.length >= 2) {
          if (normalizedInput === normV) {
            score += 120;
          } else if (normalizedInput.includes(normV) || normV.includes(normalizedInput)) {
            score += 80;
          }
        }
      }
    }

    // 3.3 Palavras-chave cadastradas
    if (Array.isArray(faq.keywords)) {
      for (const kw of faq.keywords) {
        const normKw = normalizeBrText(kw);
        if (normKw) {
          if (new RegExp(`\\b${normKw}\\b`, 'i').test(normalizedInput)) {
            score += 45;
          }
        }
      }
    }

    // 3.4 INTENÇÃO: LEGITIMIDADE / ORIGINAL / QUENTE / VERDADEIRA / CONFIÁVEL / GOLPE
    const isFaqLegitimidade =
      /legitima|verdadeira|original|quente|oficial|blitz|fiscalizacao|confiar|golpe/i.test(normalizedQuestion) ||
      /legitima|original|blitz|fiscalizacao|prf|uber/i.test(normalizedAnswer);

    if (hasLegitimidadeIntent && isFaqLegitimidade) {
      score += 250; // Boost definitivo para o FAQ de legitimidade!
    }

    // 3.5 INTENÇÕES DE CATEGORIA (A, B, C, D, E)
    const isFaqCatA = /categoria a|cnh a|moto/i.test(normalizedQuestion);
    const isFaqCatB = /categoria b|cnh b|carro/i.test(normalizedQuestion);
    const isFaqCatC = /categoria c|cnh c|caminhao/i.test(normalizedQuestion);
    const isFaqCatD = /categoria d|cnh d|onibus/i.test(normalizedQuestion);
    const isFaqCatE = /categoria e|cnh e|carreta/i.test(normalizedQuestion);

    if (hasCatAIntent) {
      if (isFaqCatA) score += 250;
      else if (isFaqCatB || isFaqCatC || isFaqCatD || isFaqCatE) score -= 150;
    }
    if (hasCatBIntent) {
      if (isFaqCatB) score += 250;
      else if (isFaqCatA || isFaqCatC || isFaqCatD || isFaqCatE) score -= 150;
    }
    if (hasCatCIntent) {
      if (isFaqCatC) score += 250;
      else if (isFaqCatA || isFaqCatB || isFaqCatD || isFaqCatE) score -= 150;
    }
    if (hasCatDIntent) {
      if (isFaqCatD) score += 250;
      else if (isFaqCatA || isFaqCatB || isFaqCatC || isFaqCatE) score -= 150;
    }
    if (hasCatEIntent) {
      if (isFaqCatE) score += 250;
      else if (isFaqCatA || isFaqCatB || isFaqCatC || isFaqCatD) score -= 150;
    }

    // 3.6 INTENÇÃO: CNH FÍSICA
    const isFaqFisica = /fisica|impressa|papel/i.test(normalizedQuestion);
    if (hasFisicaIntent && isFaqFisica) {
      score += 250;
    } else if (hasFisicaIntent && !isFaqFisica && /digital/i.test(normalizedQuestion)) {
      score -= 100;
    }

    // 3.7 INTENÇÃO: DOCUMENTOS
    const isFaqDocumentos = /documentos|documentacao/i.test(normalizedQuestion);
    if (hasDocumentosIntent && isFaqDocumentos) {
      score += 250;
    }

    // 3.8 Palavras em comum SEM STOPWORDS (evita que 'da', 'de', 'para' gerem matches falsos)
    const filterTokens = (w: string) => !PT_STOPWORDS.has(w) && w.length >= 2;
    const inputWords = normalizedInput.split(' ').filter(filterTokens);
    const questionWords = normalizedQuestion.split(' ').filter(filterTokens);

    let commonCount = 0;
    for (const iw of inputWords) {
      if (questionWords.includes(iw)) commonCount++;
    }
    if (questionWords.length > 0 && commonCount > 0) {
      score += (commonCount / Math.max(inputWords.length, questionWords.length)) * 50;
    }

    if (score > highestScore && score >= 35) {
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

  // Se houve match com FAQ acima do limiar
  if (bestFaqMatch && highestScore >= 35) {
    let finalAnswer = formatAnswerPolitely(bestFaqMatch);

    // Se o cliente cumprimentou na mesma mensagem (ex: "Boa noite, é quente?"), responde gentilmente com a saudação!
    if (detectedGreeting && !finalAnswer.toLowerCase().startsWith(detectedGreeting.toLowerCase())) {
      finalAnswer = `${detectedGreeting}! ${finalAnswer}`;
    }

    return {
      text: finalAnswer,
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
  const greetingToUse = detectedGreeting || timeGreeting;
  return {
    text: `Olá! ${greetingToUse}! Tudo bem? Me conta certinho: você precisa de CNH Categoria A (moto), B (carro) ou C (caminhão)? Já te passo os valores e detalhes na hora! 😊`,
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
