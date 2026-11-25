import { FAQ, KnowledgeItem, Message, SystemSettings } from '@/types';

export interface GenerateResponseInput {
  incomingMessage: string;
  contactWaId: string;
  contactName?: string;
  conversationHistory: Message[];
  settings: SystemSettings;
  availableFaqs: FAQ[];
  knowledgeBase: KnowledgeItem[];
}

export interface GenerateMultiMessageInput {
  incomingMessages: string[];
  contactWaId: string;
  contactName?: string;
  conversationHistory: Message[];
  settings: SystemSettings;
  availableFaqs: FAQ[];
  knowledgeBase: KnowledgeItem[];
}

export interface AIResponseOutput {
  text: string;
  matchedFaq?: FAQ;
  matchedFaqs?: FAQ[];
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

// Extrair sub-perguntas caso o usuário tenha cadastrado várias perguntas em um único campo separadas por ? ou /
function extractSubQuestions(text: string): string[] {
  const parts = text.split(/[?,/]/);
  const results: string[] = [];
  for (const p of parts) {
    const n = normalizeBrText(p);
    if (n.length >= 2) results.push(n);
  }
  const full = normalizeBrText(text);
  if (full && !results.includes(full)) results.push(full);
  return results;
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

  // Verificação de intenções específicas no texto com regex de fronteira de palavras (\b)
  const hasLegitimidadeIntent =
    /\b(legitima|legitimo|verdadeira|verdadeiro|verdade|real|original|quente|oficial|autentica|autentico|golpe|fraude|confiar|confiavel|confianca|seguro|segura|garantia|garantido|blitz|prf|policia|guarda|fiscalizacao|uber|99|ifood|da certo|funciona|valida|legalizada)\b/i.test(normalizedInput);

  const hasCatABIntent =
    /\b(categoria\s+ab|cnh\s+ab|cat\s+ab|cat\.\s*ab|ab|carro\s+e\s+moto|moto\s+e\s+carro|duas\s+e\s+quatro\s+rodas)\b/i.test(normalizedInput);

  const hasCatAIntent =
    !hasCatABIntent && (
      /\b(categoria\s+a|cnh\s+a|cat\s+a|cat\.\s*a|letra\s+a|carteira\s+a|habilitacao\s+a|moto|motocicleta|motoquinha|duas\s+rodas|pra\s+moto|de\s+moto|da\s+a)\b/i.test(normalizedInput) ||
      /\b(valor|preco|quanto|custa|sai|tabela)\b.*\b(moto|motocicleta)\b/i.test(normalizedInput) ||
      /\b(moto|motocicleta)\b.*\b(valor|preco|quanto|custa|sai|tabela)\b/i.test(normalizedInput) ||
      normalizedInput === 'a'
    );

  const hasCatBIntent =
    !hasCatABIntent && (
      /\b(categoria\s+b|cnh\s+b|cat\s+b|cat\.\s*b|letra\s+b|carteira\s+b|habilitacao\s+b|carro|automovel|quatro\s+rodas|pra\s+carro|de\s+carro|da\s+b)\b/i.test(normalizedInput) ||
      /\b(valor|preco|quanto|custa|sai|tabela)\b.*\b(carro|automovel)\b/i.test(normalizedInput) ||
      /\b(carro|automovel)\b.*\b(valor|preco|quanto|custa|sai|tabela)\b/i.test(normalizedInput) ||
      normalizedInput === 'b'
    );

  const hasCatCIntent =
    /\b(categoria\s+c|cnh\s+c|cat\s+c|cat\.\s*c|letra\s+c|carteira\s+c|habilitacao\s+c|caminhao|caminhão|pra\s+caminhao|de\s+caminhao|da\s+c)\b/i.test(normalizedInput) ||
    /\b(valor|preco|quanto|custa|sai|tabela)\b.*\b(caminhao|caminhão)\b/i.test(normalizedInput) ||
    /\b(caminhao|caminhão)\b.*\b(valor|preco|quanto|custa|sai|tabela)\b/i.test(normalizedInput) ||
    normalizedInput === 'c';

  const hasCatDIntent =
    /\b(categoria\s+d|cnh\s+d|cat\s+d|cat\.\s*d|letra\s+d|carteira\s+d|onibus|van|pra\s+onibus|de\s+onibus|da\s+d)\b/i.test(normalizedInput) ||
    normalizedInput === 'd';

  const hasCatEIntent =
    /\b(categoria\s+e|cnh\s+e|cat\s+e|cat\.\s*e|letra\s+e|carteira\s+e|carreta|pra\s+carreta|de\s+carreta|da\s+e)\b/i.test(normalizedInput) ||
    normalizedInput === 'e';

  const hasFisicaIntent =
    /\b(fisica|impressa|impresso|papel|plastificada|cartao|entregue em casa|via impressa|emitem a fisica|emite a fisica|tem a fisica|carteira de papel|correio|sedex)\b/i.test(normalizedInput);

  const hasPagamentoIntent =
    /\b(paga|pagar|pagamento|antes|depois|quando paga|quando pagar|quando eu pago|forma de pagamento|entrada|adiantado|antecipado|precisa pagar|paga na entrega|paga pronta|pix|cartao|parcela|parcelamento|como pago|como pagar|cobra antes|da entrada)\b/i.test(normalizedInput);

  const hasAulasProvasIntent =
    /\b(prova|provas|exame|exames|aula|aulas|autoescola|auto escola|laudo|laudos|detran|psicotecnico|biometria|presencial|precisa comparecer|fazer prova|fazer aula|fazer exame|teste|testes|teorica|pratica)\b/i.test(normalizedInput);

  const hasDocumentosIntent =
    /\b(documento|documentos|documentacao|rg|cpf|comprovante|requisito|precisa enviar|mandar foto|o que precisa|o que mandar|o que enviar|quais documentos|qual documento|papelada)\b/i.test(normalizedInput);

  const hasPrazoIntent =
    /\b(prazo|demora|tempo|quantos dias|quanto tempo|quando fica pronta|fica pronta quando|fica pronto hoje|entrega hoje|demora muito|rapido|quanto tempo leva)\b/i.test(normalizedInput);

  const hasSpecificDoubt =
    hasLegitimidadeIntent ||
    hasCatABIntent ||
    hasCatAIntent ||
    hasCatBIntent ||
    hasCatCIntent ||
    hasCatDIntent ||
    hasCatEIntent ||
    hasFisicaIntent ||
    hasPagamentoIntent ||
    hasAulasProvasIntent ||
    hasDocumentosIntent ||
    hasPrazoIntent ||
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
    const subQuestions = extractSubQuestions(faq.question);
    const normalizedQuestion = normalizeBrText(faq.question);
    const normalizedAnswer = normalizeBrText(faq.answer);

    // 3.1 Match com sub-perguntas (ex: "qual documento você precisa? qual documentação?")
    for (const sq of subQuestions) {
      if (normalizedInput === sq) {
        score += 200;
      } else if (sq.length >= 4 && normalizedInput.includes(sq)) {
        score += 100;
      } else if (normalizedInput.length >= 4 && sq.includes(normalizedInput)) {
        score += 90;
      }
    }

    // 3.2 Variações cadastradas do FAQ
    if (Array.isArray(faq.question_variations)) {
      for (const v of faq.question_variations) {
        const normV = normalizeBrText(v);
        if (normV) {
          if (normalizedInput === normV) {
            score += 180;
          } else if (normV.length >= 4 && normalizedInput.includes(normV)) {
            score += 90;
          } else if (normalizedInput.length >= 4 && normV.includes(normalizedInput)) {
            score += 85;
          } else if (normV.length < 4 && new RegExp(`\\b${normV}\\b`, 'i').test(normalizedInput)) {
            score += 60;
          }
        }
      }
    }

    // 3.3 Palavras-chave cadastradas
    if (Array.isArray(faq.keywords)) {
      for (const kw of faq.keywords) {
        const normKw = normalizeBrText(kw);
        if (normKw && new RegExp(`\\b${normKw}\\b`, 'i').test(normalizedInput)) {
          score += 45;
        }
      }
    }

    // 3.4 INTENÇÃO: LEGITIMIDADE / ORIGINAL / QUENTE / VERDADEIRA / CONFIÁVEL / GOLPE
    const isFaqLegitimidade =
      /legitima|verdadeira|original|quente|oficial|blitz|fiscalizacao|confiar|golpe/i.test(faq.question) ||
      /legitima|original|blitz|fiscalizacao|prf|uber/i.test(normalizedAnswer);

    if (hasLegitimidadeIntent) {
      if (isFaqLegitimidade) score += 350;
      else score -= 150;
    }

    // 3.5 INTENÇÕES DE CATEGORIA (AB, A, B, C, D, E)
    const isFaqCatAB = /categoria ab|cnh ab|carro e moto/i.test(faq.question);
    const isFaqCatA = !isFaqCatAB && (/categoria a|cnh a|moto|\(moto\)/i.test(faq.question) || /\(moto\)/i.test(normalizedAnswer));
    const isFaqCatB = !isFaqCatAB && (/categoria b|cnh b|carro|\(carro\)/i.test(faq.question) || /\(carro\)/i.test(normalizedAnswer));
    const isFaqCatC = /categoria c|cnh c|caminhao|\(caminhao\)/i.test(faq.question);
    const isFaqCatD = /categoria d|cnh d|onibus|\(onibus\)/i.test(faq.question);
    const isFaqCatE = /categoria e|cnh e|carreta|\(carreta\)/i.test(faq.question);

    if (hasCatABIntent) {
      if (isFaqCatAB) score += 350;
      else if (isFaqCatA || isFaqCatB || isFaqCatC || isFaqCatD || isFaqCatE) score -= 200;
    }

    if (hasCatAIntent) {
      if (isFaqCatA) score += 350;
      else if (isFaqCatB || isFaqCatC || isFaqCatD || isFaqCatE || isFaqCatAB) score -= 200;
    }

    if (hasCatBIntent) {
      if (isFaqCatB) score += 350;
      else if (isFaqCatA || isFaqCatC || isFaqCatD || isFaqCatE || isFaqCatAB) score -= 200;
    }

    if (hasCatCIntent) {
      if (isFaqCatC) score += 350;
      else if (isFaqCatA || isFaqCatB || isFaqCatD || isFaqCatE || isFaqCatAB) score -= 200;
    }

    if (hasCatDIntent) {
      if (isFaqCatD) score += 350;
      else if (isFaqCatA || isFaqCatB || isFaqCatC || isFaqCatE || isFaqCatAB) score -= 200;
    }

    if (hasCatEIntent) {
      if (isFaqCatE) score += 350;
      else score -= 200;
    }

    // 3.6 INTENÇÃO: CNH FÍSICA
    const isFaqFisica = /fisica|impressa|papel/i.test(faq.question);
    if (hasFisicaIntent) {
      if (isFaqFisica) score += 350;
      else score -= 150;
    }

    // 3.7 INTENÇÃO: PAGAMENTO
    const isFaqPagamento = /paga antes|paga depois|pagamento/i.test(faq.question);
    if (hasPagamentoIntent && isFaqPagamento) {
      score += 350;
    }

    // 3.8 INTENÇÃO: AULAS / PROVAS / EXAMES / LAUDOS
    const isFaqAulasProvas = /aulas|provas|exames|laudos/i.test(faq.question);
    if (hasAulasProvasIntent && isFaqAulasProvas) {
      score += 350;
    }

    // 3.9 INTENÇÃO: DOCUMENTOS
    const isFaqDocumentos = /documentos|documentacao/i.test(faq.question);
    if (hasDocumentosIntent && isFaqDocumentos) {
      score += 350;
      if (faq.media_url) score += 50; // Prioridade para o FAQ com foto anexada
    }

    // 3.10 INTENÇÃO: PRAZO / QUANTO TEMPO DEMORA
    const isFaqPrazo = /prazo|tempo|demora/i.test(faq.question);
    if (hasPrazoIntent && isFaqPrazo) {
      score += 350;
    }

    // 3.10 Palavras em comum SEM STOPWORDS
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

export function getTopicTitle(faq: FAQ): string {
  const q = faq.question.toLowerCase();
  if (q.includes('ab')) return 'Categoria AB (Carro e Moto)';
  if (q.includes('categoria a') || q.includes('cnh a')) return 'Categoria A (Moto)';
  if (q.includes('categoria b') || q.includes('cnh b')) return 'Categoria B (Carro)';
  if (q.includes('categoria c') || q.includes('cnh c')) return 'Categoria C (Caminhão)';
  if (q.includes('categoria d') || q.includes('cnh d')) return 'Categoria D (Ônibus/Van)';
  if (q.includes('categoria e') || q.includes('cnh e')) return 'Categoria E (Carreta)';
  if (q.includes('fisica')) return 'CNH Física (Impressa)';
  if (q.includes('paga')) return 'Condições de Pagamento';
  if (q.includes('aulas') || q.includes('provas') || q.includes('exames')) return 'Provas, Aulas e Exames';
  if (q.includes('document')) return 'Documentos Necessários';
  if (q.includes('prazo') || q.includes('tempo')) return 'Prazo de Entrega';
  if (q.includes('legitima')) return 'Autenticidade e Validade';
  return faq.question.split(/[?,/]/)[0].trim();
}

/**
 * Processador Inteligente de Mensagens Consecutivas (Fila / Agrupamento de Perguntas)
 * Se o cliente enviar 2, 3, 4 mensagens seguidas, entende todas e responde de forma organizada.
 */
export async function generateMultiMessageResponse(
  input: GenerateMultiMessageInput
): Promise<AIResponseOutput> {
  const {
    incomingMessages,
    contactName,
    conversationHistory,
    settings,
    availableFaqs,
    knowledgeBase,
  } = input;

  if (!incomingMessages || incomingMessages.length === 0) {
    return { text: '', confidence: 0 };
  }

  // Se for apenas 1 mensagem avulsa, executa o motor normal
  if (incomingMessages.length === 1) {
    return generateAIWhatsAppResponse({
      incomingMessage: incomingMessages[0],
      contactWaId: input.contactWaId,
      contactName,
      conversationHistory,
      settings,
      availableFaqs,
      knowledgeBase,
    });
  }

  // Múltiplas mensagens na sequência:
  let detectedGreeting = '';
  const matchedFaqMap = new Map<string, FAQ>();
  let mediaToSend: any = undefined;

  for (const msg of incomingMessages) {
    const singleResult = await generateAIWhatsAppResponse({
      incomingMessage: msg,
      contactWaId: input.contactWaId,
      contactName,
      conversationHistory,
      settings,
      availableFaqs,
      knowledgeBase,
    });

    const gr = extractGreeting(normalizeBrText(msg));
    if (gr && !detectedGreeting) {
      detectedGreeting = gr;
    }

    if (singleResult.matchedFaq) {
      if (!matchedFaqMap.has(singleResult.matchedFaq.id)) {
        matchedFaqMap.set(singleResult.matchedFaq.id, singleResult.matchedFaq);
      }
      if (singleResult.mediaToSend && !mediaToSend) {
        mediaToSend = singleResult.mediaToSend;
      }
    }
  }

  const matchedFaqs = Array.from(matchedFaqMap.values());
  const timeGreeting = getGreetingByHour();
  const greetingHeader = detectedGreeting || timeGreeting;

  // Caso 1: Nenhuma dúvida técnica nas mensagens (ex: apenas cumprimentos "oi", "boa tarde", "tudo bem?")
  if (matchedFaqs.length === 0) {
    const combinedText = incomingMessages.join(' | ');
    return generateAIWhatsAppResponse({
      incomingMessage: combinedText,
      contactWaId: input.contactWaId,
      contactName,
      conversationHistory,
      settings,
      availableFaqs,
      knowledgeBase,
    });
  }

  // Caso 2: Apenas 1 dúvida única (mesmo que dita em 2 mensagens redundantes)
  if (matchedFaqs.length === 1) {
    let finalAnswer = formatAnswerPolitely(matchedFaqs[0]);
    if (detectedGreeting && !finalAnswer.toLowerCase().startsWith(detectedGreeting.toLowerCase())) {
      finalAnswer = `${detectedGreeting}! ${finalAnswer}`;
    }
    return {
      text: finalAnswer,
      matchedFaq: matchedFaqs[0],
      matchedFaqs,
      mediaToSend,
      confidence: 100,
    };
  }

  // Caso 3: Múltiplas dúvidas distintas na sequência (ex: AB + Física + Provas)
  // Monta resposta unificada, elegante e estruturada
  const lines: string[] = [
    `Olá! ${greetingHeader}! Seguem todas as informações para você:`,
    '',
  ];

  for (const faq of matchedFaqs) {
    lines.push(`📌 *${getTopicTitle(faq)}*:\n${faq.answer.trim()}`);
    lines.push('');
  }

  lines.push('Qualquer outra dúvida ou se desejar dar início ao procedimento, estou sempre por aqui! Conte comigo! 👍');

  return {
    text: lines.join('\n'),
    matchedFaq: matchedFaqs[0],
    matchedFaqs,
    mediaToSend,
    confidence: 100,
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
