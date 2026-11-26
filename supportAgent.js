const { config } = require('../config/env');

const KNOWLEDGE_BASE = [
  {
    id: 'kb-activation',
    tags: ['تفعيل', 'حساب', 'رمز', 'تحقق', 'رقم', 'دخول'],
    title: 'تفعيل الحساب ورمز التحقق في سند',
    answer: 'لتفعيل حسابك في سند: أدخل رقم الهاتف أو المعرّف بصيغة دولية صحيحة، ثم اطلب رمز التحقق (أو استخدم رمز التأكيد المولّد)، وتأكد من حفظ الحساب النشط في تبويب الحسابات.'
  },
  {
    id: 'kb-connection',
    tags: ['اتصال', 'مزامنة', 'سيرفر', 'بطيء', 'متصل', 'ظهور', 'شبكة'],
    title: 'استقرار الاتصال والمزامنة وحالة الظهور',
    answer: 'تطبيق سند يعتمد على قناة WebSocket الحية مع مزامنة دورية وقائمة انتظار للمحادثات عند ضعف الشبكة. إذا تأخر الإقلاع على الخادم المجاني، انتظر بضع ثوانٍ حتى تتحول علامة الاتصال إلى متصل ثم ستُرسل الرسائل المعلّقة تلقائياً.'
  },
  {
    id: 'kb-groups-calls',
    tags: ['مجموعة', 'مجموعات', 'مكالمة', 'مكالمات', 'صوت', 'فيديو', 'كاميرا'],
    title: 'المجموعات والمكالمات الصوتية والمرئية',
    answer: 'من تبويب المجموعات يمكنك إنشاء مجموعة وإضافة الأعضاء وإدارة المحادثة الجماعية. ومن تبويب المكالمات يمكنك بدء مكالمة صوتية أو مرئية فردية أو جماعية بعد السماح بأذونات الميكروفون والكاميرا من المتصفح.'
  },
  {
    id: 'kb-support-tickets',
    tags: ['خدمة العملاء', 'شكوى', 'طلب', 'باقة', 'تأخر', 'مساعدة', 'تذكرة'],
    title: 'سياسة معالجة طلبات وشكاوى عملاء سند',
    answer: 'يتم تصنيف طلبات العملاء تلقائياً حسب النوع والأولوية، وتوثيق ملخص المشكلة والخطوة التالية بوضوح لضمان سرعة الحل ومتابعة الحالة دون ضياع أي تفاصيل.'
  }
];

function classifyTicket(text = '') {
  const t = String(text).toLowerCase();
  if (/شكوى|عطل|مشكلة|خطأ|لا يعمل|توقف|بطء|فشل/.test(t)) {
    return { category: 'مشكلة تقنية / شكوى', priority: 'عالية', assigneeTeam: 'فريق الدعم الفني' };
  }
  if (/اشتراك|باقة|سعر|فاتورة|دفع|ترقية|طلب/.test(t)) {
    return { category: 'طلب خدمة أو باقة', priority: 'متوسطة', assigneeTeam: 'فريق خدمة العملاء والمبيعات' };
  }
  if (/تفعيل|حساب|رقم|رمز|دخول|مجموعة|مكالمة/.test(t)) {
    return { category: 'استفسار تشغيلي', priority: 'متوسطة', assigneeTeam: 'فريق نجاح العملاء' };
  }
  return { category: 'استفسار عام', priority: 'عادية', assigneeTeam: 'خدمة العملاء العامة' };
}

function searchKnowledge(query = '') {
  const words = String(query)
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);
  if (!words.length) return KNOWLEDGE_BASE.slice(0, 3);
  const scored = KNOWLEDGE_BASE.map((item) => {
    const hay = `${item.title} ${item.answer} ${item.tags.join(' ')}`;
    let score = 0;
    for (const w of words) {
      if (hay.includes(w)) score += 2;
    }
    return { item, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).map((s) => s.item);
  return top.length ? top : KNOWLEDGE_BASE.slice(0, 2);
}

function summarizeConversation(messages = [], focus = '') {
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) {
    return {
      summary: 'لا توجد رسائل كافية للتلخيص في هذه المحادثة بعد.',
      actionItems: ['بانتظار بدء المحادثة أو استقبال رسالة العميل.']
    };
  }
  const cleanLines = list
    .filter((m) => m && !m.deletedForAll && (m.text || m.kind !== 'text'))
    .slice(-25)
    .map((m) => {
      const who = m.fromName || m.from || 'مستخدم';
      const body = m.text || `[مرفق ${m.kind}]`;
      return `- ${who}: ${body}`;
    });

  const combinedText = cleanLines.join('\n');
  const ticket = classifyTicket(combinedText + ' ' + focus);

  const actionItems = [];
  if (ticket.priority === 'عالية') {
    actionItems.push('فحص سبب المشكلة التقنية وتقديم خطوة حل واضحة للعميل.');
  }
  actionItems.push(`إسناد المتابعة إلى: ${ticket.assigneeTeam}.`);
  actionItems.push('تأكيد رضا العميل وإغلاق التذكرة بعد التحقق من الحل.');

  return {
    ticket,
    messageCount: cleanLines.length,
    summary: `ملخص المحادثة (${cleanLines.length} رسالة) — التصنيف: ${ticket.category} (${ticket.priority}):\n${cleanLines.slice(-6).join('\n')}`,
    actionItems
  };
}

function draftReply({ promptText = '', tone = 'ودّي', customerMessage = '' }) {
  const baseSource = (promptText || customerMessage || '').trim();
  const ticket = classifyTicket(baseSource);
  const kbMatch = searchKnowledge(baseSource)[0];

  const tonePrefix = {
    'ودّي': 'أهلاً بك في سند AI! يسعدنا خدمتك بكل سرور.',
    'رسمي': 'تحية طيبة وبعد، نشكرك على تواصلك مع فريق دعم سند AI.',
    'مختصر': 'تم استلام طلبك في سند AI:',
    'حل مشكلة': 'نقدّر إبلاغك، وقد بدأنا فوراً بمعالجة الحالة وفق الخطوات التالية:'
  }[tone] || 'أهلاً بك في سند AI:';

  const guidance = kbMatch
    ? kbMatch.answer
    : 'يرجى تزويدنا بتفاصيل إضافية أو لقطة شاشة لنتمكن من إتمام المطلوب بأسرع وقت.';

  const reply = `${tonePrefix}\n${baseSource ? `بخصوص طلبك (${ticket.category}): ` : ''}${guidance}`;

  return {
    reply,
    ticket,
    suggestedKnowledge: kbMatch ? kbMatch.title : null
  };
}

async function runAssistant({ mode = 'ask', text = '', tone = 'ودّي', messages = [], customerMessage = '' }) {
  const localTicket = classifyTicket(`${text} ${customerMessage}`);
  const kbHits = searchKnowledge(`${text} ${customerMessage}`);

  if (mode === 'summarize') {
    return {
      ok: true,
      provider: 'sanad-local-engine',
      ...summarizeConversation(messages, text),
      knowledgeBase: kbHits
    };
  }

  if (mode === 'draft') {
    const drafted = draftReply({ promptText: text, tone, customerMessage });
    return {
      ok: true,
      provider: 'sanad-local-engine',
      answer: drafted.reply,
      ticket: drafted.ticket,
      knowledgeBase: kbHits
    };
  }

  if (mode === 'classify') {
    return {
      ok: true,
      provider: 'sanad-local-engine',
      ticket: localTicket,
      answer: `التصنيف: ${localTicket.category} | الأولوية: ${localTicket.priority} | الجهة المختصة: ${localTicket.assigneeTeam}`,
      knowledgeBase: kbHits
    };
  }

  // Fallback / local smart response when no external OpenAI key is configured
  const fallbackAnswer = `${kbHits[0]?.answer || 'مرحباً بك في مساعد سند AI.'}\n\nتصنيف الطلب التلقائي: ${localTicket.category} (${localTicket.priority}) — ${localTicket.assigneeTeam}.`;

  if (!config.openaiApiKey || typeof fetch !== 'function') {
    return {
      ok: true,
      provider: 'sanad-knowledge-engine',
      answer: fallbackAnswer,
      ticket: localTicket,
      knowledgeBase: kbHits
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const systemPrompt = `أنت مساعد ذكي رسمي لتطبيق ومنصة سند AI لخدمة العملاء والمراسلة. أجب باللغة العربية بوضوح واحترافية ودقة. سياق قاعدة المعرفة: ${kbHits.map((k) => `${k.title}: ${k.answer}`).join(' | ')}`;
    const userPrompt = messages && messages.length
      ? `السؤال/المطلوب: ${text}\nسياق المحادثة:\n${messages.slice(-10).map((m) => `${m.fromName || m.from || 'مستخدم'}: ${m.text || ''}`).join('\n')}`
      : text;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: true,
        provider: 'sanad-knowledge-fallback',
        answer: fallbackAnswer,
        ticket: localTicket,
        knowledgeBase: kbHits
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    return {
      ok: true,
      provider: `openai:${config.openaiModel}`,
      answer: content || fallbackAnswer,
      ticket: localTicket,
      knowledgeBase: kbHits
    };
  } catch (err) {
    return {
      ok: true,
      provider: 'sanad-knowledge-fallback',
      answer: fallbackAnswer,
      ticket: localTicket,
      knowledgeBase: kbHits
    };
  }
}

module.exports = {
  runAssistant,
  classifyTicket,
  searchKnowledge,
  summarizeConversation,
  draftReply
};
