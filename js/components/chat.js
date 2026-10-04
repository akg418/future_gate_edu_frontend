import { $, escapeHTML } from '../core/dom.js';
import { settingService, lessonService, eventService } from '../services/index.js';

/**
 * Bilingual AI assistant widget.
 *
 * Its greeting, name and FAQ knowledge come from the CMS settings in MongoDB,
 * and lesson/event answers are looked up live through the API — the original
 * version read hardcoded arrays and localStorage.
 */

const BRAND = '<span dir="ltr" style="unicode-bidi: isolate;">Future Gate National Schools</span>';

const state = {
  settings: { name: 'Future Gate AI Assistant', welcomeEn: '', welcomeAr: '', customFaq: '' },
  contact: { phone: '01206192111', whatsapp: '201206192111', email: 'info@futuregate.edu' },
  greeted: false,
};

const isArabic = (text) => /[\u0600-\u06FF]/.test(text);

function appendMessage(html, { from = 'bot', rtl = false } = {}) {
  const box = $('#ai-chat-messages');
  if (!box) return;

  const bubble = document.createElement('div');
  bubble.className =
    from === 'user'
      ? `bg-brand-blue text-white p-3 rounded-2xl ${rtl ? 'text-right' : 'text-left'} shadow-sm max-w-[85%] ml-auto rtl:ml-0 rtl:mr-auto leading-relaxed`
      : `bg-white p-3.5 rounded-2xl border border-slate-200 text-slate-700 shadow-sm max-w-[88%] leading-relaxed ${rtl ? 'text-right' : 'text-left'}`;
  bubble.innerHTML = html;
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
  return bubble;
}

function contactFooter() {
  return `
    <div class="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[10px]">
      <a href="tel:${escapeHTML(state.contact.phone)}" class="bg-blue-50 text-brand-blue font-bold px-2 py-1 rounded-md hover:bg-blue-100 flex items-center gap-1">
        <i class="fa-solid fa-phone text-brand-gold"></i> ${escapeHTML(state.contact.phone)}
      </a>
      <a href="https://wa.me/${escapeHTML(state.contact.whatsapp)}" target="_blank" rel="noopener" class="bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-md hover:bg-emerald-100 flex items-center gap-1">
        <i class="fa-brands fa-whatsapp"></i> WhatsApp
      </a>
    </div>`;
}

function showTyping() {
  const box = $('#ai-chat-messages');
  if (!box) return () => {};
  const element = document.createElement('div');
  element.className = 'bg-white p-3 rounded-2xl border border-slate-200 text-slate-500 shadow-sm max-w-[85%] flex items-center gap-1.5';
  element.innerHTML = `
    <span class="text-[10px] font-semibold text-slate-400">${escapeHTML(state.settings.name)} is typing</span>
    <span class="w-1.5 h-1.5 bg-brand-gold rounded-full typing-dot"></span>
    <span class="w-1.5 h-1.5 bg-brand-gold rounded-full typing-dot"></span>
    <span class="w-1.5 h-1.5 bg-brand-gold rounded-full typing-dot"></span>`;
  box.appendChild(element);
  box.scrollTop = box.scrollHeight;
  return () => element.remove();
}

/** Matches the visitor's question against the CMS-managed FAQ lines first. */
function matchCustomFaq(query) {
  const faq = state.settings.customFaq || '';
  if (!faq.trim()) return null;

  for (const line of faq.split('\n')) {
    const match = line.match(/^\s*Q:\s*(.+?)\s*\|\s*A:\s*(.+?)\s*$/i);
    if (!match) continue;
    const [, question, answer] = match;
    const keywords = question.toLowerCase().split(/[\s,]+/).filter((word) => word.length > 3);
    if (keywords.some((keyword) => query.includes(keyword))) return escapeHTML(answer);
  }
  return null;
}

/**
 * Answers a question from live backend data and the CMS knowledge base.
 * Returns an HTML string ready to render.
 */
async function answer(rawQuery) {
  const query = rawQuery.toLowerCase().trim();
  const arabic = isArabic(rawQuery);
  const { phone } = state.contact;

  const custom = matchCustomFaq(query);
  if (custom) return custom;

  const has = (...words) => words.some((word) => query.includes(word));

  if (has('apply', 'admission', 'register', 'تقديم', 'تسجيل', 'قبول')) {
    return arabic
      ? `أهلاً بك! باب القبول والتسجيل مفتوح حالياً للعام الدراسي الجديد في ${BRAND}. يمكنك تقديم طلب جديد إلكترونياً من خلال تبويب "القبول والتسجيل" أو التواصل مع مكتب القبول على: <strong class="font-mono">${escapeHTML(phone)}</strong>.`
      : `Admissions are currently OPEN for the upcoming academic year at ${BRAND}! You can submit an application online via our Admissions page or contact our admissions office at Phone/WhatsApp: <strong class="font-mono">${escapeHTML(phone)}</strong>.`;
  }

  if (has('grade', 'stage', 'kg', 'primary', 'preparatory', 'secondary', 'مراحل', 'روضة', 'ابتدائي', 'إعدادي', 'ثانوي')) {
    return arabic
      ? `تقدم ${BRAND} جميع المراحل التعليمية متكاملة:<br>• رياض الأطفال (KG1 - KG2)<br>• المرحلة الابتدائية (الصفوف 1 - 6)<br>• المرحلة الإعدادية (الصفوف 7 - 9)<br>• المرحلة الثانوية (الصفوف 10 - 12).`
      : `${BRAND} offers a complete educational pathway:<br>• Kindergarten (KG1 - KG2)<br>• Primary Stage (Grades 1 - 6)<br>• Preparatory Stage (Grades 7 - 9)<br>• Secondary Stage (Grades 10 - 12).`;
  }

  if (has('german', 'english', 'language', 'ألماني', 'إنجليزي', 'لغات')) {
    return arabic
      ? `تتميز ${BRAND} ببرنامج تعليمي ثنائي اللغة متطور يدمج بين اللغة الإنجليزية واللغة الألمانية من مرحلة رياض الأطفال حتى الثانوية العامة تحت إشراف نخبة من المعلمين المعتمدين.`
      : `${BRAND} features an intensive dual-language program in English and German from KG to Secondary, taught by certified native language educators.`;
  }

  if (has('contact', 'phone', 'whatsapp', 'email', 'address', 'location', 'اتصل', 'هاتف', 'واتساب', 'عنوان', 'موقع')) {
    return arabic
      ? `يمكنك التواصل مباشرة مع ${BRAND}:<br>• الهاتف والواتساب: <strong class="font-mono">${escapeHTML(phone)}</strong><br>• البريد الإلكتروني: <span class="font-mono">${escapeHTML(state.contact.email)}</span>`
      : `You can reach ${BRAND} directly via:<br>• Phone & WhatsApp: <strong class="font-mono">${escapeHTML(phone)}</strong><br>• Email: <span class="font-mono">${escapeHTML(state.contact.email)}</span>`;
  }

  // Live lookup against the LMS rather than a hardcoded list.
  if (has('lesson', 'lms', 'math', 'science', 'coding', 'درس', 'دروس', 'رياضيات', 'علوم')) {
    try {
      const { items } = await lessonService.list({ limit: 3, search: rawQuery.slice(0, 40) });
      const lessons = items.length ? items : (await lessonService.list({ limit: 3 })).items;
      if (lessons.length) {
        const list = lessons.map((lesson) => `• ${escapeHTML(lesson.title)} (${escapeHTML(lesson.grade)} - ${escapeHTML(lesson.subject)})`).join('<br>');
        return arabic
          ? `تتضمن منصة الدروس (LMS) في ${BRAND} دروساً وفيديوهات تفاعلية وملفات PDF، مثل:<br>${list}<br>يمكنك مشاهدة كافة الدروس عبر تبويب "منصة الدروس".`
          : `Our LMS Platform at ${BRAND} includes streaming video lessons and resource PDFs, such as:<br>${list}<br>Explore all lessons on the "Lessons" page.`;
      }
    } catch {
      // Fall through to the generic answer below.
    }
  }

  // Live lookup against upcoming events.
  if (has('event', 'fair', 'graduation', 'فعاليات', 'حفل', 'معرض')) {
    try {
      const { items } = await eventService.list({ limit: 2, sort: 'startDate' });
      if (items.length) {
        const list = items
          .map((event) => `• ${escapeHTML(event.title)} (${new Date(event.startDate).toDateString()}) — ${escapeHTML(event.location || 'Campus')}`)
          .join('<br>');
        return arabic ? `من أبرز الفعاليات القادمة في ${BRAND}:<br>${list}` : `Upcoming events at ${BRAND}:<br>${list}`;
      }
    } catch {
      // Fall through.
    }
  }

  if (has('fee', 'tuition', 'cost', 'price', 'مصاريف', 'رسوم', 'تكلفة')) {
    return arabic
      ? `تختلف الرسوم الدراسية في ${BRAND} بحسب المرحلة الدراسية. يرجى التواصل مع مسئول القبول على الرقم <strong class="font-mono">${escapeHTML(phone)}</strong> للحصول على جدول الرسوم التفصيلي.`
      : `School tuition fees at ${BRAND} vary by grade level. Please contact our admissions office at Phone/WhatsApp: <strong class="font-mono">${escapeHTML(phone)}</strong> for the complete fee schedule and payment plans.`;
  }

  return arabic
    ? `شكراً لاستفسارك! في ${BRAND} نعتز بتقديم تعليم دولي متميز. لمزيد من التفاصيل، يرجى الاتصال بنا أو مراسلتنا عبر الواتساب على: <strong class="font-mono">${escapeHTML(phone)}</strong>.`
    : `Thank you for your inquiry! At ${BRAND}, we are committed to providing top-tier international education. For detailed assistance, please call or message us on WhatsApp at: <strong class="font-mono">${escapeHTML(phone)}</strong>.`;
}

async function handleSubmit(event) {
  event.preventDefault();
  const input = $('#ai-chat-input');
  const sendButton = $('#ai-chat-send-btn');
  const value = input?.value.trim();
  if (!value) return;

  const rtl = isArabic(value);
  appendMessage(escapeHTML(value), { from: 'user', rtl });
  input.value = '';
  input.disabled = true;
  if (sendButton) sendButton.disabled = true;

  const stopTyping = showTyping();
  try {
    const html = await answer(value);
    stopTyping();
    appendMessage(html + contactFooter(), { from: 'bot', rtl });
  } catch (error) {
    stopTyping();
    appendMessage(
      `<span class="text-rose-600">Sorry, I'm having trouble right now. Please contact ${BRAND} at <strong class="font-mono">${escapeHTML(state.contact.phone)}</strong>.</span>`,
      { from: 'bot' },
    );
  } finally {
    input.disabled = false;
    if (sendButton) sendButton.disabled = false;
    input.focus();
  }
}

export function toggleAiAssistant() {
  const panel = $('#ai-chat-window');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (panel.classList.contains('hidden')) return;

  if (!state.greeted) {
    const greeting = document.documentElement.getAttribute('dir') === 'rtl' ? state.settings.welcomeAr : state.settings.welcomeEn;
    if (greeting) appendMessage(escapeHTML(greeting), { from: 'bot' });
    state.greeted = true;
  }
  $('#ai-chat-input')?.focus();
}

/** Loads CMS-managed assistant settings and wires the widget. */
export async function initChat() {
  try {
    const settings = await settingService.getPublic();
    if (settings.ai) state.settings = { ...state.settings, ...settings.ai };
    if (settings.site) {
      state.contact = {
        phone: settings.site.phone || state.contact.phone,
        whatsapp: `20${String(settings.site.whatsapp || settings.site.phone || '').replace(/^0/, '')}`,
        email: settings.site.email || state.contact.email,
      };
    }
  } catch {
    // Defaults above keep the assistant usable if settings cannot be loaded.
  }

  const nameElement = $('#ai-header-name');
  if (nameElement) nameElement.textContent = state.settings.name;

  $('#ai-chat-form')?.addEventListener('submit', handleSubmit);

  window.toggleAiAssistant = toggleAiAssistant;
  window.handleAiSendMessage = handleSubmit;
  window.sendQuickAiQuery = (question) => {
    const input = $('#ai-chat-input');
    if (!input) return;
    input.value = question;
    handleSubmit(new Event('submit'));
  };
}

export default { initChat, toggleAiAssistant };
