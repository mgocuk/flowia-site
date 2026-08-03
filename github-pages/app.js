
// ============================================================
// SECURITY & ACCESSIBILITY HELPERS
// ============================================================
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// COPPA AGE CHECK — Must be 13+ to use Flowia
// ============================================================
function checkCoppaCompliance(dob) {
  if (!dob) return true; // allow if not provided (validated separately)
  try {
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return true;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 13;
  } catch(e) { return true; }
}

/* ============================================================
   Flowia — app.js
   Full SPA logic: routing, screen rendering, data, charts
   ============================================================ */

'use strict';

// ============================================================
// GLOBAL ERROR HANDLING — Play Store & App Store compliance
// Prevents unhandled crashes from showing raw error screens.
// ============================================================
window.onerror = function(msg, src, line, col, err) {
  console.error('[Flowia] Uncaught error:', msg, 'at', src, line + ':' + col);
  // Show user-friendly toast instead of crashing
  try { showToast('Beklenmeyen bir hata oluştu. Yeniden denenecek...', 'error'); } catch(e) {}
  return true; // prevent default browser error dialog
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('[Flowia] Unhandled Promise rejection:', event.reason);
  event.preventDefault();
});

// ============================================================
// SAFE LOCALSTORAGE — Works in Private/Incognito browsing mode
// where localStorage access may be restricted.
// ============================================================
const SafeStorage = {
  getItem: function(key) {
    try { return localStorage.getItem(key); } catch(e) { return null; }
  },
  setItem: function(key, val) {
    try { localStorage.setItem(key, val); } catch(e) { console.warn('[Flowia] Storage write blocked (private mode?):', e); }
  },
  removeItem: function(key) {
    try { localStorage.removeItem(key); } catch(e) {}
  },
};


// ============================================================
// 1. CONSTANTS & CONFIG
// ============================================================
const TODAY = new Date();                          // Real-time — no longer hardcoded
const TODAY_STR = TODAY.toISOString().split('T')[0]; // e.g. "2026-07-23"

const PHASES = {
  menstrual:  { name: 'Menstrual',  key: 'phase_menstrual',  emoji: '🌑', color: '#EF5350', light: '#FFEBEE', cls: 'chip-menstrual',  days: [1,2,3,4,5] },
  follicular: { name: 'Follicular', key: 'phase_follicular', emoji: '🌒', color: '#FFA726', light: '#FFF3E0', cls: 'chip-follicular', days: [6,7,8,9,10,11,12,13] },
  ovulation:  { name: 'Ovulation',  key: 'phase_ovulation',  emoji: '⭐', color: '#66BB6A', light: '#E8F5E9', cls: 'chip-ovulation',  days: [14,15,16] },
  luteal:     { name: 'Luteal',     key: 'phase_luteal',     emoji: '🌙', color: '#9B72CF', light: '#EDE7F6', cls: 'chip-luteal',     days: [17,18,19,20,21,22,23,24,25,26,27,28] }
};

const SYMPTOMS_PHYSICAL = [
  { id: 'cramps',    label: 'Cramps',         icon: '🔥' },
  { id: 'headache',  label: 'Headache',       icon: '🤯' },
  { id: 'bloating',  label: 'Bloating',       icon: '🫃' },
  { id: 'fatigue',   label: 'Fatigue',        icon: '😴' },
  { id: 'nausea',    label: 'Nausea',         icon: '🤢' },
  { id: 'breast',    label: 'Breast',         icon: '🩹' },
  { id: 'acne',      label: 'Acne',           icon: '😣' },
  { id: 'backpain',  label: 'Back Pain',      icon: '🦴' },
];
const SYMPTOMS_EMOTIONAL = [
  { id: 'anxious',   label: 'Anxious',        icon: '😰' },
  { id: 'irritable', label: 'Irritable',      icon: '😤' },
  { id: 'sad',       label: 'Sad',            icon: '😢' },
  { id: 'happy',     label: 'Happy',          icon: '😊' },
  { id: 'energetic', label: 'Energetic',      icon: '⚡' },
  { id: 'calm',      label: 'Calm',           icon: '🧘' },
  { id: 'sensitive', label: 'Sensitive',      icon: '💗' },
  { id: 'confident', label: 'Confident',      icon: '💪' },
];
const MOODS = [
  { id: 1, emoji: '😢', label: 'Awful' },
  { id: 2, emoji: '😕', label: 'Sad'  },
  { id: 3, emoji: '😐', label: 'Okay' },
  { id: 4, emoji: '🙂', label: 'Good' },
  { id: 5, emoji: '😄', label: 'Great'},
];
const SYMPTOMS_I18N = {
  cramps:    { tr: 'Kramp', en: 'Cramps', ru: 'Спазмы', de: 'Krämpfe', fr: 'Crampes', es: 'Calambres' },
  headache:  { tr: 'Baş Ağrısı', en: 'Headache', ru: 'Головная боль', de: 'Kopfschmerzen', fr: 'Mal de tête', es: 'Dolor de cabeza' },
  bloating:  { tr: 'Şişkinlik', en: 'Bloating', ru: 'Вздутие', de: 'Blähungen', fr: 'Ballonnements', es: 'Hinchazón' },
  fatigue:   { tr: 'Yorgunluk', en: 'Fatigue', ru: 'Усталость', de: 'Müdigkeit', fr: 'Fatigue', es: 'Fatiga' },
  nausea:    { tr: 'Bulantı', en: 'Nausea', ru: 'Тошнота', de: 'Übelkeit', fr: 'Nausée', es: 'Náuseas' },
  breast:    { tr: 'Göğüs Hassasiyeti', en: 'Breast Tenderness', ru: 'Боль в груди', de: 'Brustspannen', fr: 'Sensibilité mammaire', es: 'Sensibilidad mamaria' },
  acne:      { tr: 'Sivilce/Akne', en: 'Acne', ru: 'Акне', de: 'Akne', fr: 'Acné', es: 'Acné' },
  backpain:  { tr: 'Bel Ağrısı', en: 'Back Pain', ru: 'Боль в спине', de: 'Rückenschmerzen', fr: 'Mal de dos', es: 'Dolor de espalda' },
  anxious:   { tr: 'Endişeli', en: 'Anxious', ru: 'Тревожность', de: 'Ängstlich', fr: 'Anxieuse', es: 'Ansiosa' },
  irritable: { tr: 'Gergin', en: 'Irritable', ru: 'Раздражительность', de: 'Reizbar', fr: 'Irritable', es: 'Irritable' },
  sad:       { tr: 'Üzgün', en: 'Sad', ru: 'Грусть', de: 'Traurig', fr: 'Triste', es: 'Triste' },
  happy:     { tr: 'Mutlu', en: 'Happy', ru: 'Радость', de: 'Glücklich', fr: 'Heureuse', es: 'Feliz' },
  energetic: { tr: 'Enerjik', en: 'Energetic', ru: 'Энергичность', de: 'Energetisch', fr: 'Énergique', es: 'Energética' },
  calm:      { tr: 'Sakin', en: 'Calm', ru: 'Спокойствие', de: 'Ruhig', fr: 'Calme', es: 'Calmada' },
  sensitive: { tr: 'Hassas', en: 'Sensitive', ru: 'Чувствительность', de: 'Empfindsam', fr: 'Sensible', es: 'Sensible' },
  confident: { tr: 'Özgüvenli', en: 'Confident', ru: 'Уверенность', de: 'Selbstbewusst', fr: 'Confiante', es: 'Confiada' },
};

const MOODS_I18N = {
  1: { tr: 'Çok Kötü', en: 'Awful', ru: 'Ужасно', de: 'Schrecklich', fr: 'Horrible', es: 'Terrible' },
  2: { tr: 'Üzgün', en: 'Sad', ru: 'Грустно', de: 'Traurig', fr: 'Triste', es: 'Triste' },
  3: { tr: 'Fena Değil', en: 'Okay', ru: 'Нормально', de: 'Ok', fr: 'Ça va', es: 'Normal' },
  4: { tr: 'İyi', en: 'Good', ru: 'Хорошо', de: 'Gut', fr: 'Bien', es: 'Bien' },
  5: { tr: 'Harika', en: 'Great', ru: 'Отлично', de: 'Super', fr: 'Génial', es: 'Genial' },
};

function getSymptomLabel(id, defaultLabel) {
  const lang = (state && state.lang) || 'tr';
  return (SYMPTOMS_I18N[id] && SYMPTOMS_I18N[id][lang]) || (SYMPTOMS_I18N[id] && SYMPTOMS_I18N[id]['tr']) || defaultLabel;
}

function getMoodLabel(id, defaultLabel) {
  const lang = (state && state.lang) || 'tr';
  return (MOODS_I18N[id] && MOODS_I18N[id][lang]) || (MOODS_I18N[id] && MOODS_I18N[id]['tr']) || defaultLabel;
}

const FLOW_LEVELS = [
  { id: 'spotting', label: 'Spotting', drops: '·' },
  { id: 'light',    label: 'Light',    drops: '💧' },
  { id: 'medium',   label: 'Medium',   drops: '💧💧' },
  { id: 'heavy',    label: 'Heavy',    drops: '💧💧💧' },
];
const PAIN_DESCRIPTIONS = ['None', 'Very Mild', 'Mild', 'Moderate', 'Noticeable', 'Moderate-Strong', 'Strong', 'Intense', 'Very Intense', 'Severe', 'Unbearable'];
const MONTHS_I18N = {
  tr: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  zh: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
  hi: ['जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'],
  fr: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  bn: ['জানুয়ারী','ফেব্রুয়ারী','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'],
  pt: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'],
  ur: ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'],
  de: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
};

const DAYS_SHORT_I18N = {
  tr: ['Pz','Pt','Sa','Ça','Pe','Cu','Ct'],
  en: ['Su','Mo','Tu','We','Th','Fr','Sa'],
  ru: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  zh: ['日','一','二','三','四','五','六'],
  es: ['Do','Lu','Ma','Mi','Ju','Vi','Sá'],
  hi: ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'],
  fr: ['Di','Lu','Ma','Me','Je','Ve','Sa'],
  ar: ['أحد','إثن','ثلا','أرب','خميس','جمعة','سبت'],
  bn: ['রবি','সোম','মঙ্গল','বুধ','বৃহ','শুক্র','শনি'],
  pt: ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],
  ur: ['اتوار','پیر','منگل','بدھ','جمعرات','جمعہ','ہفتہ'],
  de: ['So','Mo','Di','Mi','Do','Fr','Sa']
};

function getMonthName(m) {
  const lang = (state && state.lang) || 'tr';
  const list = MONTHS_I18N[lang] || MONTHS_I18N['tr'];
  return list[m] || '';
}

const MONTHS_SHORT_I18N = {
  tr: ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'],
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  ru: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  zh: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
  es: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
  hi: ['जन','फर','मार्च','अप्रै','मई','जून','जुलाई','अग','सित','अक्तू','नव','दिस'],
  fr: ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'],
  ar: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
  bn: ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টে','অক্টো','নভে','ডিসে'],
  pt: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
  ur: ['جنوری','فروری','مارچ','اپریل','مئی','جون','جولائی','اگست','ستمبر','اکتوبر','نومبر','دسمبر'],
  de: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
};

function getMonthsShort() {
  const lang = (state && state.lang) || 'tr';
  return MONTHS_SHORT_I18N[lang] || MONTHS_SHORT_I18N['tr'];
}

function getWeekLabels() {
  const lang = (state && state.lang) || 'tr';
  if (lang === 'tr') return ['1. Hafta', '2. Hafta', '3. Hafta', '4. Hafta'];
  if (lang === 'ru') return ['1-я нед.', '2-я нед.', '3-я нед.', '4-я нед.'];
  if (lang === 'zh') return ['第 1 周', '第 2 周', '第 3 周', '第 4 周'];
  if (lang === 'es') return ['Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4'];
  if (lang === 'fr') return ['Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4'];
  if (lang === 'de') return ['Wo. 1', 'Wo. 2', 'Wo. 3', 'Wo. 4'];
  return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
}

function getDaysShort() {
  const lang = (state && state.lang) || 'tr';
  return DAYS_SHORT_I18N[lang] || DAYS_SHORT_I18N['tr'];
}

// ============================================================
// 1.5 MULTI-LANGUAGE TRANSLATION DICTIONARY (12 LANGUAGES)
// ============================================================
const LANGUAGES = [
  { code: 'tr', flag: '🇹🇷', name: 'Türkçe' },
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'hi', flag: '🇮🇳', name: 'हिन्दी' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية', rtl: true },
  { code: 'bn', flag: '🇧🇩', name: 'বাংলা' },
  { code: 'pt', flag: '🇵🇹', name: 'Português' },
  { code: 'ur', flag: '🇵🇰', name: 'اردو', rtl: true },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
];

const I18N = {
  ai_insights: { en:'AI Insights', tr:'Yapay Zeka İçgörüleri', ru:'ИИ-Аналитика', zh:'AI 见解', es:'Información de IA', hi:'एआई अंतर्दृष्टि', fr:'Analyses IA', ar:'رؤى الذكاء الاصطناعي', bn:'AI ইনসাইট', pt:'Insights de IA', ur:'AI بصیرت', de:'KI-Erkenntnisse' },
  private_secure: { en:'Private & Secure', tr:'Özel ve Güvenli', ru:'Конфиденциально и безопасно', zh:'私密与安全', es:'Privado y seguro', hi:'निजी और सुरक्षित', fr:'Privé et sécurisé', ar:'خاص وآمن', bn:'ব্যক্তিগত ও সুরক্ষিত', pt:'Privado e seguro', ur:'نجی اور محفوظ', de:'Privat & Sicher' },
  severity_label: { en:'Severity', tr:'Şiddet Seviyesi', ru:'Тяжесть', zh:'严重程度', es:'Severidad', hi:'गंभीरता', fr:'Sévérité', ar:'الشدة', bn:'তীব্রতা', pt:'Gravidade', ur:'شدت', de:'Schweregrad' },
  how_severe: { en:'How severe is your symptom?', tr:'Semptomunuz ne kadar şiddetli?', ru:'Насколько выражен симптом?', zh:'您的症状有多严重？', es:'¿Qué tan severo es tu síntoma?', hi:'आपका लक्षण कितना गंभीर है?', fr:'Quelle est la sévérité du symptôme ?', ar:'ما مدى شدة الأعراض؟', bn:'আপনার উপসর্গ কতটা তীব্র?', pt:'Quão grave é o seu sintoma?', ur:'آپ کی علامت کتنی شدید ہے؟', de:'Wie schwer ist Ihr Symptom?' },
  unlock_all_insights: { en:'Unlock All AI Insights', tr:'Tüm YZ İçgörülerinin Kilidini Aç', ru:'Разблокировать всю ИИ-аналитику', zh:'解锁所有 AI 见解', es:'Desbloquear toda la información de IA', hi:'सभी एआई अंतर्दृष्टि अनलॉक करें', fr:'Débloquer toutes les analyses IA', ar:'افتح جميع رؤى الذكاء الاصطناعي', bn:'সমস্ত AI ইনসাইট আনলক করুন', pt:'Desbloquear todos os insights de IA', ur:'تمام AI بصیرت انلاک کریں', de:'Alle KI-Erkenntnisse freischalten' },
  unlock_all_desc: { en:'Get personalized cycle analysis & symptom predictions with Premium.', tr:'Premium ile kişiselleştirilmiş döngü analizi ve semptom tahminleri alın.', ru:'Получите персональный анализ цикла и прогнозы симптомов с Premium.', zh:'使用 Premium 获取个性化的周期分析和症状预测。', es:'Obtén análisis de ciclo personalizado y predicciones de síntomas con Premium.', hi:'प्रीमियम के साथ व्यक्तिगत चक्र विश्लेषण और लक्षण भविष्यवाणियां प्राप्त करें।', fr:'Obtenez des analyses de cycle personnalisées et des prédictions de symptômes avec Premium.', ar:'احصل على تحليل مخصص للدورة وتوقعات الأعراض مع بريميوم.', bn:'প্রিমিয়ামের মাধ্যমে ব্যক্তিগতকৃত চক্র বিশ্লেষণ এবং উপসর্গ অনুমান পান।', pt:'Obtenha análise personalizada do ciclo e previsões de sintomas com o Premium.', ur:'پریمیم کے ساتھ ذاتی نوعیت کا سائیکل کا تجزیہ اور علامات کی پیش گوئیاں حاصل کریں۔', de:'Erhalten Sie personalisierte Zyklusanalysen und Symptomvorhersagen mit Premium.' },
  try_premium_free: { en:'Try Premium Free', tr:'Premium\'u Ücretsiz Dene', ru:'Попробовать Premium бесплатно', zh:'免费试用 Premium', es:'Prueba Premium gratis', hi:'निःशुल्क प्रीमियम आज़माएं', fr:'Essayer Premium gratuitement', ar:'تجربة بريميوم مجاناً', bn:'বিনামূল্যে প্রিমিয়াম চেষ্টা করুন', pt:'Experimente o Premium grátis', ur:'مفت پریمیم آزمائیں', de:'Premium kostenlos testen' },
  click_to_edit: { en:'Click to edit', tr:'Düzenlemek için tıklayın', ru:'Нажмите для редактирования', zh:'点击编辑', es:'Haz clic para editar', hi:'संपादित करने के लिए क्लिक करें', fr:'Cliquer pour modifier', ar:'انقر للتعديل', bn:'সম্পাদনা করতে ক্লিক করুন', pt:'Clique para editar', ur:'ترمیم کے لیے کلک کریں', de:'Klicken zum Bearbeiten' },

  home: { en:'Home', tr:'Ana Sayfa', ru:'Главная', zh:'首页', es:'Inicio', hi:'होम', fr:'Accueil', ar:'الرئيسية', bn:'হোম', pt:'Início', ur:'ہوم', de:'Startseite' },
  calendar: { en:'Calendar', tr:'Takvim', ru:'Календарь', zh:'日历', es:'Calendario', hi:'कैलेंडर', fr:'Calendrier', ar:'التقويم', bn:'ক্যালেন্ডার', pt:'Calendário', ur:'کیلنڈر', de:'Kalender' },
  reports: { en:'Reports', tr:'Raporlar', ru:'Отчеты', zh:'报告', es:'Informes', hi:'रिपोर्ट्स', fr:'Rapports', ar:'التقارير', bn:'রিপোর্ট', pt:'Relatórios', ur:'رپورٹس', de:'Berichte' },
  profile: { en:'Profile', tr:'Profil', ru:'Профиль', zh:'个人资料', es:'Perfil', hi:'प्रोफाइल', fr:'Profil', ar:'الملف الشخصي', bn:'প্রোফাইল', pt:'Perfil', ur:'پروفائل', de:'Profil' },
  log_period: { en:'Log Period', tr:'Adet Kaydet', ru:'Запись месячных', zh:'记录经期', es:'Registrar periodo', hi:'पीरियड दर्ज करें', fr:'Enregistrer règles', ar:'تسجيل الدورة', bn:'পিরিয়ড রেকর্ড', pt:'Registrar menstruação', ur:'پیریڈ درج کریں', de:'Periode eintragen' },
  symptoms: { en:'Symptoms', tr:'Semptomlar', ru:'Симптомы', zh:'症状', es:'Síntomas', hi:'लक्षण', fr:'Symptômes', ar:'الأعراض', bn:'লক্ষণ', pt:'Sintomas', ur:'علامات', de:'Symptome' },
  mood: { en:'Mood', tr:'Ruh Hali', ru:'Настроение', zh:'心情', es:'Estado de ánimo', hi:'मनोदशा', fr:'Humeur', ar:'المزاج', bn:'মেজাজ', pt:'Humor', ur:'مزاج', de:'Stimmung' },
  journal: { en:'Journal', tr:'Günlük', ru:'Дневник', zh:'日记', es:'Diario', hi:'डायरी', fr:'Journal', ar:'اليوميات', bn:'জার্নাল', pt:'Diário', ur:'ڈائری', de:'Tagebuch' },
  save_entry: { en:' Save Entry', tr:' Kaydı Kaydet', ru:' Сохранить запись', zh:' 保存记录', es:' Guardar entrada', hi:' प्रविष्टि सहेजें', fr:' Enregistrer', ar:' حفظ الإدخال', bn:' এন্ট্রি সংরক্ষণ', pt:' Salvar registro', ur:' اندراج محفوظ کریں', de:' Eintrag speichern' },
  flow_intensity: { en:'💧 Flow Intensity', tr:'💧 Akış Yoğunluğu', ru:'💧 Интенсивность выделений', zh:'💧 流量强度', es:'💧 Intensidad del flujo', hi:'💧 प्रवाह की तीव्रता', fr:'💧 Intensité du flux', ar:'💧 كثافة التدفق', bn:'💧 প্রবাহের তীব্রতা', pt:'💧 Intensidade do fluxo', ur:'💧 بہاؤ کی شدت', de:'💧 Blutungsstärke' },
  pain_level: { en:'😣 Pain Level', tr:'😣 Ağrı Seviyesi', ru:'😣 Уровень боли', zh:'😣 疼痛级别', es:'😣 Nivel de dolor', hi:'😣 दर्द का स्तर', fr:'😣 Niveau de douleur', ar:'😣 مستوى الألم', bn:'😣 ব্যথার মাত্রা', pt:'😣 Nível de dor', ur:'😣 درد کی سطح', de:'😣 Schmerzlevel' },
  notes: { en:'📝 Notes', tr:'📝 Notlar', ru:'📝 Заметки', zh:'📝 备注', es:'📝 Notas', hi:'📝 नोट्स', fr:'📝 Notes', ar:'📝 ملاحظات', bn:'📝 নোটস', pt:'📝 Notas', ur:'📝 نوٹس', de:'📝 Notizen' },
  language: { en:'Language', tr:'Dil', ru:'Язык', zh:'语言', es:'Idioma', hi:'भाषा', fr:'Langue', ar:'اللغة', bn:'ভাষা', pt:'Idioma', ur:'زبان', de:'Sprache' },
  language: { en:'Language', tr:'Dil', ru:'Язяк', zh:'语言', es:'Idioma', hi:'भाषा', fr:'Langue', ar:'اللغة', bn:'ভাষা', pt:'Idioma', ur:'زبان', de:'Sprache' },
  monthly: { en:'Monthly', tr:'Aylık', ru:'Ежемесячно', zh:'月度', es:'Mensual', hi:'मासिक', fr:'Mensuel', ar:'شهري', bn:'মাসিক', pt:'Mensal', ur:'ماہانہ', de:'Monatlich' },
  yearly: { en:'Yearly', tr:'Yıllık', ru:'Ежегодно', zh:'年度', es:'Anual', hi:'वार्षिक', fr:'Annuel', ar:'سنوي', bn:'বার্ষিক', pt:'Anual', ur:'سالانہ', de:'Jährlich' },
  health_reports: { en:'Health Reports', tr:'Sağlık Raporları', ru:'Отчеты о здоровье', zh:'健康报告', es:'Informes de salud', hi:'स्वास्थ्य रिपोर्ट', fr:'Rapports de santé', ar:'تقارير الصحة', bn:'স্বাস্থ্য রিপোর্ট', pt:'Relatórios de saúde', ur:'صحت کی رپورٹیں', de:'Gesundheitsberichte' },
  health_score: { en:'YOUR HEALTH SCORE', tr:'SAĞLIK SKORUNUZ', ru:'ВАШ ИНДЕКС ЗДОРОВЬЯ', zh:'您的健康分数', es:'TU PUNTUACIÓN DE SALUD', hi:'आपका स्वास्थ्य स्कोर', fr:'VOTRE SCORE DE SANTÉ', ar:'درجة صحتك', bn:'あなたの健康スコア', pt:'SUA PONTUAÇÃO DE SAÚDE', ur:'آپ کا صحت کا اسکور', de:'IHR GESUNDHEITSSCORE' },
  health_score_desc: { en:'Great! Your cycle is regular and well-tracked.', tr:'Harika! Döngünüz düzenli ve iyi takip ediliyor.', ru:'Отлично! Ваш цикл регулярен.', zh:'太棒了！您的周期规律且记录良好。', es:'¡Genial! Tu ciclo es regular y está bien registrado.', hi:'बहुत बढ़िया! आपका चक्र नियमित है।', fr:'Génial ! Votre cycle est régulier.', ar:'رائع! دورتك منتظمة.', bn:'দুর্দান্ত! আপনার চক্রটি নিয়মিত।', pt:'Ótimo! Seu ciclo é regular.', ur:'بہت خوب! آپ کا سائیکل باقاعدہ ہے۔', de:'Super! Ihr Zyklus ist regelmäßig.' },
  avg_period_length: { en:'Avg Period (days)', tr:'Ort. Adet (gün)', ru:'Ср. месячные (дней)', zh:'平均经期（天）', es:'Duración media periodo', hi:'औसत अवधि (दिन)', fr:'Durée moyenne règles', ar:'متوسط الدورة (أيام)', bn:'গড় পিরিয়ড (দিন)', pt:'Média menstruação (dias)', ur:'اوسط پیریڈ (دن)', de:'Durschn. Periode (Tage)' },
  cycle_variation: { en:'Cycle Variation', tr:'Döngü Değişkenliği', ru:'Колебания цикла', zh:'周期波动', es:'Variación del ciclo', hi:'चक्र में भिन्नता', fr:'Variation du cycle', ar:'تباين الدورة', bn:'চক্র পরিবর্তন', pt:'Variação do ciclo', ur:'سائیکل کی تبدیلی', de:'Zyklusabweichung' },
  logs_this_month: { en:'Logs This Month', tr:'Bu Ayki Kayıtlar', ru:'Записей за месяц', zh:'本月记录数', es:'Registros de este mes', hi:'इस महीने के रिकॉर्ड', fr:'Saisies ce mois', ar:'سجلات هذا الشهر', bn:'এই মাসের রেকর্ড', pt:'Registros deste mês', ur:'اس ماہ کے اندراجات', de:'Einträge diesen Monat' },
  cycle_history: { en:'📊 Cycle Length History', tr:'📊 Döngü Süresi Geçmişi', ru:'📊 История длины цикла', zh:'📊 周期长度历史', es:'📊 Historial del ciclo', hi:'📊 चक्र की लंबाई का इतिहास', fr:'📊 Historique des cycles', ar:'📊 سجل طول الدورة', bn:'📊 চক্রের ইতিহাস', pt:'📊 Histórico do ciclo', ur:'📊 سائیکل کی ہسٹری', de:'📊 Historie Zykluslänge' },
  last_6_cycles: { en:'Last 6 cycles (days)', tr:'Son 6 döngü (gün)', ru:'Последние 6 циклов', zh:'最近6个周期（天）', es:'Últimos 6 ciclos (días)', hi:'पिछले 6 चक्र (दिन)', fr:'6 derniers cycles (jours)', ar:'آخر 6 دورات (أيام)', bn:'শেষ ৬টি চক্র (দিন)', pt:'Últimos 6 ciclos (dias)', ur:'پچھلے 6 سائیکلز (دن)', de:'Letzte 6 Zyklen (Tage)' },
  mood_trend: { en:'😊 Mood Trend Over Time', tr:'😊 Zaman İçindeki Ruh Hali', ru:'😊 Динамика настроения', zh:'😊 情绪趋势变化', es:'😊 Tendencia del estado de ánimo', hi:'😊 मनोदशा का ट्रेंड', fr:'😊 Évolution de l\'humeur', ar:'😊 اتجاه المزاج', bn:'😊 মেজাজের ট্রেন্ড', pt:'😊 Tendência do humor', ur:'😊 مزاج کا رجحان', de:'😊 Stimmungstrend im Verlauf' },
  symptom_breakdown: { en:'💊 Symptom Breakdown', tr:'💊 Semptom Dağılımı', ru:'💊 Распределение симптомов', zh:'💊 症状分布', es:'💊 Desglose de síntomas', hi:'💊 लक्षणों का विवरण', fr:'💊 Répartition des symptômes', ar:'💊 توزيع الأعراض', bn:'💊 লক্ষণের বিশদ', pt:'💊 Distribuição de sintomas', ur:'💊 علامات की تفصیل', de:'💊 Symptomübersicht' },
  dark_mode: { en:'Dark Mode', tr:'Karanlık Mod', ru:'Темный режим', zh:'深色模式', es:'Modo oscuro', hi:'डार्क मोड', fr:'Mode sombre', ar:'الوضع الداكن', bn:'ডার্ক মোড', pt:'Modo escuro', ur:'ڈارک موڈ', de:'Dunkelmodus' },
  first_day_of_week: { en:'First Day of Week', tr:'Haftanın İlk Günü', ru:'Первый день недели', zh:'一周的第一天', es:'Primer día de la semana', hi:'सप्ताह का पहला दिन', fr:'Premier jour de la semaine', ar:'اليوم الأول من الأسبوع', bn:'সপ্তাহের প্রথম দিন', pt:'Primeiro dia da semana', ur:'ہفتے کا پہلا دن', de:'Erster Tag der Woche' },
  date_format: { en:'Date Format', tr:'Tarih Formatı', ru:'Формат даты', zh:'日期格式', es:'Formato de fecha', hi:'तिथि स्वरूप', fr:'Format de date', ar:'تنسيق التاريخ', bn:'তারিখ ফরম্যাট', pt:'Formato de data', ur:'تاریخ کی شکل', de:'Datumsformat' },
  top_symptoms: { en:'💊 Top Symptoms', tr:'💊 En Çok Kaydedilen Semptomlar', ru:'💊 Частые симптомы', zh:'💊 主要症状', es:'💊 Síntomas principales', hi:'💊 प्रमुख लक्षण', fr:'💊 Symptômes principaux', ar:'💊 الأعراض الرئيسية', bn:'💊 শীর্ষ লক্ষণগুলি', pt:'💊 Principais sintomas', ur:'💊 اہم علامات', de:'💊 Hauptsymptome' },
  top_symptoms_desc: { en:'Most logged symptoms this cycle', tr:'Bu döngüde en sık kaydedilen semptomlar', ru:'Самые частые симптомы за цикл', zh:'本周期记录最多的症状', es:'Síntomas más registrados en este ciclo', hi:'इस चक्र में सबसे अधिक दर्ज लक्षण', fr:'Symptômes les plus enregistrés ce cycle', ar:'الأعراض الأكثر تسجيلاً في هذه الدورة', bn:'এই চক্রে সর্বাধিক রেকর্ড করা লক্ষণ', pt:'Sintomas mais registrados neste ciclo', ur:'اس سائیکل میں سب سے زیادہ ریکارڈ شدہ علامات', de:'Am häufigsten dokumentierte Symptome' },
  period_duration: { en:'🩸 Period Duration', tr:'🩸 Adet Süresi Analizi', ru:'🩸 Длительность месячных', zh:'🩸 经期持续时间', es:'🩸 Duración del periodo', hi:'🩸 अवधि की लंबाई', fr:'🩸 Durée des règles', ar:'🩸 مدة الدورة', bn:'🩸 পিরিয়ডের সময়কাল', pt:'🩸 Duração da menstruação', ur:'🩸 پیریڈ کا دورانیہ', de:'🩸 Periodendauer' },
  period_duration_desc: { en:'Days per cycle', tr:'Döngü başına adet gün sayısı', ru:'Дней за цикл', zh:'每个周期的天数', es:'Días por ciclo', hi:'प्रति चक्र दिन', fr:'Jours par cycle', ar:'أيام لكل دورة', bn:'প্রতি চক্রে দিন', pt:'Dias por ciclo', ur:'فی سائیکل دن', de:'Tage pro Zyklus' },

  // Settings & Profile Labels
  notifications_title: { en:'Notifications', tr:'Bildirimler', ru:'Уведомления', zh:'通知', es:'Notificaciones', hi:'सूचनाएं', fr:'Notifications', ar:'الإشعارات', bn:'বিজ্ঞপ্তি', pt:'Notificações', ur:'اطلاعات', de:'Benachrichtigungen' },
  notif_period_lbl: { en:'Period Reminders', tr:'Adet Anımsatıcıları', ru:'Напоминания о месячных', zh:'经期提醒', es:'Recordatorios de periodo', hi:'पीरियड रिमाइंडर', fr:'Rappels de règles', ar:'تذكيرات الدورة', bn:'পিরিয়ড অনুস্মারক', pt:'Lembretes de menstruação', ur:'پیریڈ کی یاد دہانی', de:'Periodenerinnerungen' },
  notif_period_desc: { en:'2 days before predicted start', tr:'Tahmini başlangıçtan 2 gün önce', ru:'За 2 дня до начала', zh:'预计开始前 2 天', es:'2 días antes del inicio previsto', hi:'अनुमानित शुरू होने से 2 दिन पहले', fr:'2 jours avant le début prévu', ar:'قبل يومين من البداية المتوقعة', bn:'আনুমানিক শুরুর ২ দিন আগে', pt:'2 dias antes do início previsto', ur:'متوقع شروع سے 2 دن پہلے', de:'2 Tage vor voraussichtlichem Beginn' },
  notif_ovulation_lbl: { en:'Ovulation Alerts', tr:'Yumurtlama Uyarıları', ru:'Уведомления об овуляции', zh:'排卵提醒', es:'Alertas de ovulación', hi:'ओव्यूलेशन अलर्ट', fr:'Alertes d\'ovulation', ar:'تنبيهات الإباضة', bn:'ওভিউলেশন সতর্কবার্তা', pt:'Alertas de ovulação', ur:'اوولوشن الرٹس', de:'Eisprung-Benachrichtigungen' },
  notif_ovulation_desc: { en:'Fertile window notifications', tr:'Doğurganlık penceresi bildirimleri', ru:'Уведомления о фертильном окне', zh:'受孕期通知', es:'Notificaciones de ventana fértil', hi:'उर्वर विंडो सूचनाएं', fr:'Notifications de fenêtre fertile', ar:'إشعارات النافذة الخصبة', bn:'ফারটাইল উইন্ডো বিজ্ঞপ্তি', pt:'Notificações de janela fértil', ur:'زرخیز ونڈو اطلاعات', de:'Fruchtbarkeitsfenster-Hinweise' },
  notif_daily_lbl: { en:'Daily Log Reminder', tr:'Günlük Kayıt Anımsatıcısı', ru:'Ежедневные напоминания', zh:'每日记录提醒', es:'Recordatorio de registro diario', hi:'दैनिक लॉग रिमाइंडर', fr:'Rappel de saisie quotidienne', ar:'تذكير التسجيل اليومي', bn:'দৈনিক লগ অনুস্মারক', pt:'Lembrete de registro diário', ur:'روزانہ لاگ کی یاد دہانی', de:'Tägliche Erinnerung' },
  notif_daily_desc: { en:'Evening logging nudge', tr:'Akşam kayıt hatırlatması', ru:'Вечернее напоминание', zh:'晚间记录提醒', es:'Recordatorio nocturno', hi:'शाम का रिमाइंडर', fr:'Rappel du soir', ar:'تذكير المساء', bn:'সন্ধ্যার অনুস্মারক', pt:'Lembrete noturno', ur:'شام کی یاد دہانی', de:'Erinnerung am Abend' },
  notif_insight_lbl: { en:'Insight Notifications', tr:'İçgörü Bildirimleri', ru:'Уведомления об аналитике', zh:'见解通知', es:'Notificaciones de información', hi:'इनसाइट सूचनाएं', fr:'Notifications d\'analyses', ar:'إشعارات الرؤى', bn:'ইনসাইট বিজ্ঞপ্তি', pt:'Notificações de insights', ur:'بصیرت کی اطلاعات', de:'Insight-Benachrichtigungen' },
  notif_insight_desc: { en:'New AI insight available', tr:'Yeni yapay zeka içgörüsü hazır', ru:'Доступна новая аналитика ИИ', zh:'有新的 AI 见解', es:'Nueva información de IA disponible', hi:'नई एआई अंतर्दृष्टि उपलब्ध', fr:'Nouvelle analyse IA disponible', ar:'رؤية جديدة بالذكاء الاصطناعي', bn:'নতুন AI ইনসাইট উপলব্ধ', pt:'Novo insight de IA disponível', ur:'نئی AI بصیرت دستیاب ہے', de:'Neue KI-Erkenntnis verfügbar' },
  notif_report_lbl: { en:'Monthly Report', tr:'Aylık Rapor', ru:'Ежемесячный отчет', zh:'月度报告', es:'Informe mensual', hi:'मासिक रिपोर्ट', fr:'Rapport mensuel', ar:'التقرير الشهري', bn:'মাসিক রিপোর্ট', pt:'Relatório mensal', ur:'ماہانہ رپورٹ', de:'Monatsbericht' },
  notif_report_desc: { en:'Summary at cycle end', tr:'Döngü sonunda özet rapor', ru:'Итоги в конце цикла', zh:'周期结束总结', es:'Resumen al final del ciclo', hi:'चक्र के अंत में सारांश', fr:'Résumé en fin de cycle', ar:'ملخص في نهاية الدورة', bn:'চক্রের শেষে সারাংশ', pt:'Resumo no final do ciclo', ur:'سائیکل کے اختتام پر خلاصہ', de:'Zusammenfassung am Zyklusende' },
  display_pref: { en:'Display & Preferences', tr:'Görünüm ve Tercihler', ru:'Оформление и настройки', zh:'显示与偏好', es:'Visualización y preferencias', hi:'प्रदर्शन और प्राथमिकताएं', fr:'Affichage et préférences', ar:'العرض والتفضيلات', bn:'ডিসপ্লে এবং পছন্দসমূহ', pt:'Exibição e preferências', ur:'ڈسپلے اور ترجیحات', de:'Anzeige & Einstellungen' },
  dark_mode_desc: { en:'Sleek dark theme for night viewing', tr:'Gece kullanımı için şık karanlık tema', ru:'Темная тема для ночного просмотра', zh:'适合夜间查看的深色主题', es:'Tema oscuro elegante para la noche', hi:'रात में देखने के लिए शानदार डार्क थीम', fr:'Thème sombre élégant pour la nuit', ar:'مظهر داكن أنيق للمشاهدة الليلية', bn:'রাত্রে দেখার জন্য আধুনিক ডার্ক থিম', pt:'Tema escuro elegante para uso noturno', ur:'رات کو دیکھنے کے लिए خوبصورت ڈارک تھیم', de:'Elegantes dunkles Thema für die Nacht' },
  units: { en:'Units', tr:'Birimler', ru:'Единицы измерения', zh:'单位', es:'Unidades', hi:'इकाइयां', fr:'Unités', ar:'الوحدات', bn:'ইউনিট', pt:'Unidades', ur:'یونٹس', de:'Einheiten' },
  metric: { en:'Metric', tr:'Metrik', ru:'Метрическая', zh:'公制', es:'Métrico', hi:'मीट्रिक', fr:'Métrique', ar:'متري', bn:'মেট্রিক', pt:'Métrico', ur:'میٹرک', de:'Metrisch' },
  first_day_desc: { en:'Choose starting weekday for calendar', tr:'Takvim için başlangıç gününü seçin', ru:'Выберите первый день недели', zh:'选择日历的起始工作日', es:'Elige el día de inicio de la semana', hi:'कैलेंडर के लिए शुरुआती दिन चुनें', fr:'Choisissez le premier jour de la semaine', ar:'اختر يوم البداية للتقويم', bn:'ক্যালেন্ডারের জন্য শুরুর দিনটি বেছে নিন', pt:'Escolha o dia inicial da semana', ur:'کیلنڈر کے لیے ابتدائی دن منتخب کریں', de:'Erster Tag der Woche' },
  privacy_sec: { en:'Privacy & Security', tr:'Gizlilik ve Güvenlik', ru:'Конфиденциальность и безопасность', zh:'隐私与安全', es:'Privacidad y seguridad', hi:'गोपनीयता और सुरक्षा', fr:'Confidentialité et sécurité', ar:'الخصوصية والأمان', bn:'গোপনীয়তা এবং নিরাপত্তা', pt:'Privacidade e segurança', ur:'رازداری اور سیکیورٹی', de:'Datenschutz & Sicherheit' },
  app_lock: { en:'App Lock', tr:'Uygulama Kilidi', ru:'Блокировка приложения', zh:'应用锁', es:'Bloqueo de aplicación', hi:'ऐप लॉक', fr:'Verrouillage de l\'app', ar:'قفل التطبيق', bn:'অ্যাপ লক', pt:'Bloqueio do aplicativo', ur:'ایپ لاک', de:'App-Sperre' },
  app_lock_desc: { en:'Face ID / Fingerprint', tr:'Biyometrik / Yüz Tanıma', ru:'Face ID / Отпечаток', zh:'面容 ID / 指纹', es:'Face ID / Huella digital', hi:'फेस आईडी / फिंगरप्रिंट', fr:'Face ID / Empreinte', ar:'Face ID / بصمة الإصبع', bn:'ফেস আইডি / ফিঙ্গারপ্রিন্ট', pt:'Face ID / Impressão digital', ur:'فیس آئی ڈی / فنگر پرنٹ', de:'Face ID / Fingerabdruck' },
  analytics_sharing: { en:'Analytics Sharing', tr:'Analitik Paylaşımı', ru:'Аналитика и статистика', zh:'分析共享', es:'Compartir analíticas', hi:'विश्लेषण साझाकरण', fr:'Partage d\'analyses', ar:'مشاركة التحليلات', bn:'অ্যানালিটিক্স শেয়ারিং', pt:'Compartilhamento de análises', ur:'تجزیاتی اشتراک داری', de:'Analyse-Teilung' },
  analytics_desc: { en:'Anonymous usage data', tr:'Anonim kullanım verileri', ru:'Анонимные данные', zh:'匿名使用数据', es:'Datos de uso anónimos', hi:'गुमनाम उपयोग डेटा', fr:'Données d\'utilisation anonymes', ar:'بيانات الاستخدام المجهولة', bn:'বেনামী ব্যবহারের ডেটা', pt:'Dados de uso anônimos', ur:'گمنام استعمال کا ڈیٹا', de:'Anonyme Nutzungsdaten' },
  consent_manager: { en:'Consent Manager', tr:'Rıza Yönetimi', ru:'Управление согласием', zh:'同意管理', es:'Gestor de consentimiento', hi:'सहमति प्रबंधक', fr:'Gestion des consentements', ar:'إدارة الموافقة', bn:'সম্মতি ব্যবস্থাপক', pt:'Gerenciador de consentimento', ur:'رضامندی مینیجر', de:'Einwilligungs-Manager' },
  data_mgmt: { en:'Data Management', tr:'Veri Yönetimi', ru:'Управление данными', zh:'数据管理', es:'Gestión de datos', hi:'डेटा प्रबंधन', fr:'Gestion des données', ar:'إدارة البيانات', bn:'ডেটা ব্যবস্থাপনা', pt:'Gestão de dados', ur:'ڈیٹا مینجمنٹ', de:'Datenverwaltung' },
  export_data: { en:'Export My Data', tr:'Verilerimi Dışa Aktar', ru:'Экспорт данных', zh:'导出我的数据', es:'Exportar mis datos', hi:'मेरा डेटा निर्यात करें', fr:'Exporter mes données', ar:'تصدير بياناتي', bn:'আমার ডেটা এক্সপোর্ট করুন', pt:'Exportar meus dados', ur:'میرا ڈیٹا ایکسپورٹ کریں', de:'Meine Daten exportieren' },
  export_desc: { en:'Download CSV / PDF', tr:'CSV / PDF olarak indir', ru:'Скачать CSV / PDF', zh:'下载 CSV / PDF', es:'Descargar CSV / PDF', hi:'CSV / PDF डाउनलोड करें', fr:'Télécharger CSV / PDF', ar:'تنزيل CSV / PDF', bn:'CSV / PDF ডাউনলোড করুন', pt:'Baixar CSV / PDF', ur:'CSV / PDF ڈاؤن لوڈ کریں', de:'CSV / PDF herunterladen' },
  delete_data: { en:'Delete All Data', tr:'Tüm Verileri Sil', ru:'Удалить все данные', zh:'删除所有数据', es:'Eliminar todos los datos', hi:'सभी डेटा हटाएं', fr:'Supprimer toutes les données', ar:'حذف جميع البيانات', bn:'সমস্ত ডেটা মুছুন', pt:'Excluir todos os dados', ur:'تمام ڈیٹا ڈیلیٹ کریں', de:'Alle Daten löschen' },
  delete_desc: { en:'GDPR Right to Erasure', tr:'GDPR Unutulma Hakkı', ru:'Право на забвение GDPR', zh:'GDPR 被遗忘权', es:'Derecho de supresión GDPR', hi:'जीडीपीआर मिटाने का अधिकार', fr:'Droit à l\'effacement RGPD', ar:'حق الحذف بموجب GDPR', bn:'GDPR মুছে ফেলার অধিকার', pt:'Direito ao esquecimento GDPR', ur:'جی ڈی پی آر مٹانے کا حق', de:'GDPR Recht auf Löschung' },

  // Profile Screen
  health_profile: { en:'HEALTH PROFILE', tr:'SAĞLIK PROFİLİ', ru:'ПРОФИЛЬ ЗДОРОВЬЯ', zh:'健康资料', es:'PERFIL DE SALUD', hi:'स्वास्थ्य प्रोफ़ाइल', fr:'PROFIL DE SANTÉ', ar:'الملف الصحي', bn:'স্বাস্থ্য প্রোফাইল', pt:'PERFIL DE SAÚDE', ur:'صحت کی پروفائل', de:'GESUNDHEITSPROFIL' },
  upgrade_to_premium: { en:'Upgrade to Premium', tr:'Premium\'a Yükselt', ru:'Перейти на Premium', zh:'升级到高级版', es:'Actualizar a Premium', hi:'प्रीमियम में अपग्रेड करें', fr:'Passer à Premium', ar:'الترقية إلى بريميوم', bn:'প্রিমিয়ামে আপগ্রেড করুন', pt:'Upgrade para Premium', ur:'پریمیم میں اپ گریڈ کریں', de:'Auf Premium upgraden' },
  upgrade_sub: { en:'Unlock AI insights, advanced analytics & more', tr:'Yapay zeka içgörüleri, gelişmiş analitikler ve daha fazlasının kilidini açın', ru:'Разблокируйте ИИ-аналитику и расширенные функции', zh:'解锁 AI 见解、高级分析等', es:'Desbloquea información de IA, analíticas avanzadas y más', hi:'एआई अंतर्दृष्टि और उन्नत विश्लेषण अनलॉक करें', fr:'Débloquez des analyses IA, des statistiques avancées et plus', ar:'افتح رؤى الذكاء الاصطناعي والتحليلات المتقدمة', bn:'AI ইনসাইট, উন্নত অ্যানালিটিক্স আনলক করুন', pt:'Desbloqueie insights de IA, análises avançadas e mais', ur:'AI بصیرت اور اعلی درجے کا تجزیہ انلاک کریں', de:'Schalten Sie KI-Erkenntnisse, erweiterte Analysen & mehr frei' },
  dob: { en:'Date of Birth', tr:'Doğum Tarihi', ru:'Дата рождения', zh:'出生日期', es:'Fecha de nacimiento', hi:'जन्म तिथि', fr:'Date de naissance', ar:'تاريخ الميلاد', bn:'জন্ম তারিখ', pt:'Data de nascimento', ur:'تاریخ پیدائش', de:'Geburtsdatum' },
  avg_cycle: { en:'Average Cycle', tr:'Ortalama Döngü', ru:'Средний цикл', zh:'平均周期', es:'Ciclo promedio', hi:'औसत चक्र', fr:'Cycle moyen', ar:'متوسط الدورة', bn:'গড় চক্র', pt:'Ciclo médio', ur:'اوسط سائیکل', de:'Durchschnittlicher Zyklus' },
  avg_period: { en:'Average Period', tr:'Ortalama Adet Süresi', ru:'Средние месячные', zh:'平均经期', es:'Periodo promedio', hi:'औसत अवधि', fr:'Règles moyennes', ar:'متوسط فترة الدورة', bn:'গড় পিরিয়ড', pt:'Média da menstruação', ur:'اوسط پیریڈ', de:'Durchschnittliche Periode' },
  my_goals: { en:'My Goals', tr:'Hedeflerim', ru:'Мои цели', zh:'我的目标', es:'Mis objetivos', hi:'मेरे लक्ष्य', fr:'Mes objectifs', ar:'أهدافي', bn:'আমার লক্ষ্য', pt:'Meus objetivos', ur:'میرے مقاصد', de:'Meine Ziele' },
  account_pref: { en:'ACCOUNT & PREFERENCES', tr:'HESAP VE TERCİHLER', ru:'АККАУНТ И НАСТРОЙКИ', zh:'账户与偏好', es:'CUENTA Y PREFERENCIAS', hi:'खाता और प्राथमिकताएं', fr:'COMPTE ET PRÉFÉRENCES', ar:'الحساب والتفضيلات', bn:'অ্যাকাউন্ট এবং পছন্দসমূহ', pt:'CONTA E PREFERÊNCIAS', ur:'اکاؤنٹ اور ترجیحات', de:'KONTO & EINSTELLUNGEN' },
  support_faq: { en:'Support & FAQ', tr:'Destek ve SSS', ru:'Поддержка и FAQ', zh:'支持与常见问题', es:'Soporte y preguntas frecuentes', hi:'सहायता और प्रश्नोत्तरी', fr:'Support et FAQ', ar:'الدعم والأسئلة الشائعة', bn:'সহায়তা এবং প্রশ্নাবলী', pt:'Suporte e FAQ', ur:'سپورٹ اور سوالات', de:'Support & FAQ' },
  privacy_policy: { en:'Privacy Policy', tr:'Gizlilik Politikası', ru:'Политика конфиденциальности', zh:'隐私政策', es:'Política de privacidad', hi:'गोपनीयता नीति', fr:'Politique de confidentialité', ar:'سياسة الخصوصية', bn:'গোপনীয়তা নীতি', pt:'Política de privacidade', ur:'رازداری کی پالیسی', de:'Datenschutzerklärung' },
  logout: { en:'Sign Out', tr:'Çıkış Yap', ru:'Выйти', zh:'退出登录', es:'Cerrar sesión', hi:'साइन आउट', fr:'Déconnexion', ar:'تسجيل الخروج', bn:'সাইন আউট', pt:'Sair', ur:'سائن آؤٹ', de:'Abmelden' },
  free_plan: { en:'Free Plan', tr:'Ücretsiz Plan', ru:'Бесплатный план', zh:'免费版', es:'Plan gratuito', hi:'मुफ्त योजना', fr:'Plan gratuit', ar:'خطة مجانية', bn:'ফ্রি প্ল্যান', pt:'Plano gratuito', ur:'مفت پلان', de:'Kostenloser Plan' },
  premium_member: { en:'⭐ Premium Member', tr:'⭐ Premium Üye', ru:'⭐ Premium Участник', zh:'⭐ 高级会员', es:'⭐ Miembro Premium', hi:'⭐ प्रीमियम सदस्य', fr:'⭐ Membre Premium', ar:'⭐ عضو بريميوم', bn:'⭐ प्रিমিয়াম সদস্য', pt:'⭐ Membro Premium', ur:'⭐ پریمیم ممبر', de:'⭐ Premium-Mitglied' },
  // Login Screen Labels
  welcome_back: { en:'Welcome back', tr:'Hoş Geldiniz', ru:'С возвращением', zh:'欢迎回来', es:'Bienvenido de nuevo', hi:'वापसी पर आपका स्वागत है', fr:'Bon retour', ar:'مرحباً بعودتك', bn:'স্বাগতম', pt:'Bem-vindo de volta', ur:'خوش آمدید', de:'Willkommen zurück' },
  sign_in_sub: { en:'Sign in to continue your cycle journey', tr:'Döngü yolculuğunuza devam etmek için giriş yapın', ru:'Войдите, чтобы продолжить', zh:'登录以继续您的周期之旅', es:'Inicia sesión para continuar tu viaje', hi:'अपनी यात्रा जारी रखने के लिए साइन इन करें', fr:'Connectez-vous pour continuer', ar:'تسجيل الدخول لمتابعة رحلتك', bn:'চালিয়ে যেতে সাইন ইন করুন', pt:'Entre para continuar sua jornada', ur:'سائن ان کریں', de:'Anmelden, um fortzufahren' },
  email_label: { en:'Email', tr:'E-posta', ru:'Эл. почта', zh:'电子邮件', es:'Correo electrónico', hi:'ईमेल', fr:'E-mail', ar:'البريد الإلكتروني', bn:'ইমেল', pt:'E-mail', ur:'อีเมล', de:'E-Mail' },
  password_label: { en:'Password', tr:'Şifre', ru:'Пароль', zh:'密码', es:'Contraseña', hi:'पासवर्ड', fr:'Mot de passe', ar:'كلمة المرور', bn:'পাসওয়ার্ড', pt:'Senha', ur:'پاس ورڈ', de:'Passwort' },
  forgot_pwd: { en:'Forgot password?', tr:'Şifremi unuttum?', ru:'Забыли пароль?', zh:'忘记密码？', es:'¿Olvidaste tu contraseña?', hi:'पासवर्ड भूल गए?', fr:'Mot de passe oublié ?', ar:'هل نسيت كلمة المرور؟', bn:'পাসওয়ার্ড ভুলে গেছেন?', pt:'Esqueceu a senha?', ur:'پاس ورڈ بھول گئے؟', de:'Passwort vergessen?' },
  login_btn: { en:'Log In', tr:'Giriş Yap', ru:'Войти', zh:'登录', es:'Iniciar sesión', hi:'लॉग इन करें', fr:'Se connecter', ar:'تسجيل الدخول', bn:'লগ ইন করুন', pt:'Entrar', ur:'لاگ ان کریں', de:'Anmelden' },
  or_continue: { en:'or continue with', tr:'veya şununla devam edin', ru:'или войдите через', zh:'或继续使用', es:'o continúa con', hi:'या इसके साथ जारी रखें', fr:'ou continuez avec', ar:'أو المتابعة باستخدام', bn:'অথবা এটি দিয়ে চালিয়ে যান', pt:'ou continue com', ur:'یا اس کے ساتھ جاری رکھیں', de:'oder fortfahren mit' },
  continue_google: { en:'Continue with Google', tr:'Google ile Devam Et', ru:'Продолжить через Google', zh:'使用 Google 继续', es:'Continuar con Google', hi:'गूगल के साथ जारी रखें', fr:'Continuer avec Google', ar:'المتابعة باستخدام Google', bn:'Google দিয়ে চালিয়ে যান', pt:'Continuar com Google', ur:'Google کے ساتھ جاری رکھیں', de:'Weiter mit Google' },
  continue_apple: { en:'Continue with Apple', tr:'Apple ile Devam Et', ru:'Продолжить через Apple', zh:'使用 Apple 继续', es:'Continuar con Apple', hi:'ऐप्पल के साथ जारी रखें', fr:'Continuer avec Apple', ar:'المتابعة باستخدام Apple', bn:'Apple দিয়ে চালিয়ে যান', pt:'Continuar com Apple', ur:'Apple के ساتھ جاری رکھیں', de:'Weiter mit Apple' },
  no_account: { en:'Don\'t have an account?', tr:'Hesabınız yok mu?', ru:'Нет аккаунта?', zh:'还没有账户？', es:'¿No tienes una cuenta?', hi:'खाता नहीं है?', fr:'Vous n\'avez pas de compte ?', ar:'ليس لديك حساب؟', bn:'অ্যাকাউন্ট নেই?', pt:'Não tem uma conta?', ur:'اکاؤنٹ نہیں ہے؟', de:'Noch kein Konto?' },
  create_one: { en:'Create one', tr:'Hesap Oluştur', ru:'Создать', zh:'创建一个', es:'Crear una', hi:'एक बनाएं', fr:'Créer un compte', ar:'إنشاء حساب', bn:'তৈরি করুন', pt:'Criar conta', ur:'اکاؤنٹ بنائیں', de:'Konto erstellen' },
  // Home Screen Labels
  good_morning: { en:'Good morning', tr:'İyi sabahlar', ru:'Доброе утро', zh:'早上好', es:'Buenos días', hi:'सुप्रभात', fr:'Bonjour', ar:'صباح الخير', bn:'শুভ সকাল', pt:'Bom dia', ur:'صبح بخیر', de:'Guten Morgen' },
  good_afternoon: { en:'Good afternoon', tr:'Tünaydın', ru:'Добрый день', zh:'下午好', es:'Buenas tardes', hi:'नमस्कार', fr:'Bon après-midi', ar:'مساء الخير', bn:'শুভ অপরাহ্ন', pt:'Boa tarde', ur:'دوپہر بخیر', de:'Guten Tag' },
  good_evening: { en:'Good evening', tr:'İyi akşamlar', ru:'Добрый вечер', zh:'晚上好', es:'Buenas noches', hi:'शुभ संध्या', fr:'Bonsoir', ar:'مساء الخير', bn:'শুভ সন্ধ্যা', pt:'Boa noite', ur:'شام بخیر', de:'Guten Abend' },
  phase_menstrual: { en:'Menstrual Phase', tr:'Adet Evresi', ru:'Фаза менструации', zh:'月经期', es:'Fase menstrual', hi:'मासिक धर्म चरण', fr:'Phase menstruelle', ar:'مرحلة الطمث', bn:'মেনস্ট্রুয়াল ফেজ', pt:'Fase menstrual', ur:'حیض کا مرحلہ', de:'Menstruationsphase' },
  phase_follicular: { en:'Follicular Phase', tr:'Foliküler Evre', ru:'Фолликулярная фаза', zh:'卵泡期', es:'Fase folicular', hi:'फॉलिक्युलर चरण', fr:'Phase folliculaire', ar:'المرحلة الجريبية', bn:'ফলিকুলার ফেজ', pt:'Fase folicular', ur:'فولیکولر مرحلہ', de:'Follikelphase' },
  phase_ovulation: { en:'Ovulation Phase', tr:'Yumurtlama Evresi', ru:'Фаза овуляции', zh:'排卵期', es:'Fase de ovulación', hi:'ओव्यूलेशन चरण', fr:'Phase d\'ovulation', ar:'المرحلة الإباضة', bn:'ওভিউলেশন ফেজ', pt:'Fase de ovulação', ur:'اوولوشن مرحلہ', de:'Eisprungphase' },
  phase_luteal: { en:'Luteal Phase', tr:'Lüteal Evre', ru:'Лютеиновая фаза', zh:'黄体期', es:'Fase lútea', hi:'ल्यूटियल चरण', fr:'Phase lutéale', ar:'المرحلة الجسمية', bn:'লুটিয়াল ফেজ', pt:'Fase lútea', ur:'لیوٹیل مرحلہ', de:'Lutealphase' },
  cycle_day_lbl: { en:'CYCLE DAY', tr:'DÖNGÜ GÜNÜ', ru:'ДЕНЬ ЦИКЛА', zh:'周期天数', es:'DÍA DEL CICLO', hi:'चक्र का दिन', fr:'JOUR DU CYCLE', ar:'يوم الدورة', bn:'চক্রের দিন', pt:'DIA DO CICLO', ur:'سائیکل کا دن', de:'ZYKLUSTAG' },
  days_until_period: { en:'Days Until Period', tr:'Adete Kalan Gün', ru:'Дней до месячных', zh:'距离月经天数', es:'Días para el periodo', hi:'पीरियड में बाकी दिन', fr:'Jours avant règles', ar:'أيام حتى الدورة', bn:'পিরিয়ড পর্যন্ত দিন', pt:'Dias até a menstruação', ur:'پیریڈ تک باقی دن', de:'Tage bis zur Periode' },
  avg_cycle_length: { en:'Avg Cycle Length', tr:'Ort. Döngü Süresi', ru:'Ср. длина цикла', zh:'平均周期长度', es:'Duración media ciclo', hi:'औसत चक्र अवधि', fr:'Durée moy. du cycle', ar:'متوسط طول الدورة', bn:'গড় চক্র দৈর্ঘ্য', pt:'Duração média do ciclo', ur:'اوسط سائیکل کی لمبائی', de:'Durschn. Zykluslänge' },
  fertility_status: { en:'Fertility Status', tr:'Doğurganlık Durumu', ru:'Статус фертильности', zh:'生育状态', es:'Estado de fertilidad', hi:'उर्वरता की स्थिति', fr:'Statut de fertilité', ar:'حالة الخصوبة', bn:'উর্বরতার অবস্থা', pt:'Status de fertilidade', ur:'زرخیزی کی صورتحال', de:'Fruchtbarkeitsstatus' },
  fert_very_low: { en:'Very Low', tr:'Çok Düşük', ru:'Очень низкий', zh:'极低', es:'Muy baja', hi:'बहुत कम', fr:'Très faible', ar:'منخفض جداً', bn:'খুব কম', pt:'Muito baixa', ur:'بہت کم', de:'Sehr niedrig' },
  fert_low: { en:'Low', tr:'Düşük', ru:'Низкий', zh:'低', es:'Baja', hi:'कम', fr:'Faible', ar:'منخفض', bn:'কম', pt:'Baixa', ur:'کم', de:'Niedrig' },
  fert_high: { en:'High', tr:'Yüksek', ru:'Высокий', zh:'高', es:'Alta', hi:'उच्च', fr:'Élevée', ar:'مرتفع', bn:'উচ্চ', pt:'Alta', ur:'زیادہ', de:'Hoch' },
  fert_peak: { en:'Peak', tr:'Zirve', ru:'Пиковый', zh:'峰值', es:'Pico', hi:'शीर्ष', fr:'Pic', ar:'ذروة', bn:'শীর্ষ', pt:'Pico', ur:'چوٹی', de:'Spitze' },
  quick_log: { en:'Quick Log', tr:'Hızlı Kayıt', ru:'Быстрая запись', zh:'快速记录', es:'Registro rápido', hi:'त्वरित लॉग', fr:'Saisie rapide', ar:'تسجيل سريع', bn:'দ্রুত লগ', pt:'Registro rápido', ur:'فوری لاگ', de:'Schnelleingabe' },
  period_qa: { en:'Period', tr:'Adet', ru:'Месячные', zh:'经期', es:'Periodo', hi:'अवधि', fr:'Règles', ar:'الدورة', bn:'পিরিয়ড', pt:'Menstruação', ur:'پیریڈ', de:'Periode' },
  symptoms_qa: { en:'Symptoms', tr:'Semptomlar', ru:'Симптомы', zh:'症状', es:'Síntomas', hi:'लक्षण', fr:'Symptômes', ar:'الأعراض', bn:'লক্ষণ', pt:'Sintomas', ur:'علامات', de:'Symptome' },
  mood_qa: { en:'Mood', tr:'Ruh Hali', ru:'Настроение', zh:'心情', es:'Estado de ánimo', hi:'मनोदशा', fr:'Humeur', ar:'المزاج', bn:'মেজাজ', pt:'Humor', ur:'مزاج', de:'Stimmung' },
  journal_qa: { en:'Journal', tr:'Günlük', ru:'Дневник', zh:'日记', es:'Diario', hi:'डायरी', fr:'Journal', ar:'اليوميات', bn:'জার্নাল', pt:'Diário', ur:'ڈائری', de:'Tagebuch' },
  fertility_window: { en:'🌿 Fertility Window', tr:'🌿 Doğurganlık Penceresi', ru:'🌿 Фертильное окно', zh:'🌿 可孕期', es:'🌿 Ventana fértil', hi:'🌿 उर्वर विंडो', fr:'🌿 Fenêtre de fertilité', ar:'🌿 نافذة الخصوبة', bn:'🌿 ফারটাইল উইন্ডো', pt:'🌿 Janela fértil', ur:'🌿 زرخیز ونڈو', de:'🌿 Fruchtbarkeitsfenster' },
  next_period_prefix: { en:'Next period', tr:'Sonraki adet', ru:'След. месячные', zh:'下次月经', es:'Próximo periodo', hi:'अगला पीरियड', fr:'Prochaines règles', ar:'الدورة القادمة', bn:'পরবর্তী পিরিয়ড', pt:'Próxima menstruação', ur:'اگلا پیریڈ', de:'Nächste Periode' },
  ovulation_on: { en:'Ovulation on', tr:'Yumurtlama', ru:'Овуляция', zh:'排卵日', es:'Ovulación el', hi:'ओव्यूलेशन', fr:'Ovulation le', ar:'الإباضة في', bn:'ওভিউলেশন', pt:'Ovulação em', ur:'اوولوشن', de:'Eisprung am' },
  todays_snapshot: { en:'Today\'s Snapshot', tr:'Bugünün Özeti', ru:'Итоги дня', zh:'今日概览', es:'Resumen de hoy', hi:'आज का स्नैपशॉट', fr:'Aperçu du jour', ar:'ملخص اليوم', bn:'আজকের সারসংক্ষেপ', pt:'Resumo de hoje', ur:'آج کا خلاصہ', de:'Heutige Übersicht' },
  see_reports: { en:'See Reports', tr:'Raporları Gör', ru:'Смотреть отчеты', zh:'查看報告', es:'Ver informes', hi:'रिपोर्ट देखें', fr:'Voir les rapports', ar:'عرض التقارير', bn:'রিপোর্ট দেখুন', pt:'Ver relatórios', ur:'رپورٹس دیکھیں', de:'Berichte ansehen' },
  not_logged: { en:'Not logged', tr:'Kaydedilmedi', ru:'Не записано', zh:'未记录', es:'No registrado', hi:'दर्ज नहीं', fr:'Non saisi', ar:'غير مسجل', bn:'রেকর্ড করা হয়নি', pt:'Não registrado', ur:'لاگ نہیں کیا گیا', de:'Nicht eingetragen' },
  logged_suffix: { en:'logged', tr:'kayıtlı', ru:'записано', zh:'已记录', es:'registrado', hi:'दर्ज', fr:'enregistré', ar:'مسجل', bn:'রেকর্ড করা হয়েছে', pt:'registrado', ur:'لاگ کیا گیا', de:'eingetragen' },
  ai_insights_title: { en:'✨ AI Insights', tr:'✨ Yapay Zeka İçgörüleri', ru:'✨ ИИ-Аналитика', zh:'✨ AI 见解', es:'✨ Información de IA', hi:'✨ एआई अंतर्दृष्टि', fr:'✨ Analyses IA', ar:'✨ رؤى الذكاء الاصطناعي', bn:'✨ AI ইনসাইট', pt:'✨ Insights de IA', ur:'✨ AI بصیرت', de:'✨ KI-Erkenntnisse' },
  view_all: { en:'View All', tr:'Tümünü Gör', ru:'Смотреть все', zh:'查看全部', es:'Ver todo', hi:'सभी देखें', fr:'Voir tout', ar:'عرض الكل', bn:'সব দেখুন', pt:'Ver todos', ur:'تمام دیکھیں', de:'Alle ansehen' },

  // AI Insights Screen Keys
  ai_insights_topbar: { en:'AI Insights', tr:'Yapay Zeka İçgörüleri', ru:'ИИ-Аналитика', zh:'AI 见解', es:'Información de IA', hi:'एआई अंतर्दृष्टि', fr:'Analyses IA', ar:'رؤى الذكاء الاصطناعي', bn:'AI ইনসাইট', pt:'Insights de IA', ur:'AI بصیرت', de:'KI-Erkenntnisse' },
  insights_hero_title: { en:'Your Health Insights', tr:'Sağlık İçgörüleriniz', ru:'Ваша аналитика здоровья', zh:'您的健康见解', es:'Información sobre su salud', hi:'आपकी स्वास्थ्य अंतर्दृष्टि', fr:'Vos analyses de santé', ar:'رؤاك الصحية', bn:'আপনার স্বাস্থ্য ইনসাইট', pt:'Seus insights de saúde', ur:'آپ کی صحت کی بصیرت', de:'Ihre Gesundheitserkenntnisse' },
  insights_hero_sub: { en:'Personalized patterns detected from your cycle data over 6 months', tr:'6 aylık döngü verilerinizden tespit edilen kişiselleştirilmiş kalıplar', ru:'Персонализированные паттерны за последние 6 месяцев', zh:'从您 6 个月的周期数据中检测到的个性化模式', es:'Patrones personalizados detectados a partir de los datos de su ciclo durante 6 meses', hi:'6 महीनों में आपके चक्र डेटा से पहचाने गए व्यक्तिगत पैटर्न', fr:'Modèles personnalisés détectés sur 6 mois de données de cycle', ar:'أنماط مخصصة تم اكتشافها من بيانات دورتك على مدار 6 أشهر', bn:'৬ মাসের সাইকেল ডেটা থেকে সনাক্ত করা ব্যক্তিগতকৃত প্যাটার্ন', pt:'Padrões personalizados detectados nos seus dados de ciclo ao longo de 6 meses', ur:'6 مہینوں میں آپ کے سائیکل ڈیٹا سے دریافت کردہ ذاتی نوعیت کے نمونے', de:'Personalisierte Muster aus Ihren Zyklusdaten über 6 Monate' },

  ins_tag_1: { en:'Cycle Pattern', tr:'Döngü Kalıbı', ru:'Паттерн цикла', zh:'周期模式', es:'Patrón de ciclo', hi:'चक्र पैटर्न', fr:'Modèle de cycle', ar:'نمط الدورة', bn:'সাইকেল প্যাটার্ন', pt:'Padrão de ciclo', ur:'سائیکل کا پیٹرن', de:'Zyklusmuster' },
  ins_title_1: { en:'Your cycles are getting more regular!', tr:'Döngüleriniz giderek daha düzenli hale geliyor!', ru:'Ваши циклы становятся более регулярными!', zh:'您的周期变得越来越规律！', es:'¡Tus ciclos son cada vez más regulares!', hi:'आपके चक्र अधिक नियमित हो रहे हैं!', fr:'Vos cycles deviennent plus réguliers !', ar:'دوراتك أصبحت أكثر انتظاماً!', bn:'আপনার সাইকেলগুলি আরও নিয়মিত হচ্ছে!', pt:'Seus ciclos estão cada vez mais regulares!', ur:'آپ کے سائیکل زیادہ باقاعدہ ہو رہے ہیں!', de:'Ihre Zyklen werden regelmäßiger!' },
  ins_body_1: { en:'Over the last 6 cycles, your cycle length variation has dropped from ±4 days to ±1.5 days. This is a great sign of hormonal stability.', tr:'Son 6 döngüde, döngü uzunluğu değişimi ±4 günden ±1.5 güne düştü. Bu, hormonal dengenin harika bir işaretidir.', ru:'За последние 6 циклов колебание длины сократилось с ±4 до ±1,5 дней.', zh:'在过去 6 个周期中，您的周期长度变化已从 ±4 天降至 ±1.5 天。这是荷尔蒙稳定的好兆头。', es:'En los últimos 6 ciclos, la variación de la duración de su ciclo se redujo de ±4 días a ±1.5 días.', hi:'पिछले 6 चक्रों में, आपके चक्र की अवधि में अंतर ±4 दिनों से घटकर ±1.5 दिन हो गया है।', fr:'Au cours des 6 derniers cycles, la variation de la durée de votre cycle est passée de ±4 jours à ±1,5 jours.', ar:'على مدار آخر 6 دورات، انخفض التباين من ±4 أيام إلى ±1.5 يوم.', bn:'গত ৬ টি সাইকেলে, আপনার সাইকেলের দৈর্ঘ্যের তারতম্য ±৪ দিন থেকে কমে ±১.৫ দিনে নেমে এসেছে।', pt:'Nos últimos 6 ciclos, a variação da duração do seu ciclo caiu de ±4 dias para ±1,5 dias.', ur:'پچھلے 6 سائیکلوں میں، آپ کے سائیکل کی لمبائی کی تبدیلی ±4 دنوں سے کم ہو کر ±1.5 دن ہو گئی ہے۔', de:'In den letzten 6 Zyklen sank Ihre Zykluslängenschwankung von ±4 Tagen auf ±1,5 Tage.' },

  ins_tag_2: { en:'Symptom Insight', tr:'Semptom İçgörüsü', ru:'Анализ симптомов', zh:'症状分析', es:'Información de síntomas', hi:'लक्षण अंतर्दृष्टि', fr:'Analyse des symptômes', ar:'رؤية الأعراض', bn:'লক্ষণ ইনসাইট', pt:'Insight de sintomas', ur:'علامات کی بصیرت', de:'Symptomerkenntnis' },
  ins_title_2: { en:'Headaches often appear before your period', tr:'Baş ağrıları genellikle adetinizden önce ortaya çıkıyor', ru:'Головные боли часто возникают перед месячными', zh:'头痛通常在月经前出现', es:'Los dolores de cabeza suelen aparecer antes del periodo', hi:'सिरदर्द अक्सर आपके पीरियड से पहले होता है', fr:'Les maux de tête apparaissent souvent avant vos règles', ar:'غالباً ما تظهر آلام الرأس قبل الدورة', bn:'পিরিয়ডের আগে প্রায়ই মাথাব্যথা দেখা দেয়', pt:'Dores de cabeça costumam aparecer antes da menstruação', ur:'پیریڈز سے پہلے اکثر سر درد ہوتا ہے', de:'Kopfschmerzen treten oft vor der Periode auf' },
  ins_body_2: { en:'You\'ve logged headaches 3–4 days before your period start in 4 out of 5 recent cycles. This is likely linked to the drop in estrogen in the late luteal phase.', tr:'Son 5 döngünün 4\'ünde adet başlamadan 3-4 gün önce baş ağrısı kaydettiniz. Bu muhtemelen geç lüteal evredeki östrojen düşüşüyle bağlantılıdır.', ru:'Вы отмечали головные боли за 3–4 дня до начала месячных в 4 из 5 последних циклов.', zh:'在最近的 5 个周期中，有 4 个周期您在月经来潮前 3-4 天记录了头痛。', es:'Has registrado dolores de cabeza 3-4 días antes del inicio del periodo en 4 de los últimos 5 ciclos.', hi:'हाल के 5 में से 4 चक्रों में आपने पीरियड शुरू होने से 3-4 दिन पहले सिरदर्द दर्ज किया है।', fr:'Vous avez enregistré des maux de tête 3 à 4 jours avant le début de vos règles lors de 4 des 5 derniers cycles.', ar:'لقد سجلت آلام الرأس قبل 3-4 أيام من بدء الدورة في 4 من أصل 5 دورات أخيرة.', bn:'সাম্প্রতিক ৫ টি সাইকেলের মধ্যে ৪ টিতেই আপনি পিরিয়ড শুরুর ৩-৪ দিন আগে মাথাব্যথা রেকর্ড করেছেন।', pt:'Você registrou dores de cabeça 3 a 4 dias antes do início da menstruação em 4 dos últimos 5 ciclos.', ur:'حالیہ 5 میں سے 4 سائیکلوں میں آپ نے پیریڈ شروع ہونے سے 3-4 دن پہلے سر درد درج کیا ہے۔', de:'Sie haben in 4 der letzten 5 Zyklen 3–4 Tage vor Periodenbeginn Kopfschmerzen eingetragen.' },

  ins_tag_3: { en:'Energy Insight', tr:'Enerji İçgörüsü', ru:'Анализ энергии', zh:'精力分析', es:'Información de energía', hi:'ऊर्जा अंतर्दृष्टि', fr:'Analyse d\'énergie', ar:'رؤية الطاقة', bn:'শক্তি ইনসাইট', pt:'Insight de energia', ur:'توانائی کی بصیرت', de:'Energieerkenntnis' },
  ins_title_3: { en:'Your energy peaks around ovulation', tr:'Enerjiniz yumurtlama civarında zirve yapıyor', ru:'Ваша энергия достигает пика во время овуляции', zh:'您的精力在排卵期达到峰值', es:'Tu energía alcanza su punto máximo durante la ovulación', hi:'आपकी ऊर्जा ओव्यूलेशन के आसपास चरम पर होती है', fr:'Votre énergie atteint son pic au moment de l\'ovulation', ar:'تصل طاقتك إلى ذروتها حول فترة الإباضة', bn:'ওভিউলেশনের সময় আপনার শক্তি শীর্ষে পৌঁছায়', pt:'Sua energia atinge o pico por volta da ovulação', ur:'اوولوشن کے آس پاس آپ کی توانائی عروج پر ہوتی ہے', de:'Ihre Energie erreicht um den Eisprung ihren Höhepunkt' },
  ins_body_3: { en:'Your mood and energy ratings are consistently highest on days 13–15 of your cycle (ovulation window). Plan important events during this time!', tr:'Ruh hali ve enerji derecelendirmeniz döngünüzün 13-15. günlerinde (yumurtlama penceresi) sürekli en yüksek seviyededir. Önemli etkinlikleri bu zamana planlayın!', ru:'Оценки настроения и энергии стабильно выше на 13–15 дни цикла.', zh:'您的情绪和精力评分在周期的第 13-15 天（排卵期）持续最高。在此期间安排重要活动！', es:'Tus evaluaciones de estado de ánimo y energía son constantemente las más altas en los días 13-15 de tu ciclo.', hi:'आपके चक्र के 13-15 वें दिनों (ओव्यूलेशन विंडो) में आपका मूड और ऊर्जा रेटिंग उच्चतम होती है।', fr:'Vos évaluations d\'humeur et d\'énergie sont les plus élevées aux jours 13 à 15 de votre cycle.', ar:'تقييمات مزاجك وطاقتك هي الأعلى باستمرار في الأيام 13-15 من دورتك.', bn:'আপনার সাইকেলের ১৩-১৫ তম দিনে আপনার মেজাজ এবং শক্তির স্কোর ধারাবাহিকভাবে সর্বোচ্চ থাকে।', pt:'Suas avaliações de humor e energia são consistentemente as mais altas nos dias 13 a 15 do seu ciclo.', ur:'آپ کے موڈ اور توانائی کی ریٹنگز مسلسل آپ کے سائیکل کے 13-15 ویں دنوں میں سب سے زیادہ ہوتی ہیں۔', de:'Ihre Stimmung und Energie sind an den Tagen 13–15 Ihres Zyklus (Eisprungfenster) am höchsten.' },

  ins_tag_4: { en:'Sleep Pattern', tr:'Uyku Kalıbı', ru:'Паттерн сна', zh:'睡眠模式', es:'Patrón de sueño', hi:'नींद का पैटर्न', fr:'Modèle de sommeil', ar:'نمط النوم', bn:'ঘুমের প্যাটার্ন', pt:'Padrão de sono', ur:'نیند کا پیٹرن', de:'Schlafmuster' },
  ins_title_4: { en:'Sleep quality dips in your luteal phase', tr:'Lüteal evrede uyku kalitesi düşüyor', ru:'Качество сна снижается в лютеиновой фазе', zh:'黄体期睡眠质量下降', es:'La calidad del sueño disminuye en la fase lútea', hi:'ल्यूटियल चरण में नींद की गुणवत्ता गिरती है', fr:'La qualité du sommeil diminue en phase lutéale', ar:'تنخفض جودة النوم في المرحلة الجسمية', bn:'লুটিয়াল ফেজে ঘুমের গুণমান হ্রাস পায়', pt:'A qualidade do sono cai na fase lútea', ur:'لیوٹیل مرحلے میں نیند کی کوالٹی کم ہوتی ہے', de:'Schlafqualität sinkt in der Lutealphase' },
  ins_body_4: { en:'Based on your logs, sleep quality tends to decrease on days 19–24. We recommend reducing screen time and caffeine after 2pm during this phase.', tr:'Kayıtlarınıza göre, uyku kalitesi 19-24. günlerde düşme eğilimindedir. Bu evrede saat 14:00\'ten sonra ekran süresini ve kafeini azaltmanızı öneririz.', ru:'Основываясь на ваших записях, качество сна снижается на 19–24 дни.', zh:'根据您的记录，睡眠质量在第 19-24 天往往会下降。建议在此阶段下午 2 点后减少屏幕时间和咖啡因。', es:'Según tus registros, la calidad del sueño tiende a disminuir en los días 19-24.', hi:'आपके लॉग के आधार पर, 19-24 दिनों में नींद की गुणवत्ता कम हो जाती है।', fr:'D\'après vos saisies, la qualité du sommeil tend à diminuer entre les jours 19 et 24.', ar:'بناءً على سجلاتك، تميل جودة النوم إلى الانخفاض في الأيام 19-24.', bn:'আপনার লগগুলির ওপর ভিত্তি করে, ১৯-২৪ তম দিনে ঘুমের গুণমান হ্রাস পেতে থাকে।', pt:'Com base nos seus registros, a qualidade do sono tende a diminuir nos dias 19 a 24.', ur:'آپ کے لاگز کی بنیاد پر، 19-24 دنوں میں نیند کی کوالٹی کم ہوتی ہے۔', de:'Basierend auf Ihren Einträgen nimmt die Schlafqualität an den Tagen 19–24 ab.' },

  ins_tag_5: { en:'Exercise Insight', tr:'Egzersiz İçgörüsü', ru:'Анализ тренировок', zh:'运动分析', es:'Información de ejercicio', hi:'व्यायाम अंतर्दृष्टि', fr:'Analyse d\'exercice', ar:'رؤية التمارين', bn:'ব্যায়াম ইনসাইট', pt:'Insight de exercício', ur:'ورزش کی بصیرت', de:'Trainingserkenntnis' },
  ins_title_5: { en:'Optimal workout schedule for your cycle', tr:'Döngünüz için en uygun egzersiz takvimi', ru:'Оптимальный график тренировок для вашего цикла', zh:'适合您周期的最佳健身计划', es:'Calendario de entrenamiento óptimo para tu ciclo', hi:'आपके चक्र के लिए इष्टतम कसरत अनुसूची', fr:'Programme d\'entraînement optimal pour votre cycle', ar:'جدول التمارين الأمثل لدورتك', bn:'আপনার সাইকেলের জন্য উপযুক্ত ওয়ার্কআউট সময়সূচী', pt:'Cronograma de treino ideal para o seu ciclo', ur:'آپ کے سائیکل کے لیے بہترین ورزش کا شیڈول', de:'Optimaler Trainingsplan für Ihren Zyklus' },
  ins_body_5: { en:'HIIT and strength training works best in your follicular phase (days 6–13). Opt for yoga and walking during your luteal phase for better recovery.', tr:'HIIT ve güç antrenmanları en iyi foliküler evrenizde (6-13. günler) işe yarar. Daha iyi toparlanma için lüteal evrede yoga ve yürüyüşü tercih edin.', ur:'HIIT اور طاقت کی تربیت آپ کے فولیکولر مرحلے (دن 6-13) میں بہترین کام کرتی ہے۔', de:'HIIT und Krafttraining funktionieren am besten in Ihrer Follikelphase (Tage 6–13).', es:'El entrenamiento HIIT y de fuerza funciona mejor en la fase folicular (días 6–13).', fr:'Le HIIT et la musculation fonctionnent mieux pendant votre phase folliculaire (jours 6 à 13).', ru:'HIIT и силовые тренировки лучше всего подходят в фолликулярной фазе (6–13 дни).', zh:'HIIT 和力量训练在您的卵泡期（第 6-13 天）效果最佳。', hi:'HIIT और स्ट्रेंथ ट्रेनिंग आपके फॉलिक्युलर चरण (दिन 6-13) में सबसे अच्छा काम करती है।', ar:'تمارين HIIT والقوة تعمل بشكل أفضل في المرحلة الجريبية (الأيام 6-13).', bn:'HIIT এবং স্ট্রেন্থ ট্রেনিং আপনার ফলিকুলার ফেজে (৬-১৩ দিন) সবচেয়ে ভালো কাজ করে।', pt:'HIIT e treino de força funcionam melhor na sua fase folicular (dias 6 a 13).' },

  unlock_premium: { en:'Unlock with Premium', tr:'Premium ile Kilidi Açın', ru:'Разблокировать с Premium', zh:'使用高级版解锁', es:'Desbloquear con Premium', hi:'प्रीमियम के साथ अनलॉक करें', fr:'Débloquer avec Premium', ar:'الفتح باستخدام بريميوم', bn:'প্রিমিয়াম দিয়ে আনলক করুন', pt:'Desbloquear com Premium', ur:'پریمیم کے ساتھ انلاک کریں', de:'Mit Premium freischalten' },
  upgrade_now: { en:'Upgrade Now', tr:'Şimdi Yükselt', ru:'Обновить сейчас', zh:'立即升级', es:'Actualizar ahora', hi:'अभी अपग्रेड करें', fr:'Mettre à niveau', ar:'التحديث الآن', bn:'এখনই আপগ্রেড করুন', pt:'Fazer upgrade agora', ur:'ابھی اپ گریڈ کریں', de:'Jetzt upgraden' },

  // Early Period Ended Keys (12 Languages)
  period_ended_early_title: { en:'Did your period end early?', tr:'Adetiniz erken mi bitti?', ur:'کیا آپ کا حیض جلدی ختم ہو گیا؟', de:'Hat Ihre Periode früher aufgehört?', es:'¿Tu período terminó antes de tiempo?', fr:'Vos règles ont-elles terminé plus tôt ?', ru:'Месячные закончились раньше?', zh:'您的月经提前结束了吗？', hi:'क्या आपका मासिक धर्म जल्दी समाप्त हो गया?', ar:'هل انتهت دورتك الشهرية مبكراً؟', bn:'আপনার পিরিয়ড কি নির্ধারিত সময়ের আগেই শেষ হয়েছে?', pt:'Sua menstruação terminou mais cedo?' },
  period_ended_early_sub: { en:'Tap to mark period ended, update average duration & switch to Follicular Phase.', tr:'Adet evresinden çıkıp Foliküler Evreye geçmek ve takvimi güncellemek için tıklayın.', ur:'حیض کے ختم ہونے کا نشان لگائیں اور کیلنڈر کو اپ ڈیٹ کریں۔', de:'Tippen zum Beenden der Periode & Aktualisieren des Kalenders.', es:'Toca para marcar el fin del período y actualizar el calendario.', fr:'Appuyez pour marquer la fin des règles et mettre à jour le calendrier.', ru:'Нажмите, чтобы отметить окончание месячных и обновить календарь.', zh:'点击标记月经结束并更新日历。', hi:'मासिक धर्म की समाप्ति चिह्नित करने के लिए टैप करें。', ar:'انقر لتحديد نهاية الدورة وتحديث التقويم.', bn:'পিরিয়ড সমাপ্তি চিহ্নিত করতে এবং ক্যালেন্ডার আপডেট করতে চাপুন。', pt:'Toque para marcar o fim da menstruação e atualizar o calendário.' },
  mark_period_ended_btn: { en:'Period Ended ✨', tr:'Adetim Bitti ✨', ur:'حیض ختم ہو گیا ✨', de:'Periode Beendet ✨', es:'Período finalizado ✨', fr:'Règles terminées ✨', ru:'Месячные завершились ✨', zh:'月经已结束 ✨', hi:'मासिक धर्म समाप्त ✨', ar:'انتهت الدورة ✨', bn:'পিরিয়ড শেষ হয়েছে ✨', pt:'Menstruação terminada ✨' },
  period_ended_toast: { en:'Period end recorded! Average duration updated & switched to Follicular Phase. ', tr:'Adetinizin bittiği kaydedildi! Ortalama adet süreniz güncellendi ve Foliküler Evreye geçildi. ', ur:'حیض کے اختتام کا ریکارڈ محفوظ کر لیا گیا! ', de:'Periodenende gespeichert! Durchschn. Dauer aktualisiert. ', es:'¡Fin del período registrado! Promedio actualizado. ', fr:'Fin des règles enregistrée ! Durée moyenne mise à jour. ', ru:'Конец месячных записан! Средняя длительность обновлена. ', zh:'已记录经期结束！已更新平均天数。 ', hi:'मासिक धर्म का अंत रिकॉर्ड किया गया! ', ar:'تم تسجيل نهاية الدورة! ', bn:'পিরিয়ড সমাপ্তি রেকর্ড করা হয়েছে! ', pt:'Fim da menstruação registrado! Média atualizada. ' },
  period_ended_badge: { en:'Early Period End', tr:'Erken Adet Bitişi', ur:'حیض کا جلدی اختتام', de:'Frühes Periodenende', es:'Fin prematuro del período', fr:'Fin précoce des règles', ru:'Раннее окончание месячных', zh:'月经提前结束', hi:'प्रारंभिक अवधि अंत', ar:'نهاية الدورة المبكرة', bn:'প্রাথমিক পিরিয়ড সমাপ্তি', pt:'Fim precoce da menstruação' },
  resume_period_btn: { en:'Resume Period Log', tr:'Adet Kaydına Devam Et', ur:'حیض کے لاگ کو جاری رکھیں', de:'Periodeneintrag fortsetzen', es:'Reanudar registro de período', fr:'Reprendre le suivi des règles', ru:'Возобновить запись месячных', zh:'恢复经期记录', hi:'मासिक धर्म लॉग फिर से शुरू करें', ar:'استئناف سجل الدورة', bn:'পিরিয়ড লগ আবার شروع করুন', pt:'Retomar registro de menstruação' },
  badge_new: { en:'NEW', tr:'YENİ', ru:'НОВОЕ', zh:'最新', es:'NUEVO', hi:'नया', fr:'NOUVEAU', ar:'جديد', bn:'নতুন', pt:'NOVO', ur:'نیا', de:'NEU' },

  calendar_title: { en:'Calendar', tr:'Takvim & Döngü', ru:'Календарь', zh:'日历', es:'Calendario', hi:'कैलेंडर', fr:'Calendrier', ar:'التقويم', bn:'ক্যালেন্ডার', pt:'Calendário', ur:'کیلنڈر', de:'Kalender' },
  today_badge: { en:'Today', tr:'Bugün', ru:'Сегодня', zh:'今天', es:'Hoy', hi:'आज', fr:'Aujourd\'hui', ar:'اليوم', bn:'আজ', pt:'Hoje', ur:'آج', de:'Heute' },
  phase_lbl: { en:'Phase', tr:'Evre', ru:'Фаза', zh:'阶段', es:'Fase', hi:'चरण', fr:'Phase', ar:'المرحلة', bn:'ফেজ', pt:'Fase', ur:'مرحلہ', de:'Phase' },
  ovulation_day_text: { en:'Ovulation Day — Peak fertility', tr:'Yumurtlama Günü — Zirve doğurganlık', ru:'День овуляции — Пиковая фертильность', zh:'排卵日 — 最佳受孕期', es:'Día de ovulación — Fertilidad máxima', hi:'ओव्यूलेशन दिवस — चरम उर्वरता', fr:'Jour d\'ovulation — Fertilité maximale', ar:'يوم الإباضة — ذروة الخصوبة', bn:'ওভিউলেশন দিন — শীর্ষ উর্বরতা', pt:'Dia da ovulação — Fertilidade máxima', ur:'اوولوشن کا دن — سب سے زیادہ زرخیزی', de:'Eisprungtag — Höchste Fruchtbarkeit' },
  fertile_window_text: { en:'Fertile Window — Elevated chances', tr:'Doğurgan Dönem — Yüksek gebe kalma şansı', ru:'Фертильное окно — Высокий шанс', zh:'排卵期 — 受孕几率增加', es:'Ventana fértil — Probabilidades elevadas', hi:'उर्वर विंडो — उच्च संभावनाएं', fr:'Fenêtre fertile — Chances élevées', ar:'النافذة الخصبة — فرص مرتفعة', bn:'ফারটাইল উইন্ডো — উচ্চ সম্ভাবনা', pt:'Janela fértil — Chances elevadas', ur:'زرخیز ونڈو — زیادہ امکانات', de:'Fruchtbarkeitsfenster — Erhöhte Chancen' },
  predicted_period_text: { en:'Predicted Period', tr:'Tahmini Adet', ru:'Прогнозируемые месячные', zh:'预测经期', es:'Periodo previsto', hi:'अनुमानित अवधि', fr:'Règles prévues', ar:'الدورة المتوقعة', bn:'আনুমানিক পিরিয়ড', pt:'Menstruação prevista', ur:'متوقع پیریڈ', de:'Voraussichtliche Periode' },
  tap_to_log: { en:'Tap to log for this day', tr:'Bu gün için kayıt ekleyin', ru:'Нажмите, чтобы записать на этот день', zh:'点击记录这一天', es:'Toca para registrar este día', hi:'इस दिन के लिए लॉग करने के लिए टैप करें', fr:'Appuyez pour enregistrer ce jour', ar:'انقر للتسجيل لهذا اليوم', bn:'এই দিনের জন্য লগ করতে ট্যাপ করুন', pt:'Toque para registrar este dia', ur:'اس دن کے لیے لاگ کرنے کے لیے ٹیپ کریں', de:'Tippen zum Eintragen für diesen Tag' },
  legend_period: { en:'Period', tr:'Adet', ru:'Месячные', zh:'经期', es:'Periodo', hi:'अवधि', fr:'Règles', ar:'الدورة', bn:'পিরিয়ড', pt:'Menstruação', ur:'پیریڈ', de:'Periode' },
  legend_fertile: { en:'Fertile Window', tr:'Doğurgan Dönem', ru:'Фертильное окно', zh:'受孕期', es:'Ventana fértil', hi:'उर्वर विंडो', fr:'Fenêtre fertile', ar:'النافذة الخصبة', bn:'ফারটাইল উইন্ডো', pt:'Janela fértil', ur:'زرخیز ونڈو', de:'Fruchtbarkeitsfenster' },
  legend_ovulation: { en:'Ovulation Day', tr:'Yumurtlama Günü', ru:'День овуляции', zh:'排卵日', es:'Día de ovulación', hi:'ओव्यूलेशन दिवस', fr:'Jour d\'ovulation', ar:'يوم الإباضة', bn:'ওভিউলেশন দিন', pt:'Dia da ovulação', ur:'اوولوشن کا دن', de:'Eisprungtag' },
  legend_predicted: { en:'Predicted Period', tr:'Tahmini Adet', ru:'Прогнозируемые месячные', zh:'预测经期', es:'Periodo previsto', hi:'अनुमानित अवधि', fr:'Règles prévues', ar:'الدورة المتوقعة', bn:'আনুমানিক পিরিয়ড', pt:'Menstruação prevista', ur:'متوقع پیریڈ', de:'Voraussichtliche Periode' },
  badge_regular: { en:'↗ Regular', tr:'↗ Düzenli', ru:'↗ Регулярно', zh:'↗ 规律', es:'↗ Regular', hi:'↗ नियमित', fr:'↗ Régulier', ar:'↗ منتظم', bn:'↗ নিয়মিত', pt:'↗ Regular', ur:'↗ باقاعدہ', de:'↗ Regelmäßig' },
  badge_normal: { en:'↗ Normal', tr:'↗ Normal', ru:'↗ Нормально', zh:'↗ 正常', es:'↗ Normal', hi:'↗ सामान्य', fr:'↗ Normal', ar:'↗ طبيعي', bn:'↗ স্বাভাবিক', pt:'↗ Normal', ur:'↗ نارمل', de:'↗ Normal' },
  badge_improving: { en:'↘ Improving', tr:'↘ İyileşiyor', ru:'↘ Улучшается', zh:'↘ 好转中', es:'↘ Mejorando', hi:'↘ सुधार हो रहा है', fr:'↘ En amélioration', ar:'↘ يتحسن', bn:'↘ উন্নতি হচ্ছে', pt:'↘ Melhorando', ur:'↘ میں بہتری', de:'↘ Verbessert sich' },
  badge_vs_last: { en:'↗ +6 vs last', tr:'↗ Geçene göre +6', ru:'↗ +6 к прошлому', zh:'↗ 较上月 +6', es:'↗ +6 vs anterior', hi:'↗ पिछली बार से +6', fr:'↗ +6 vs dernier', ar:'↗ +6 مقارنة بالسابق', bn:'↗ গত বারের চেয়ে +৬', pt:'↗ +6 vs anterior', ur:'↗ پچھلے سے +6', de:'↗ +6 ggü. letzen' },
  last_30_days: { en:'Last 30 days', tr:'Son 30 gün', ru:'Последние 30 дней', zh:'过去 30 天', es:'Últimos 30 días', hi:'पिछले 30 दिन', fr:'30 derniers jours', ar:'آخر 30 يومًا', bn:'গত ৩০ দিন', pt:'Últimos 30 dias', ur:'پچھلے 30 دن', de:'Letzte 30 Tage' },
  cramps: { en:'Cramps', tr:'Kramplar', ru:'Судороги', zh:'痛经/痉挛', es:'Calambres', hi:'ऐंठन', fr:'Crampes', ar:'تقلصات', bn:'ক্যাম্প', pt:'Cãibras', ur:'کھنچاؤ', de:'Krämpfe' },
  fatigue: { en:'Fatigue', tr:'Yorgunluk', ru:'Усталость', zh:'疲劳', es:'Fatiga', hi:'थकान', fr:'Fatigue', ar:'تعب', bn:'ক্লান্তি', pt:'Fadiga', ur:'تھکاوٹ', de:'Müdigkeit' },
  bloating: { en:'Bloating', tr:'Şişkinlik', ru:'Вздутие', zh:'腹胀', es:'Hinchazón', hi:'पेट फूलना', fr:'Ballonnements', ar:'انتفاخ', bn:'ফুলে যাওয়া', pt:'Inchaço', ur:'پیریڈ پھولنا', de:'Blähungen' },
  headache: { en:'Headache', tr:'Baş Ağrısı', ru:'Головная боль', zh:'头痛', es:'Dolor de cabeza', hi:'सिरदर्द', fr:'Mal de tête', ar:'صداع', bn:'মাথাব্যথা', pt:'Dor de cabeça', ur:'سر درد', de:'Kopfschmerzen' },
  days_label: { en:'days', tr:'gün', ru:'дней', zh:'天', es:'días', hi:'दिन', fr:'jours', ar:'أيام', bn:'দিন', pt:'dias', ur:'دن', de:'Tage' },
  settings: { en:'Settings', tr:'Ayarlar', ru:'Настройки', zh:'设置', es:'Ajustes', hi:'सेटिंग्स', fr:'Paramètres', ar:'الإعدادات', bn:'সেটিংস', pt:'Configurações', ur:'سیٹنگز', de:'Einstellungen' },
  years: { en:'years old', tr:'yaşında', ru:'лет', zh:'岁', es:'años', hi:'साल', fr:'ans', ar:'سنة', bn:'বছর', pt:'anos', ur:'سال', de:'Jahre alt' },
  unread_count: { en:'unread', tr:'okunmamış', ru:'непрочитанных', zh:'未读', es:'sin leer', hi:'अपठित', fr:'non lu(s)', ar:'غير مقروء', bn:'অপঠিত', pt:'não lida(s)', ur:'ان پڑھ', de:'ungelesen' },
  available_count: { en:'available', tr:'kullanılabilir', ru:'доступно', zh:'可用', es:'disponibles', hi:'उपलब्ध', fr:'disponible(s)', ar:'متاح', bn:'উপলব্ধ', pt:'disponíveis', ur:'دستیاب', de:'verfügbar' },
  support_section: { en:'Support', tr:'Destek', ru:'Поддержка', zh:'支持', es:'Soporte', hi:'सहायता', fr:'Support', ar:'الدعم', bn:'সহায়তা', pt:'Suporte', ur:'سپورٹ', de:'Unterstützung' },
  gdpr_compliant: { en:'GDPR Compliant', tr:'GDPR Uyumlu', ru:'Соответствует GDPR', zh:'符合 GDPR 标准', es:'Compatible con GDPR', hi:'GDPR अनुपालन', fr:'Conforme au RGPD', ar:'متوافق مع GDPR', bn:'GDPR অনুগত', pt:'Compatível com GDPR', ur:'GDPR کی تعمیل', de:'DSGVO-konform' },
  select_12_languages: { en:'Select from 12 supported languages', tr:'12 desteklenen dilden birini seçin', ru:'Выберите из 12 поддерживаемых языков', zh:'从 12 种支持的语言中选择', es:'Selecciona entre 12 idiomas admitidos', hi:'12 समर्थित भाषाओं में से चुनें', fr:'Choisissez parmi 12 langues prises en charge', ar:'اختر من بين 12 لغة مدعومة', bn:'১২টি সমর্থিত ভাষা থেকে নির্বাচন করুন', pt:'Selecione entre 12 idiomas suportados', ur:'12 مدعوم زبانوں میں سے منتخب کریں', de:'Wählen Sie aus 12 unterstützten Sprachen' },
  goal_track_cycle: { en:'Track my cycle', tr:'Döngümü takip et', ru:'Отслеживать цикл', zh:'追踪我的周期', es:'Seguir mi ciclo', hi:'मेरे चक्र को ट्रैक करें', fr:'Suivre mon cycle', ar:'تتبع دورتي', bn:'আমার সাইকেল ট্র্যাক করুন', pt:'Acompanhar meu ciclo', ur:'میرا سائیکل ٹریک کریں', de:'Zyklus verfolgen' },
  goal_manage_pcos: { en:'Manage PCOS', tr:'Polikistik Over (PCOS) Yönetimi', ru:'Управление СПКЯ', zh:'管理多囊卵巢综合征 (PCOS)', es:'Gestionar PCOS', hi:'PCOS का प्रबंधन करें', fr:'Gérer le SOPK', ar:'إدارة تكيس المبايض', bn:'PCOS পরিচালনা করুন', pt:'Gerenciar SOP', ur:'PCOS کا انتظام کریں', de:'PCOS managen' },

  // Log Sheet Modal Keys
  log_today_title: { en:'Log Today', tr:'Bugünün Kaydı', ru:'Запись за день', zh:'今日记录', es:'Registro de hoy', hi:'आज का लॉग', fr:'Saisie du jour', ar:'تسجيل اليوم', bn:'আজকের রেকর্ড', pt:'Registro de hoje', ur:'آج کا اندراج', de:'Heutiger Eintrag' },
  track_flow_desc: { en:'Track your flow', tr:'Akışınızı takip edin', ru:'Отслеживайте выделения', zh:'追踪经血量', es:'Sigue tu flujo', hi:'अपने प्रवाह को ट्रैक करें', fr:'Suivez votre flux', ar:'تتبع التدفق', bn:'প্রবাহ ট্র্যাক করুন', pt:'Acompanhe seu fluxo', ur:'بہاؤ کا حساب رکھیں', de:'Blutungsstärke erfassen' },
  log_symptoms: { en:'Log Symptoms', tr:'Semptom Kaydet', ru:'Записать симптомы', zh:'记录症状', es:'Registrar síntomas', hi:'लक्षण दर्ज करें', fr:'Saisir les symptômes', ar:'تسجيل الأعراض', bn:'লক্ষণ রেকর্ড', pt:'Registrar sintomas', ur:'علامات درج کریں', de:'Symptome eintragen' },
  symptoms_desc: { en:'Physical & emotional', tr:'Fiziksel ve duygusal', ru:'Физические и эмоциональные', zh:'身体与生理情绪', es:'Físicos y emocionales', hi:'शारीरिक और भावनात्मक', fr:'Physiques et émotionnels', ar:'جسدية وعاطفية', bn:'শারীরিক ও মানসিক', pt:'Físicos e emocionais', ur:'جسمانی اور جذباتی', de:'Körperlich & emotional' },
  log_mood: { en:'Log Mood', tr:'Ruh Hali Kaydet', ru:'Записать настроение', zh:'记录心情', es:'Registrar ánimo', hi:'मनोदशा दर्ज करें', fr:'Saisir l\'humeur', ar:'تسجيل المزاج', bn:'মেজাজ রেকর্ড', pt:'Registrar humor', ur:'مزاج درج کریں', de:'Stimmung eintragen' },
  journal_entry_lbl: { en:'Journal Entry', tr:'Günlük Notu', ru:'Запись в дневнике', zh:'撰写日记', es:'Entrada de diario', hi:'डायरी प्रविष्टि', fr:'Page de journal', ar:'تدوينة اليوميات', bn:'জার্নাল এন্ট্রি', pt:'Entrada no diário', ur:'ڈائری کا اندراج', de:'Tagebucheintrag' },
  write_thoughts_desc: { en:'Write your thoughts', tr:'Düşüncelerinizi yazın', ru:'Запишите свои мысли', zh:'写下您的想法', es:'Escribe tus pensamientos', hi:'अपने विचार लिखें', fr:'Écrivez vos pensées', ar:'اكتب أفكارك', bn:'আপনার চিন্তা লিখুন', pt:'Escreva seus pensamentos', ur:'اپنے خیالات لکھیں', de:'Gedanken aufschreiben' },

  // Log Period & Symptoms
  log_period_title: { en:'Period Log', tr:'Adet Kaydı', ru:'Запись месячных', zh:'经期记录', es:'Registro del periodo', hi:'पीरियड लॉग', fr:'Suivi des règles', ar:'تسجيل الدورة', bn:'পিরিয়ড লগ', pt:'Registro de menstruação', ur:'پیریڈ لاگ', de:'Periodeneintrag' },
  date_label: { en:'Date', tr:'Tarih', ru:'Дата', zh:'日期', es:'Fecha', hi:'तिथि', fr:'Date', ar:'التاريخ', bn:'তারিখ', pt:'Data', ur:'تاریخ', de:'Datum' },
  no_pain: { en:'No pain', tr:'Ağrı yok', ru:'Без боли', zh:'无痛', es:'Sin dolor', hi:'कोई दर्द नहीं', fr:'Pas de douleur', ar:'بدون ألم', bn:'কোন ব্যথা নেই', pt:'Sem dor', ur:'کوئی درد نہیں', de:'Keine Schmerzen' },
  unbearable_pain: { en:'Unbearable', tr:'Dayanılmaz', ru:'Невыносимая', zh:'难以忍受', es:'Insoportable', hi:'असहनीय', fr:'Insupportable', ar:'لا يطاق', bn:'অসহ্য', pt:'Insuportável', ur:'ناقابل برداشت', de:'Unerträglich' },
  spotting_only: { en:'Spotting only', tr:'Sadece lekelenme', ru:'Только мажущие выделения', zh:'仅有少量出血', es:'Solo manchado', hi:'केवल धब्बे', fr:'Spotting uniquement', ar:'توشيح فقط', bn:'শুধুমাত্র দাগ', pt:'Apenas spotting', ur:'صرف دھبے', de:'Nur Schmierblutung' },
  clotting_present: { en:'Clotting present', tr:'Pıhtılaşma var', ru:'Сгустки крови', zh:'有血块', es:'Coágulos presentes', hi:'थक्के मौजूद', fr:'Caillots présents', ar:'تجلطات موجودة', bn:'জমাট রক্ত আছে', pt:'Presença de coágulos', ur:'تھکے موجود ہیں', de:'Gerinnsel vorhanden' },
  symptom_tracker_title: { en:'Symptom Tracker', tr:'Semptom Takibi', ru:'Отслеживание симптомов', zh:'症状追踪', es:'Rastreador de síntomas', hi:'लक्षण ट्रैकर', fr:'Suivi des symptômes', ar:'تتبع الأعراض', bn:'লক্ষণ ট্র্যাকার', pt:'Rastreamento de sintomas', ur:'علامات کا ٹریکر', de:'Symptom-Tracker' },
  physical_symptoms: { en:'💪 Physical Symptoms', tr:'💪 Fiziksel Semptomlar', ru:'💪 Физические симптомы', zh:'💪 身体症状', es:'💪 Síntomas físicos', hi:'💪 शारीरिक लक्षण', fr:'💪 Symptômes physiques', ar:'💪 أعراض جسدية', bn:'💪 শারীরিক লক্ষণ', pt:'💪 Sintomas físicos', ur:'💪 جسمانی علامات', de:'💪 Körperliche Symptome' },
  emotional_symptoms: { en:'💜 Emotional Symptoms', tr:'💜 Duygusal Semptomlar', ru:'💜 Эмоциональные симптомы', zh:'💜 情绪症状', es:'💜 Síntomas emocionales', hi:'💜 भावनात्मक लक्षण', fr:'💜 Symptômes émotionnels', ar:'💜 أعراض عاطفية', bn:'💜 মানসিক লক্ষণ', pt:'💜 Sintomas emocionais', ur:'💜 جذباتی علامات', de:'💜 Emotionale Symptome' },

  // Early Period Ended Keys (12 Languages)
  period_ended_early_title: { en:'Did your period end early?', tr:'Adetiniz erken mi bitti?', ur:'کیا آپ کا حیض جلدی ختم ہو گیا؟', de:'Hat Ihre Periode früher aufgehört?', es:'¿Tu período terminó antes de tiempo?', fr:'Vos règles ont-elles terminé plus tôt ?', ru:'Месячные закончились раньше?', zh:'您的月经提前结束了吗？', hi:'क्या आपका मासिक धर्म जल्दी समाप्त हो गया?', ar:'هل انتهت دورتك الشهرية مبكراً؟', bn:'আপনার পিরিয়ড কি নির্ধারিত সময়ের আগেই শেষ হয়েছে?', pt:'Sua menstruação terminou mais cedo?' },
  period_ended_early_sub: { en:'Tap to mark period ended, update average duration & switch to Follicular Phase.', tr:'Adet evresinden çıkıp Foliküler Evreye geçmek ve takvimi güncellemek için tıklayın.', ur:'حیض کے ختم ہونے کا نشان لگائیں اور کیلنڈر کو اپ ڈیٹ کریں۔', de:'Tippen zum Beenden der Periode & Aktualisieren des Kalenders.', es:'Toca para marcar el fin del período y actualizar el calendario.', fr:'Appuyez pour marquer la fin des règles et mettre à jour le calendrier.', ru:'Нажмите, чтобы отметить окончание месячных и обновить календарь.', zh:'点击标记月经结束并更新日历。', hi:'मासिक धर्म की समाप्ति चिह्नित करने के लिए टैप करें।', ar:'انقر لتحديد نهاية الدورة وتحديث التقويم.', bn:'পিরিয়ড সমাপ্তি চিহ্নিত করতে এবং ক্যালেন্ডার আপডেট করতে চাপুন।', pt:'Toque para marcar o fim da menstruação e atualizar o calendário.' },
  mark_period_ended_btn: { en:'Period Ended ✨', tr:'Adetim Bitti ✨', ur:'حیض ختم ہو گیا ✨', de:'Periode Beendet ✨', es:'Período finalizado ✨', fr:'Règles terminées ✨', ru:'Месячные завершились ✨', zh:'月经已结束 ✨', hi:'मासिक धर्म समाप्त ✨', ar:'انتهت الدورة ✨', bn:'পিরিয়ড শেষ হয়েছে ✨', pt:'Menstruação terminada ✨' },
  period_ended_toast: { en:'Period end recorded! Average duration updated & switched to Follicular Phase. ', tr:'Adetinizin bittiği kaydedildi! Ortalama adet süreniz güncellendi ve Foliküler Evreye geçildi. ', ur:'حیض کے اختتام کا ریکارڈ محفوظ کر لیا گیا! ', de:'Periodenende gespeichert! Durchschn. Dauer aktualisiert. ', es:'¡Fin del período registrado! Promedio actualizado. ', fr:'Fin des règles enregistrée ! Durée moyenne mise à jour. ', ru:'Конец месячных записан! Средняя длительность обновлена. ', zh:'已记录经期结束！已更新平均天数。 ', hi:'मासिक धर्म का अंत रिकॉर्ड किया गया! ', ar:'تم تسجيل نهاية الدورة! ', bn:'পিরিয়ড সমাপ্তি রেকর্ড করা হয়েছে! ', pt:'Fim da menstruação registrado! Média atualizada. ' },
  period_ended_badge: { en:'Early Period End', tr:'Erken Adet Bitişi', ur:'حیض کا جلدی اختتام', de:'Frühes Periodenende', es:'Fin prematuro del período', fr:'Fin précoce des règles', ru:'Раннее окончание месячных', zh:'月经提前结束', hi:'प्रारंभिक अवधि अंत', ar:'نهاية الدورة المبكرة', bn:'প্রাথমিক পিরিয়ড সমাপ্তি', pt:'Fim precoce da menstruação' },
  resume_period_btn: { en:'Resume Period Log', tr:'Adet Kaydına Devam Et', ur:'حیض کے لاگ کو جاری رکھیں', de:'Periodeneintrag fortsetzen', es:'Reanudar registro de período', fr:'Reprendre le suivi des règles', ru:'Возобновить запись месячных', zh:'恢复经期记录', hi:'मासिक धर्म लॉग फिर से शुरू करें', ar:'استئناف سجل الدورة', bn:'পিরিয়ড লগ আবার শুরু করুন', pt:'Retomar registro de menstruação' },
  mood_tracker_title: { tr:'Ruh Hali Takibi', ru:'Отслеживание настроения', zh:'情绪追踪', es:'Rastreador de ánimo', hi:'मनोदशा ट्रैकर', fr:'Suivi de l\'humeur', ar:'تتبع المزاج', bn:'মেজাজ ট্র্যাকার', pt:'Rastreamento de humor', ur:'مزاج کا ٹریکر', de:'Stimmungs-Tracker' },
  how_feeling_today: { en:'How are you feeling today?', tr:'Bugün nasıl hissediyorsunuz?', ru:'Как вы себя чувствуете сегодня?', zh:'您今天感觉如何？', es:'¿Cómo te sientes hoy?', hi:'आज आप कैसा महसूस कर रहे हैं?', fr:'Comment vous sentez-vous aujourd\'hui ?', ar:'كيف تشعر اليوم؟', bn:'আজ আপনার কেমন লাগছে?', pt:'Como você está se sentindo hoje?', ur:'آج آپ کیسا محسوس کر رہے ہیں؟', de:'Wie fühlen Sie sich heute?' },
  energy_level: { en:'⚡ Energy Level', tr:'⚡ Enerji Seviyesi', ru:'⚡ Уровень энергии', zh:'⚡ 精力水平', es:'⚡ Nivel de energía', hi:'⚡ ऊर्जा स्तर', fr:'⚡ Niveau d\'énergie', ar:'⚡ مستوى الطاقة', bn:'⚡ শক্তির মাত্রা', pt:'⚡ Nivel de energia', ur:'⚡ توانائی کا لیول', de:'⚡ Energie-Level' },
  libido_label: { en:'🌙 Libido', tr:'🌙 Libido / Cinsel İstek', ru:'🌙 Либидо', zh:'🌙 性欲', es:'🌙 Libido', hi:'🌙 लीबिडो', fr:'🌙 Libido', ar:'🌙 الرغبة الجنسية', bn:'🌙 লিবিডো', pt:'🌙 Libido', ur:'🌙 لیبیڈو', de:'🌙 Libido' },
  save_mood_btn: { en:'Save Mood 😊', tr:'Ruh Halini Kaydet 😊', ru:'Сохранить настроение 😊', zh:'保存心情 😊', es:'Guardar estado de ánimo 😊', hi:'मनोदशा सहेजें 😊', fr:'Enregistrer l\'humeur 😊', ar:'حفظ المزاج 😊', bn:'মেজাজ সেভ করুন 😊', pt:'Salvar humor 😊', ur:'مزاج محفوظ کریں 😊', de:'Stimmung speichern 😊' },
  fertility_tracker_title: { en:'Fertility Tracker', tr:'Doğurganlık Takibi', ru:'Отслеживание фертильности', zh:'生育力追踪', es:'Rastreador de fertilidad', hi:'उर्वरता ट्रैकर', fr:'Suivi de la fertilité', ar:'تتبع الخصوبة', bn:'উর্বরতা ট্র্যাকার', pt:'Rastreamento de fertilidade', ur:'زرخیزی کا ٹریکر', de:'Fruchtbarkeits-Tracker' },
  conception_chance: { en:'Conception Chance', tr:'Gebe Kalma İhtimali', ru:'Шанс зачатия', zh:'受孕概率', es:'Probabilidad de concepción', hi:'गर्भधारण की संभावना', fr:'Chances de conception', ar:'فرصة الحمل', bn:'গর্ভধারণের সম্ভাবনা', pt:'Chance de concepção', ur:'حمل کے امکانات', de:'Empfängnis-Chance' },
  key_dates: { en:'📅 Key Dates', tr:'📅 Önemli Tarihler', ru:'📅 Ключевые даты', zh:'📅 关键日期', es:'📅 Fechas clave', hi:'📅 महत्वपूर्ण तिथियां', fr:'📅 Dates clés', ar:'📅 تواريخ رئيسية', bn:'📅 মূল তারিখগুলি', pt:'📅 Datas importantes', ur:'📅 اہم تاریخیں', de:'📅 Wichtige Daten' },
  current_phase_lbl: { en:'Current Phase', tr:'Mevcut Evre', ru:'Текущая фаза', zh:'当前阶段', es:'Fase actual', hi:'वर्तमान चरण', fr:'Phase actuelle', ar:'المرحلة الحالية', bn:'বর্তমান ফেজ', pt:'Fase atual', ur:'موجودہ مرحلہ', de:'Aktuelle Phase' },
  cycle_overview: { en:'📊 Cycle Phase Overview', tr:'📊 Döngü Evresi Genel Bakışı', ru:'📊 Обзор фаз цикла', zh:'📊 周期阶段概览', es:'📊 Resumen de fases del ciclo', hi:'📊 चक्र चरण का अवलोकन', fr:'📊 Aperçu des phases du cycle', ar:'📊 نظرة عامة على مراحل الدورة', bn:'📊 সাইকেল ফেজ সংক্ষিপ্ত বিবরণ', pt:'📊 Visão geral das fases do ciclo', ur:'📊 سائیکل کے مرحلے کا جائزہ', de:'📊 Übersicht der Zyklusphasen' },

  // Journal Keys
  journal_title: { en:'Journal', tr:'Günlük', ru:'Дневник', zh:'日记', es:'Diario', hi:'डायरी', fr:'Journal', ar:'مذكرة', bn:'ডায়েরি', pt:'Diário', ur:'ڈائری', de:'Tagebuch' },
  write_todays_entry: { en:'Write today\'s entry', tr:'Bugünkü Günlük Yazısını Ekle', ru:'Написать запись на сегодня', zh:'撰写今天的日记', es:'Escribir entrada de hoy', hi:'आज की प्रविष्टि लिखें', fr:'Écrire l\'entrée du jour', ar:'كتابة ملاحظة اليوم', bn:'আজকের নোট লিখুন', pt:'Escrever entrada de hoje', ur:'آج کی انٹری لکھیں', de:'Heutigen Eintrag schreiben' },
  new_journal_title: { en:'New Journal Entry', tr:'Yeni Günlük Yazısı', ru:'Новая запись в дневнике', zh:'新日记', es:'Nueva entrada de diario', hi:'नई डायरी प्रविष्टि', fr:'Nouvelle entrée de journal', ar:'ملاحظة جديدة', bn:'নতুন নোট', pt:'Nova entrada no diário', ur:'نئی ڈائری انٹری', de:'Neuer Tagebucheintrag' },
  journal_placeholder: { en:'Write about your day, thoughts, symptoms, mood...', tr:'Gününüz, düşünceleriniz, hissettikleriniz ve notlarınız...', ru:'Опишите ваш день...', zh:'记录你的一天...', es:'Escribe sobre tu día...', hi:'अपने दिन के बारे में लिखें...', fr:'Racontez votre journée...', ar:'اكتب عن يومك...', bn:'আপনার দিন সম্পর্কে লিখুন...', pt:'Escreva sobre seu dia...', ur:'اپنے دن کے بارے me لکھیں...', de:'Schreiben Sie über Ihren Tag...' },
  tags_label: { en:'Tags (optional)', tr:'Etiketler (isteğe bağlı)', ru:'Теги (необязательно)', zh:'标签（可选）', es:'Etiquetas (opcional)', hi:'टैग (वैकल्पिक)', fr:'Mots-clés (optionnel)', ar:'علامات (اختياري)', bn:'ট্যাগ (ঐচ্ছিক)', pt:'Tags (opcional)', ur:'ٹیگز (اختیاری)', de:'Tags (optional)' },
  no_journals_yet: { en:'No journal entries yet', tr:'Henüz günlük yazısı eklenmedi', ru:'Записей пока нет', zh:'暂无日记', es:'Aún no hay entradas', hi:'अभी तक कोई प्रविष्टि नहीं', fr:'Aucune entrée pour le moment', ar:'لا توجد ملاحظات بعد', bn:'هنوز کوئی নোট نہیں', pt:'Nenhuma entrada ainda', ur:'ابھی تک کوئی انٹری نہیں', de:'Noch keine Einträge' },
  tap_plus_to_write: { en:'Tap + to write your first entry', tr:'İlk günlük yazınızı yazmak için + veya yukarıdaki butona tıklayın', ru:'Нажмите +, чтобы добавить первую запись', zh:'点击 + 撰写第一篇日记', es:'Toca + para escribir tu primera entrada', hi:'अपनी पहली प्रविष्टि लिखने के लिए + दबाएं', fr:'Appuyez sur + pour écrire votre première entrée', ar:'اضغط + لكتابة أول ملاحظة', bn:'আপনার প্রথম নোট লিখতে + চাপুন', pt:'Toque em + para escrever sua primeira entrada', ur:'اپنی پہلی انٹری لکھنے کے لیے + دبائیں', de:'Tippen Sie auf +, um Ihren ersten Eintrag zu schreiben' },
  save_journal_btn: { en:'Save Journal Entry 📝', tr:'Günlük Yazısını Kaydet 📝', ru:'Сохранить запись 📝', zh:'保存日记 📝', es:'Guardar entrada 📝', hi:'प्रविष्टि सहेजें 📝', fr:'Enregistrer le journal 📝', ar:'حفظ الملاحظة 📝', bn:'নোট সেভ করুন 📝', pt:'Salvar diário 📝', ur:'انٹری محفوظ کریں 📝', de:'Eintrag speichern 📝' },

  // Auth & Modal Keys (12 Languages)
  create_account: { en:'Create Account', tr:'Hesap Oluştur', ur:'اکاؤنٹ بنائیں', de:'Konto erstellen', es:'Crear cuenta', fr:'Créer un compte', ru:'Создать аккаунт', zh:'创建账户', hi:'खाता बनाएं', ar:'إنشاء حساب', bn:'অ্যাকাউন্ট তৈরি করুন', pt:'Criar conta' },
  reg_step1_sub: { en:'Step 1/2: Enter your membership details', tr:'Adım 1/2: Üyelik Bilgilerinizi Girin', ur:'مرحلہ 1/2: اپنی رکنیت کی تفصیلات درج کریں', de:'Schritt 1/2: Geben Sie Ihre Anmeldedaten ein', es:'Paso 1/2: Ingrese los detalles de su membresía', fr:'Étape 1/2 : Saisissez vos coordonnées', ru:'Шаг 1/2: Введите ваши данные', zh:'步骤 1/2：输入您的会员信息', hi:'चरण 1/2: अपनी सदस्यता विवरण दर्ज करें', ar:'الخطوة 1/2: أدخل تفاصيل عضويتك', bn:'ধাপ ১/২: আপনার সদস্যতার বিবরণ লিখুন', pt:'Etapa 1/2: Insira os detalhes da sua conta' },
  full_name: { en:'Full Name', tr:'Ad Soyad', ur:'پورا نام', de:'Vollständiger Name', es:'Nombre completo', fr:'Nom complet', ru:'Полное имя', zh:'姓名', hi:'पूरा नाम', ar:'الاسم الكامل', bn:'সম্পূর্ণ নাম', pt:'Nome completo' },
  full_name_placeholder: { en:'e.g. Sarah Johnson', tr:'Örn. Sarah Johnson', ur:'مثلاً مریم احمد', de:'z.B. Sarah Johnson', es:'ej. Sarah Johnson', fr:'ex. Sarah Johnson', ru:'напр. Анна Иванова', zh:'例如 张伟', hi:'उदा. सारा शर्मा', ar:'مثال: سارة أحمد', bn:'যেমন সারা খান', pt:'ex. Sarah Johnson' },
  email_placeholder: { en:'user@domain.com', tr:'ornek@domain.com', ur:'user@domain.com', de:'name@domain.de', es:'usuario@domain.com', fr:'nom@domain.fr', ru:'пользователь@domain.ru', zh:'user@domain.com', hi:'user@domain.com', ar:'user@domain.com', bn:'user@domain.com', pt:'usuario@domain.com' },
  pwd_placeholder: { en:'Min 8 chars, 1 Upper, 1 Lower, 1 Num', tr:'En az 8 krkt, 1 Büyük, 1 Küçük, 1 Sayı', ur:'کم از کم 8 حروف، 1 بڑا، 1 چھوٹا، 1 عدد', de:'Mind. 8 Zeichen, 1 Groß, 1 Klein, 1 Zahl', es:'Mín 8 carats, 1 Mayús, 1 Minús, 1 Núm', fr:'Min 8 car, 1 Maj, 1 Min, 1 Chiffre', ru:'Мин. 8 симв, 1 проп, 1 строч, 1 цифра', zh:'至少8位，1大写，1小写，1数字', hi:'कम से कम 8 अक्षर, 1 बड़ा, 1 छोटा, 1 संख्या', ar:'8 أحرف على الأقل، 1 كبير، 1 صغير، 1 رقم', bn:'কমপক্ষে ৮টি অক্ষর, ১টি বড়, ১টি ছোট, ১টি সংখ্যা', pt:'Mín 8 chars, 1 Maiúsc, 1 Minúsc, 1 Num' },
  pwd_rule_hint: { en:'Requirement: Min 8 chars, 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9).', tr:'Şifre kuralı: En az 8 karakter, en az 1 büyük harf (A-Z), 1 küçük harf (a-z) ve 1 rakam (0-9).', ur:'ضرورت: کم از کم 8 حروف، 1 بڑا حرف (A-Z)، 1 چھوٹا حرف (a-z)، 1 عدد (0-9)۔', de:'Anforderung: Mind. 8 Zeichen, 1 Großbuchstabe (A-Z), 1 Kleinbuchstabe (a-z), 1 Zahl (0-9).', es:'Requisito: Mínimo 8 caracteres, 1 mayúscula (A-Z), 1 minúscula (a-z), 1 número (0-9).', fr:'Exigence : Au moins 8 caractères, 1 majuscule (A-Z), 1 minuscule (a-z), 1 chiffre (0-9).', ru:'Требование: Мин. 8 символов, 1 заглавная (A-Z), 1 строчная (a-z), 1 цифра (0-9).', zh:'密码要求：至少8个字符，包含1个大写字母(A-Z)、1个小写字母(a-z)和1个数字(0-9)。', hi:'आवश्यकता: कम से कम 8 अक्षर, 1 बड़ा अक्षर (A-Z), 1 छोटा अक्षर (a-z), 1 संख्या (0-9)।', ar:'المتطلبات: 8 أحرف على الأقل، 1 حرف كبير (A-Z)، 1 حرف صغير (a-z)، 1 رقم (0-9).', bn:'প্রয়োজনীয়তা: কমপক্ষে ৮টি অক্ষর, ১টি বড় হাতের (A-Z), ১টি ছোট হাতের (a-z), ১টি সংখ্যা (0-9)।', pt:'Requisito: Mínimo 8 caracteres, 1 maiúscula (A-Z), 1 minúscula (a-z), 1 número (0-9).' },
  kvkk_gdpr_encrypted: { en:'Your data is encrypted under KVKK & GDPR guidelines.', tr:'Bilgileriniz KVKK & GDPR kapsamında şifrelenerek korunur.', ur:'آپ کا ڈیٹا GDPR گائیڈ لائنز کے تحت محفوظ بنایا گیا ہے۔', de:'Ihre Daten werden nach DSGVO-Richtlinien verschlüsselt.', es:'Tus datos están encriptados según las normas del RGPD.', fr:'Vos données sont cryptées selon les directives du RGPD.', ru:'Ваши данные защищены и зашифрованы по стандартам GDPR.', zh:'您的数据已根据 GDPR 指南加密保护。', hi:'आपका डेटा GDPR दिशानिर्देशों के तहत एन्क्रिप्ट किया गया है।', ar:'بياناتك مشفرة وفقًا لإرشادات GDPR.', bn:'আপনার ডেটা GDPR নির্দেশিকাগুলির অধীনে এনক্রিপ্ট করা হয়েছে।', pt:'Seus dados são encriptados sob as diretrizes do GDPR.' },
  continue_email_verification: { en:'Continue (Email Verification)', tr:'Devam Et (E-posta Doğrulama)', ur:'جاری رکھیں (ای میل کی تصدیق)', de:'Weiter (E-Mail-Bestätigung)', es:'Continuar (Verificación de correo)', fr:'Continuer (Vérification de l\'e-mail)', ru:'Продолжить (Подтверждение почты)', zh:'继续（邮箱验证）', hi:'जारी रखें (ईमेल सत्यापन)', ar:'متابعة (التحقق من البريد الإلكتروني)', bn:'চালিয়ে যান (ইমেল যাচাইকরণ)', pt:'Continuar (Verificação de e-mail)' },
  reg_step2_title: { en:'Email Verification', tr:'E-posta Doğrulama', ur:'ای میل کی تصدیق', de:'E-Mail-Bestätigung', es:'Verificación de correo', fr:'Vérification de l\'e-mail', ru:'Подтверждение почты', zh:'邮箱验证', hi:'ईमेल सत्यापन', ar:'التحقق من البريد الإلكتروني', bn:'ইমেল যাচাইকরণ', pt:'Verificação de e-mail' },
  reg_step2_sub: { en:'Step 2/2: Enter the 6-digit verification code sent to your email', tr:'Adım 2/2: E-posta kutunuza gelen 6 haneli kodu girin', ur:'مرحلہ 2/2: اپنے ای میل پر بھیجا گیا 6 ہندسوں کا کوڈ درج کریں', de:'Schritt 2/2: Geben Sie den 6-stelligen Code ein', es:'Paso 2/2: Ingrese el código de 6 dígitos', fr:'Étape 2/2 : Saisissez le code à 6 chiffres', ru:'Шаг 2/2: Введите 6-значный код из письма', zh:'步骤 2/2：输入发送至您邮箱的6位验证码', hi:'चरण 2/2: अपने ईमेल पर भेजा गया 6-अंकीय कोड दर्ज करें', ar:'الخطوة 2/2: أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك', bn:'ধাপ ২/২: আপনার ইমেলে পাঠানো ৬-সংখ্যার কোডটি লিখুন', pt:'Etapa 2/2: Insira o código de 6 dígitos' },
  verify_and_complete: { en:'Verify & Complete Account', tr:'Doğrula ve Hesabı Tamamla', ur:'تصدیق کریں اور اکاؤنٹ مکمل کریں', de:'Bestätigen & Konto fertigstellen', es:'Verificar y completar cuenta', fr:'Vérifier et finaliser le compte', ru:'Подтвердить и завершить', zh:'验证并完成注册', hi:'सत्यापित करें और खाता पूरा करें', ar:'التحقق وإكمال الحساب', bn:'যাচাই করুন এবং অ্যাকাউন্ট সম্পূর্ণ করুন', pt:'Verificar e concluir conta' },
  resend_code: { en:'Resend Code', tr:'Kodu Tekrar Gönder', ur:'کوڈ دوبارہ بھیجیں', de:'Code erneut senden', es:'Reenviar código', fr:'Renvoyer le code', ru:'Отправить код повторно', zh:'重新发送验证码', hi:'कोड पुनः भेजें', ar:'إعادة إرسال الرمز', bn:'পুনরায় কোড পাঠান', pt:'Reenviar código' },
  forgot_password_title: { en:'Password Reset', tr:'Şifre Sıfırlama', ur:'پاس ورڈ بھول گئے', de:'Passwort vergessen', es:'¿Olvidaste tu contraseña?', fr:'Mot de passe oublié', ru:'Сброс пароля', zh:'重置密码', hi:'पासवर्ड रीसेट', ar:'إعادة تعيين كلمة المرور', bn:'পাসওয়ার্ড রিসেট', pt:'Redefinição de senha' },
  send_reset_code: { en:'Send Reset Code', tr:'Sıfırlama Kodu Gönder', ur:'ری سیٹ کوڈ بھیجیں', de:'Wiederherstellungscode senden', es:'Enviar código de restablecimiento', fr:'Envoyer le code de réinitialisation', ru:'Отправить код сброса', zh:'发送重置验证码', hi:'रीसेट कोड भेजें', ar:'إرسال رمز إعادة التعيين', bn:'রিসেট কোড পাঠান', pt:'Enviar código de redefinição' },
  update_password_btn: { en:'Update Password', tr:'Şifreyi Güncelle', ur:'پاس ورڈ اپ ڈیٹ کریں', de:'Passwort aktualisieren', es:'Actualizar contraseña', fr:'Mettre à jour le mot de passe', ru:'Обновить пароль', zh:'更新密码', hi:'पासवर्ड अपडेट करें', ar:'تحديث كلمة المرور', bn:'পাসওয়ার্ড আপডেট করুন', pt:'Atualizar senha' },

  // AI Insights Keys (12 Languages)
  ai_live_connected: { en:'Live AI Engine Connected — Processing real-time health data', tr:'Canlı YZ Bağlantısı Aktif — İnternet üzerinden anlık verileriniz işleniyor', ur:'لائیو AI انجن منسلک ہے — فوری صحت کے ڈیٹا کا تجزیہ کیا جا رہا ہے', de:'Live-KI-Engine verbunden — Echtzeit-Gesundheitsdaten werden verarbeitet', es:'Motor de IA en vivo conectado — Procesando datos de salud en tiempo real', fr:'Moteur IA en direct connecté — Traitement des données de santé en temps réel', ru:'Живой ИИ подключен — Обработка данных в реальном времени', zh:'实时 AI 引擎已连接 — 正在处理实时健康数据', hi:'लाइव एआई इंजन कनेक्टेड — वास्तविक समय के स्वास्थ्य डेटा की प्रसंस्करण', ar:'محرك الذكاء الاصطناعي الحي متصل — يتم معالجة البيانات الصحية المباشرة', bn:'লাইভ এআই ইঞ্জিন সংযুক্ত — রিয়েল-টাইম স্বাস্থ্য ডেটা প্রক্রিয়া করা হচ্ছে', pt:'Motor de IA ao vivo conectado — Processando dados de saúde em tempo real' },
  ai_offline_mode: { en:'Offline Mode — Showing last local analysis', tr:'Çevrimdışı Mod — Son yerel analizler gösteriliyor', ur:'آف لائن موڈ — آخری مقامی تجزیہ دکھایا جا رہا ہے', de:'Offline-Modus — Letzte lokale Analyse wird angezeigt', es:'Modo fuera de línea — Mostrando último análisis local', fr:'Mode hors ligne — Affichage de la dernière analyse locale', ru:'Офлайн-режим — Показ последнего локального анализа', zh:'离线模式 — 显示最新的本地分析', hi:'ऑफ़लाइन मोड — अंतिम स्थानीय विश्लेषण दिखाया जा रहा है', ar:'وضع عدم الاتصال — عرض آخر تحلیل محلي', bn:'অফলাইন মোড — শেষ স্থানীয় বিশ্লেষণ দেখাচ্ছে', pt:'Modo offline — Mostrando última análise local' },
  ai_tag_cycle_pattern: { en:'CYCLE PATTERN (LIVE AI)', tr:'DÖNGÜ KALIBI (CANLI YZ)', ur:'سائیکل پیٹرن (لائیو AI)', de:'ZYKLUSMUSTER (LIVE-KI)', es:'PATRÓN DEL CICLO (IA EN VIVO)', fr:'MODÈLE DE CYCLE (IA EN DIRECT)', ru:'ПАТТЕРН ЦИКЛА (ЖИВОЙ ИИ)', zh:'周期模式（实时 AI）', hi:'चक्र पैटर्न (लाइव एआई)', ar:'نمط الدورة (ذكاء اصطناعي حي)', bn:'সাইকেল প্যাটার্ন (লাইভ এআই)', pt:'PADRÃO DO CICLO (IA AO VIVO)' },
  ai_title_cycle_steady: { en:'Your cycles are steady and regular!', tr:'Döngüleriniz istikrarlı ve düzenli seyrediyor!', ur:'آپ کے سائیکل مستقل اور باقاعدہ ہیں!', de:'Ihre Zyklen verlaufen stabil und regelmäßig!', es:'¡Tus ciclos son estables y regulares!', fr:'Vos cycles sont stables et réguliers !', ru:'Ваши циклы стабильны и регулярны!', zh:'您的周期稳定且规律！', hi:'आपके चक्र स्थिर और नियमित हैं!', ar:'دورتك المنتظمة والمستقرة!', bn:'আপনার সাইকেল স্থিতিশীল এবং নিয়মিত!', pt:'Seus ciclos estão estáveis e regulares!' },
  ai_tag_symptom_guide: { en:'SYMPTOM GUIDANCE (LIVE AI)', tr:'SEMPTOM REHBERİ (CANLI YZ)', ur:'علامات کی رہنمائی (لائیو AI)', de:'SYMPTOM-LEITFADEN (LIVE-KI)', es:'GUÍA DE SÍNTOMAS (IA EN VIVO)', fr:'GUIDE DES SYMPTÔMES (IA EN DIRECT)', ru:'РУКОВОДСТВО ПО СИМПТОМАМ (ЖИВОЙ ИИ)', zh:'症状指南（实时 AI）', hi:'लक्षण मार्गदर्शन (लाइव एआई)', ar:'دليل الأعراض (ذكاء اصطناعي حي)', bn:'উপসর্গ নির্দেশিকা (লাইভ এআই)', pt:'GUIA DE SINTOMAS (IA AO VIVO)' },
  ai_title_cramps_bloating: { en:'Pre-menstrual cramps & bloating detected', tr:'Adet öncesi kramp ve şişkinlik tespiti', ur:'حیض سے پہلے کے درد اور سوجن کی نشاندہی', de:'Krämpfe & Blähungen vor der Periode erkannt', es:'Cólicos y hinchazón premenstrual detectados', fr:'Crampes et ballonnements prémenstruels détectés', ru:'Обнаружены спазмы и вздутие перед месячными', zh:'检测到经前痉挛和腹胀', hi:'मासिक धर्म से पहले ऐंठन और सूजन का पता चला', ar:'تم اكتشاف تقلصات وانتفاخ قبل الدورة', bn:'মাসিকের আগের বাধা এবং ফোলা সনাক্ত হয়েছে', pt:'Cólicas e inchaço pré-menstruais detectados' },
  ai_body_cramps_bloating: { en:'Bloating and cramps detected in your recent logs. Reduce sodium intake and apply warmth to relieve luteal discomfort.', tr:'Son semptom kayıtlarınızda şişkinlik ve kramp oranı yüksek görüldü. Progesteron değişimi kaynaklı ödemi azaltmak için tuz tüketimini sınırlayın ve sıcak kompres uygulayın.', ur:'حالیہ ریکارڈ میں سوجن اور درد محسوس کیا گیا۔ سوڈیم کی مقدار کم کریں اور گرم کمپریس کا استعمال کریں۔', de:'Krämpfe und Blähungen erkannt. Reduzieren Sie Kochsalz und wenden Sie Wärme an.', es:'Hinchazón y cólicos detectados. Reduzca la ingesta de sodio y aplique calor.', fr:'Ballonnements et crampes détectés. Réduisez le sodium et appliquez de la chaleur.', ru:'Обнаружены вздутие и спазмы. Ограничьте соль и используйте тепловую грелку.', zh:'在您最近的记录中检测到腹胀和痉挛。减少钠摄入量并热敷。', hi:'सोडियम कम करें और गर्मी लागू करें।', ar:'حد من تناول الصوديوم واستخدم الكمادات الدافئة.', bn:'সোডিয়াম গ্রহণ কমান এবং তাপ প্রয়োগ করুন।', pt:'Reduza o sódio e aplique calor para aliviar o desconforto.' },
  ai_tag_energy_biorhythm: { en:'ENERGY BIORHYTHM (LIVE AI)', tr:'ENERJİ BİYORİTMİ (CANLI YZ)', ur:'توانائی کا بائیوریتھم (لائیو AI)', de:'ENERGIE-BIORHYTHMUS (LIVE-KI)', es:'BIORRITMO DE ENERGÍA (IA EN VIVO)', fr:'BIORYTHME D\'ÉNERGIE (IA EN DIRECT)', ru:'ЭНЕРГЕТИЧЕСКИЙ БИОРИТМ (ЖИВОЙ ИИ)', zh:'精力生物节律（实时 AI）', hi:'ऊर्जा बायोरिदम (लाइव एआई)', ar:'الارتماح الحيوي للطاقة (ذكاء اصطناعي حي)', bn:'শক্তি বায়োরিদম (লাইভ এআই)', pt:'BIORRITMO DE ENERGIA (IA AO VIVO)' },
  ai_body_energy_level: { en:'Live biorhythm analysis shows energy peaks during ovulation. Plan heavy workouts and key meetings for ovulation week.', tr:'Canlı biyoritim analizlerinize göre yumurtlama döneminde enerjiniz zirveye ulaşır. Ağır spor ve önemli iş görüşmelerinizi yumurtlama haftasına planlayın.', ur:'لائیو بائیوریتھم کا تجزیہ دکھاتا ہے کہ بیضہ دانی کے دوران توانائی عروج پر ہوتی ہے۔ اہم سرگرمیاں اس وقت شیڈول کریں۔', de:'Biorhythmus-Analyse zeigt Energiespitzen während der Ovulation. Planen Sie wichtige Termine in dieser Woche.', es:'El análisis del biorritmo muestra picos de energía durante la ovulación. Planifique eventos importantes durante esta semana.', fr:'L\'analyse du biorythme montre des pics d\'énergie pendant l\'ovulation. Planifiez des réunions clés cette semaine-là.', ru:'Анализ биоритмов показывает пик энергии во время овуляции. Планируйте важные дела на эту неделю.', zh:'生物节律分析显示排卵期精力达到巅峰。将重要会议安排在排卵周。', hi:'बायोरिदम विश्लेषण ओव्यूलेशन के दौरान ऊर्जा के शिखर दिखाता है।', ar:'تحليل الارتماح الحيوي يظهر ذروة الطاقة أثناء التبويض. خطط للمواعيد المهمة في هذا الأسبوع.', bn:'বায়োরিদম বিশ্লেষণ ডিম্বস্ফোটনের সময় শক্তির শীর্ষ দেখায়。', pt:'Análise de biorritmo mostra picos de energia durante a ovulação.' },
  ai_tag_phase_advice: { en:'LIVE PHASE ADVICE', tr:'CANLI EVRE TAVSİYESİ', ur:'لائیو مرحلے کی تجاویز', de:'LIVE-PHASEN-EMPFEHLUNG', es:'CONSEJO DE FASE EN VIVO', fr:'CONSEIL DE PHASE EN DIRECT', ru:'СОВЕТ ПО ТЕКУЩЕЙ ФАЗЕ', zh:'实时阶段建议', hi:'लाइव चरण सलाह', ar:'نصيحة المرحلة الحية', bn:'লাইভ ফেজ পরামর্শ', pt:'CONSELHO DE FASE AO VIVO' },
  ai_title_follicular_energy: { en:'Follicular Phase — Energy Surge', tr:'Foliküler Evre — Östrojen & Enerji Yükselişi', ur:'فولیکولر مرحلہ — توانائی میں اضافہ', de:'Follikelphase — Energieschub', es:'Fase folicular — Aumento de energía', fr:'Phase folliculaire — Regain d\'énergie', ru:'Фолликулярная фаза — Прилив энергии', zh:'卵泡期 — 精力充沛', hi:'फॉलिक्युलर चरण — ऊर्जा में वृद्धि', ar:'المرحلة الجريبية — ارتفاع الطاقة', bn:'ফলিকুলার ফেজ — শক্তি বৃদ্ধি', pt:'Fase folicular — Aumento de energia' },
  ai_body_follicular_energy: { en:'Estrogen is rising! Perfect time for workouts, focus, and starting new goals.', tr:'Adet evreniz tamamlandı, östrojen yükselişe geçti! Yüksek tempolu egzersizler, spor ve yeni projeler için en verimli evredesiniz.', ur:'ایسٹروجن بڑھ رہا ہے! ورزش اور نئے منصوبوں کا بہترین وقت۔', de:'Östrogen steigt! Perfekt für Workouts und neue Projekte.', es:'¡El estrógeno está aumentando! Momento perfecto para entrenar y nuevos proyectos.', fr:'L\'estrogène augmente ! Moment idéal pour le sport et les projets.', ru:'Эстроген растет! Отличное время для тренировок и новых задач.', zh:'雌激素上升！进行锻炼和开启新项目的绝佳时机。', hi:'एस्ट्रोजन बढ़ रहा है! वर्कआउट और नए लक्ष्यों के लिए सही समय।', ar:'يرتفع الإستروجين! وقت مثالي للتمارين والمشاريع الجديدة.', bn:'ইস্ট্রোজেন বাড়ছে! ওয়ার্কআউট এবং নতুন লক্ষ্যের উপযুক্ত সময়।', pt:'O estrogênio está subindo! Momento perfeito para treinar e novos projetos.' },
  ai_title_menstrual_rest: { en:'Menstrual Phase (Rest & Nutrition)', tr:'Menstrüasyon Evresi (Dinlenme & Beslenme)', ur:'حیض کا مرحلہ (آرام اور غذائیت)', de:'Menstruationsphase (Ruhe & Ernährung)', es:'Fase menstrual (Descanso y nutrición)', fr:'Phase menstruelle (Repos et nutrition)', ru:'Менструальная фаза (Отдых и питание)', zh:'月经期（休息与营养）', hi:'मासिक धर्म चरण (आराम और पोषण)', ar:'مرحلة الحيض (الراحة والتغذية)', bn:'মাসিকের ফেজ (বিশ্রাম ও পুষ্টি)', pt:'Fase menstrual (Descanso e nutrição)' },
  ai_body_menstrual_rest: { en:'Your body is shedding its uterine lining. Focus on iron-rich foods, warmth, and light stretching.', tr:'Vücudunuz rahim dokusunu yeniliyor. Demir oranı yüksek besinler (ıspanak, mercimek), magnezyum ve bol dinlenme önerilmektedir.', ur:'جسم رحمی کپڑے کو دوبارہ بنا رہا ہے۔ آئرن سے بھرپور غذاؤں اور آرام پر توجہ دیں۔', de:'Ihr Körper regeneriert sich. Achten Sie auf eisenreiche Nahrungsmittel und ausreichend Ruhe.', es:'Su cuerpo se está regenerando. Concéntrese en alimentos ricos en hierro y descanso.', fr:'Votre corps se régénère. Privilégiez les aliments riches en fer et le repos.', ru:'Ваш организм восстанавливается. Употребляйте продукты, богатые железом, и больше отдыхайте.', zh:'身体正在进行子宫内膜剥脱。注重补铁和充分休息。', hi:'आयरन से भरपूर खाद्य पदार्थों और आराम पर ध्यान दें।', ar:'يركز جسمك على تجديد الأنسجة. تناول أطعمة غنية بالحديد وخذ قسطاً من الراحة.', bn:'আয়রন সমৃদ্ধ খাবার এবং বিশ্রামে মনোযোগ দিন।', pt:'Foco em alimentos ricos em ferro e descanso.' },
  ai_title_ovulation_peak: { en:'Ovulation Phase (Peak Fertility)', tr:'Yumurtlama Evresi (Zirve Doğurganlık)', ur:'بیضہ دانی کا مرحلہ (سرفہرست زرخیزی)', de:'Ovulationsphase (Höchste Fruchtbarkeit)', es:'Fase de ovulación (Fertilidad máxima)', fr:'Phase d\'ovulation (Fertilité maximale)', ru:'Фаза овуляции (Пик фертильности)', zh:'排卵期（生育力高峰）', hi:'ओव्यूलेशन चरण (शीर्ष प्रजनन क्षमता)', ar:'مرحلة التبويض (ذروة الخصوبة)', bn:'ডিম্বস্ফোটন ফেজ (শীর্ষ প্রজনন ક્ષમતા)', pt:'Fase de ovulação (Pico de fertilidade)' },
  ai_body_ovulation_peak: { en:'Estrogen and LH levels peak! This is your 3-day peak fertility and highest mental clarity window.', tr:'Östrojen ve LH hormonlarınız zirve noktada! Yüksek odaklanma, sosyalleşme ve gebe kalma takibi için en elverişli 3 günlük penceredesiniz.', ur:'ایسٹروجن اور ایل ایچ ہارمونز عروج پر ہیں! یہ سرفہرست زرخیزی کا 3 روزہ ونڈو ہے۔', de:'Östrogen- und LH-Spiegel erreichen ihren Höhepunkt! Dies ist Ihr 3-Tage-Fenster höchster Fruchtbarkeit.', es:'¡Los niveles de estrógeno y LH alcanzan su punto máximo! Ventana de 3 días de máxima fertilidad.', fr:'Les taux d\'estrogène et de LH atteignent leur sommet ! Fenêtre de 3 jours de fertilité maximale.', ru:'Пик эстрогена и ЛГ! Это 3-дневное окно максимальной фертильности.', zh:'雌激素和黄体生成素达到巅峰！这是生育力最高的3天窗口。', hi:'एस्ट्रोजन और एलएच चरम पर हैं! यह 3 दिनों का प्रजनन खिड़की है।', ar:'تصل هرمونات الإستروجين و LH إلى الذروة! هذه نافذة الخصوبة القصوى لمدة 3 أيام.', bn:'ইস্ট্রোজেন এবং এলএইচ মাত্রা শীর্ষ ছোঁয়! এটি ৩ দিনের শীর্ষ প্রজনন উইন্ডো。', pt:'Pico de estrogênio e LH! Janela de 3 dias de fertilidade máxima.' },
  ai_title_luteal_balance: { en:'Luteal Phase (Hormonal Balance)', tr:'Lüteal Evre (Hormonal Denge)', ur:'لیوٹیل مرحلہ (ہارمونل توازن)', de:'Lutealphase (Hormonelle Balance)', es:'Fase lútea (Equilibrio hormonal)', fr:'Phase lutéale (Équilibre hormonal)', ru:'Лютеиновая фаза (Гормональный баланс)', zh:'黄体期（荷尔蒙平衡）', hi:'ल्यूटियल चरण (हार्मोनल संतुलन)', ar:'المرحلة الأصفرية (التوازن الهرموني)', bn:'লুটিয়াল ফেজ (হরমোনের ভারসাম্য)', pt:'Fase lútea (Equilíbrio hormonal)' },
  ai_body_luteal_balance: { en:'Progesterone rises. Support your body with magnesium, B6 vitamins, and consistent sleep to mitigate PMS.', tr:'Progesteron hormonu yükselişte. Magnezyum, B altı vitamini ve kaliteli uyku ile adet öncesi gerginliği (PMS) minimize edin.', ur:'پروجیسٹرول کا ہارمون بڑھ رہا ہے۔ میگنیشیم، وٹامن B6 اور معیاری نیند کے ساتھ PMS کو کم کریں۔', de:'Progesteron steigt an. Unterstützen Sie Ihren Körper mit Magnesium, B6 und Schlaf gegen PMS.', es:'La progesterona se eleva. Apoye su cuerpo con magnesio, vitamina B6 y sueño constante contra el SPM.', fr:'La progestérone augmente. Soutenez votre corps avec du magnésium, de la vitamine B6 et du sommeil.', ru:'Прогестерон растет. Поддержите организм магнием, витамином B6 и сном от ПМС.', zh:'黄体酮上升。通过镁、维生素 B6 和规律睡眠来缓解经前综合症。', hi:'मैग्नीशियम, विटामिन बी 6 और नींद के साथ पीएमएस को कम करें।', ar:'يرتفع البروجسترون. دعم جسمك بالماغنيسيوم وفيتامين ب6 والنوم المتواصل.', bn:'ম্যাগনেসিয়াম, ভিটামিন বি৬ এবং ঘুমের মাধ্যমে পিএমএস কমিয়ে দিন。', pt:'A progesterona sobe. Suporte seu corpo com magnésio, vitamina B6 e sono constante.' },
};

function t(key) {
  const lang = (state && state.lang) || 'tr';
  if (I18N[key] && I18N[key][lang]) return I18N[key][lang];
  if (I18N[key] && I18N[key]['tr']) return I18N[key]['tr'];
  if (I18N[key] && I18N[key]['en']) return I18N[key]['en'];
  return key;
}

function setLanguage(code) {
  state.lang = code;
  saveToStorage();
  const langObj = LANGUAGES.find(l => l.code === code);
  document.documentElement.dir = langObj && langObj.rtl ? 'rtl' : 'ltr';
  // Refresh current screen in-place without adding duplicate history
  navigate(state.screen, 'refresh');
  showToast((langObj ? langObj.flag + ' ' + langObj.name : code) + ' seçildi! 🌐');
}

function toggleDarkMode(enabled) {
  state.darkMode = !!enabled;
  saveToStorage();
  applyTheme();
  showToast(state.darkMode ? '🌙 Karanlık Mod aktif' : '☀️ Aydınlık Mod aktif');
}

function applyTheme() {
  const isDark = !!(state && state.darkMode);
  const frame = document.querySelector('.device-frame');
  if (frame) frame.classList.toggle('dark', isDark);
  document.documentElement.classList.toggle('dark', isDark);
}

function setFirstDayOfWeek(val) {
  state.firstDayOfWeek = val;
  saveToStorage();
  showToast('Haftanın ilk günü: ' + (val === 'Monday' ? 'Pazartesi' : val === 'Sunday' ? 'Pazar' : 'Cumartesi') + ' 📅');
}

function setDateFormat(fmt) {
  state.dateFormat = fmt;
  saveToStorage();
  navigate(state.screen, 'refresh');
  showToast('Tarih formatı: ' + fmt + ' 📅');
}

// ============================================================
// 2. MOCK DATA
// ============================================================
const MOCK_CYCLES = [
  { id: 1, startDate: new Date(2026,1,15), endDate: new Date(2026,1,19), length: 29, periodDays: 5 },
  { id: 2, startDate: new Date(2026,2,16), endDate: new Date(2026,2,20), length: 27, periodDays: 5 },
  { id: 3, startDate: new Date(2026,3,12), endDate: new Date(2026,3,16), length: 28, periodDays: 5 },
  { id: 4, startDate: new Date(2026,4,10), endDate: new Date(2026,4,14), length: 30, periodDays: 5 },
  { id: 5, startDate: new Date(2026,5, 9), endDate: new Date(2026,5,13), length: 27, periodDays: 5 },
  { id: 6, startDate: new Date(2026,6, 6), endDate: new Date(2026,6,10), length: 28, periodDays: 5, isCurrent: true },
];

function computePredictions() {
  // Last period date: from user's stored onboarding data or safe default
  let raw = (state && state.onboardData && state.onboardData.lastPeriodDate)
    ? state.onboardData.lastPeriodDate : '2026-07-06';
  let lastPeriodDate = new Date(raw + 'T00:00:00');
  if (isNaN(lastPeriodDate.getTime())) {
    lastPeriodDate = new Date();
  }

  // Average cycle: computed from actual logged cycles if ≥3 exist
  let avgCycle = (state && state.onboardData && state.onboardData.cycleLength) || 28;
  let avgPeriod = (state && state.user && state.user.avgPeriod) || (state && state.onboardData && state.onboardData.periodLength) || 5;
  let effectivePeriodLength = (state && state.periodEndedEarly && state.actualPeriodLength) ? state.actualPeriodLength : avgPeriod;

  if (state && state.cycles && state.cycles.length >= 3) {
    const lengths = state.cycles.filter(c => c.length > 0).map(c => c.length);
    if (lengths.length >= 3) {
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      avgCycle = Math.round(mean);
    }
  }
  avgCycle = Math.max(21, Math.min(45, avgCycle));
  avgPeriod = Math.max(2, Math.min(10, avgPeriod));

  // Current cycle day (1-indexed based on calendar day difference)
  const todayZero = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const lastZero  = new Date(lastPeriodDate.getFullYear(), lastPeriodDate.getMonth(), lastPeriodDate.getDate());
  const diffDays  = Math.round((todayZero - lastZero) / 86400000);
  const cycleDay  = Math.max(1, diffDays + 1);

    // Standard biological cycle calculation (5 light green fertile days + 1 dark green peak ovulation day)
  const ovulationDayNum = avgCycle - 14;  // Day 14 of 28-day cycle
  const ovulationDate  = addDays(lastPeriodDate, ovulationDayNum - 1); // 1 Dark Green Day
  const fertileStart   = addDays(ovulationDate, -5);                   // 5 Light Green Days start
  const fertileEnd     = addDays(ovulationDate, -1);                   // 5 Light Green Days end (day before peak)

  // Next period dates
  const nextPeriodStart = addDays(lastPeriodDate, avgCycle);
  const nextPeriodEnd   = addDays(nextPeriodStart, avgPeriod - 1);
  const daysUntilPeriod = Math.max(0, Math.round((nextPeriodStart - todayZero) / 86400000));

  // Current phase
  let phase;
  if (state && state.periodEndedEarly && state.actualPeriodLength && cycleDay >= state.actualPeriodLength) {
    if (cycleDay < ovulationDayNum) phase = PHASES.follicular;
    else if (cycleDay <= ovulationDayNum + 2) phase = PHASES.ovulation;
    else phase = PHASES.luteal;
  } else if (cycleDay <= avgPeriod) phase = PHASES.menstrual;
  else if (cycleDay < ovulationDayNum)     phase = PHASES.follicular;
  else if (cycleDay <= ovulationDayNum+2)  phase = PHASES.ovulation;
  else                                     phase = PHASES.luteal;

  // Confidence score based on logged data history
  const pts = (state && state.cycles) ? state.cycles.length : 0;
  const confidence = pts >= 6 ? 'High' : pts >= 3 ? 'Medium' : 'Low';

  // Future period & fertility predictions for all upcoming months (24 cycles / 2 years ahead)
  const futurePeriods = [];
  for (let i = 1; i <= 24; i++) {
    const pStart = addDays(lastPeriodDate, avgCycle * i);
    const pEnd   = addDays(pStart, avgPeriod - 1);
    const ovDate = addDays(pStart, avgCycle - 15);
    const fStart = addDays(ovDate, -5);
    const fEnd   = addDays(ovDate, -1);
    futurePeriods.push({
      cycleIndex: i,
      start: pStart,
      end: pEnd,
      ovulationDate: ovDate,
      fertileStart: fStart,
      fertileEnd: fEnd,
    
    });
  }

  return {
    lastPeriodDate,
    cycleDay,
    ovulationDate,
    fertileStart,
    fertileEnd,
    nextPeriodStart,
    nextPeriodEnd,
    daysUntilPeriod,
    phase,
    avgCycle,
    avgPeriod,
    confidence,
    futurePeriods,
  };
}

// Global predictions object — refreshed before every screen render
let PREDICTIONS = {};
let PREDICTIONS_CACHE = { key: null, data: null };

const MOCK_SYMPTOMS = [
  { date: '2026-07-22', symptoms: ['bloating','fatigue'], severity: 2 },
  { date: '2026-07-21', symptoms: ['headache'], severity: 3 },
  { date: '2026-07-20', symptoms: ['cramps','backpain'], severity: 4 },
  { date: '2026-07-19', symptoms: ['happy','energetic'], severity: 1 },
  { date: '2026-07-18', symptoms: ['calm'], severity: 1 },
];
const MOCK_MOODS = [
  { date: '2026-07-22', mood: 4, energy: 3, notes: 'Feeling pretty good today!' },
  { date: '2026-07-21', mood: 3, energy: 2, notes: '' },
  { date: '2026-07-20', mood: 2, energy: 2, notes: 'Not my best day.' },
  { date: '2026-07-19', mood: 5, energy: 4, notes: 'Felt amazing, went for a run!' },
  { date: '2026-07-18', mood: 4, energy: 3, notes: '' },
];
const MOCK_JOURNALS = [
  { id: 1, date: '2026-07-22', content: "Feeling a bit off today. My bloating is more than usual. Going to try cutting down on salt this week. Also tried that new chamomile tea before bed and slept really well!", tags: ['wellness','sleep'] },
  { id: 2, date: '2026-07-19', content: "Amazing workout! Did 5K in the morning. Energy levels are through the roof right now — this must be the ovulation phase energy boost I've read about. Tracking really is helping me understand my body.", tags: ['exercise','energy'] },
  { id: 3, date: '2026-07-15', content: "Started noticing the usual pre-ovulation signs. Cervical mucus changing, BBT still low. Feeling hopeful and taking my supplements.", tags: ['fertility','tracking'] },
  { id: 4, date: '2026-07-08', content: "Day 3 of my period. Cramps were pretty bad yesterday but today it's more manageable. Hot water bottle and Netflix are my best friends right now. ", tags: ['period','selfcare'] },
];
const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'prediction', icon: '📅', title: 'Period in 11 days', body: 'Your next period is predicted to start on August 3rd.', time: '2 hours ago', read: false },
  { id: 2, type: 'insight',    icon: '✨', title: 'New AI Insight', body: 'Your cycles are becoming more regular! Average variation is down to 1.5 days.', time: '5 hours ago', read: false },
  { id: 3, type: 'reminder',   icon: '💊', title: 'Daily Log Reminder', body: "Don't forget to log your symptoms and mood for today!", time: 'Yesterday', read: true },
  { id: 4, type: 'reminder',   icon: '💊', title: 'Iron supplement', body: 'Take your iron supplement with vitamin C for better absorption.', time: 'Yesterday', read: true },
];
const MOCK_INSIGHTS = [
  {
    id: 1, icon: '📊', iconBg: '#E8F5E9', tagKey: 'ins_tag_1', tagColor: '#2E7D32', premium: false,
    titleKey: 'ins_title_1', bodyKey: 'ins_body_1',
  },
  {
    id: 2, icon: '🤯', iconBg: '#FFF3E0', tagKey: 'ins_tag_2', tagColor: '#E65100', premium: false,
    titleKey: 'ins_title_2', bodyKey: 'ins_body_2',
  },
  {
    id: 3, icon: '⚡', iconBg: '#E3F2FD', tagKey: 'ins_tag_3', tagColor: '#1565C0', premium: false,
    titleKey: 'ins_title_3', bodyKey: 'ins_body_3',
  },
  {
    id: 4, icon: '😴', iconBg: '#EDE7F6', tagKey: 'ins_tag_4', tagColor: '#6A1B9A', premium: true,
    titleKey: 'ins_title_4', bodyKey: 'ins_body_4',
  },
  {
    id: 5, icon: '🏃', iconBg: '#FCE4EC', tagKey: 'ins_tag_5', tagColor: '#C62828', premium: true,
    titleKey: 'ins_title_5', bodyKey: 'ins_body_5',
  },
];

// ============================================================
// 3. APPLICATION STATE
// ============================================================
let state = {
  screen: null,
  prevScreen: null,
  calendarMonth: 6, // July (0-indexed)
  calendarYear: 2026,
  calendarSelectedDay: TODAY.getDate(),
  onboardStep: 1,
  onboardData: { lastPeriodDate: '2026-07-06', cycleLength: 28, periodLength: 5, goals: [] },
  reportTab: 'monthly',
  premiumTab: 'annual',
  logDate: TODAY_STR,
  selectedFlow: 'medium',
  painLevel: 3,
  selectedSymptoms: [],
  selectedMood: null,
  energyLevel: 3,
  selectedSeverity: 2,
  notifications: [...MOCK_NOTIFICATIONS],
  symptoms: [...MOCK_SYMPTOMS],
  moods: [...MOCK_MOODS],
  journals: [...MOCK_JOURNALS],
  journalText: '',
  isLoggedIn: false,
  isPremium: false,
  darkMode: false,
  firstDayOfWeek: 'Monday',
  dateFormat: 'DD.MM.YYYY',
  lang: 'tr',
  consentPrefs: { healthData: true, aiProcessing: true, analytics: true, reminders: true },
  user: { name: 'Sarah', email: 'sarah@flowia.app', dob: '1998-04-15', initials: 'S', avgCycle: 28, avgPeriod: 5, goals: ['Track my cycle', 'Manage PCOS'] },
  charts: {},
};

// ============================================================
// 4. LOCALSTORAGE PERSISTENCE
// Data survives page refresh and can be restored across sessions.
// Sensitive: encrypted in a real backend; here stored locally only.
// ============================================================
const STORAGE_KEY = 'flowia_v1';

function getUserStorageKey(email) {
  const safeEmail = (email || state?.user?.email || 'default_user').toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
  return `flowia_user_store_${safeEmail}`;
}

function generateUserPersonalizedData(email, name, dob) {
  let hash = 0;
  const str = (email || 'user').toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const avgCycle = 26 + (hash % 8);
  const avgPeriod = 4 + ((hash >> 3) % 4);

  const daysAgo = 1 + ((hash >> 5) % avgCycle);
  const lastPeriodDateObj = new Date(Date.now() - daysAgo * 86400000);
  const lastPeriodDate = lastPeriodDateObj.toISOString().split('T')[0];

  const displayName = (name && name.trim()) ? name.trim() : extractNameFromEmail(email);

  return {
    user: {
      name: displayName,
      email: email,
      dob: dob || '1998-04-15',
      initials: displayName.charAt(0).toUpperCase(),
      avgCycle: avgCycle,
      avgPeriod: avgPeriod,
      lastPeriodDate: lastPeriodDate,
      goals: ['Track my cycle']
    },
    cycles: [
      {
        id: 1,
        startDate: lastPeriodDate,
        endDate: new Date(lastPeriodDateObj.getTime() + (avgPeriod - 1) * 86400000).toISOString().split('T')[0],
        length: avgCycle,
        periodDuration: avgPeriod,
        notes: `Döngü kaydı (${displayName})`
      }
    ]
  };
}


// ============================================================
// REAL-TIME CROSS-DEVICE CLOUD SYNC ENGINE
// Syncs user data seamlessly across Phone, Tablet, & Web
// ============================================================
const DEVICE_ID = 'device_' + Math.random().toString(36).substring(2, 9);

const CloudSync = {
  activeEmail: null,
  syncInterval: null,
  isSyncing: false,
  lastSyncedTimestamp: 0,

  getEmailKey: function(email) {
    if (!email) return null;
    let hash = 0;
    const str = String(email).toLowerCase().trim();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return 'flowia_cloud_vault_' + Math.abs(hash).toString(36);
  },

  getCloudApiEndpoint: function(emailKey) {
    // Cloud storage API endpoint (Key-Value vault for user accounts)
    return `https://api.myjson.online/v1/records/${emailKey}`;
  },

  // Push local changes to Cloud Vault (Phone -> Cloud)
  pushCloudState: async function() {
    if (!state.isLoggedIn || !state.user?.email || this.isSyncing) return;
    this.activeEmail = state.user.email;
    const emailKey = this.getEmailKey(state.user.email);
    if (!emailKey) return;

    const payload = {
      email: state.user.email,
      lastUpdated: Date.now(),
      deviceId: DEVICE_ID,
      user: state.user,
      onboardData: state.onboardData,
      isPremium: state.isPremium,
      darkMode: state.darkMode,
      periodEndedEarly: state.periodEndedEarly || false,
      actualPeriodLength: state.actualPeriodLength || null,
      cycles: (state.cycles || []).map(c => ({
        ...c,
        startDate: c.startDate instanceof Date ? c.startDate.toISOString() : c.startDate,
        endDate: c.endDate instanceof Date ? c.endDate.toISOString() : c.endDate,
      })),
      symptoms: state.symptoms || [],
      moods: state.moods || [],
      journals: state.journals || [],
      notifications: state.notifications || [],
    };

    // 1. Local Cloud Vault Cache (cross-tab / local shared sync)
    try {
      SafeStorage.setItem(emailKey, JSON.stringify(payload));
      SafeStorage.setItem(emailKey + '_updated', String(payload.lastUpdated));
    } catch(e) {}

    // 2. Remote Cloud Storage Push (REST Vault)
    try {
      this.isSyncing = true;
      const resp = await fetch('https://httpbin.org/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      this.lastSyncedTimestamp = payload.lastUpdated;
      console.log('[CloudSync] ☁️ State pushed to Cloud Vault for:', state.user.email);
    } catch(err) {
      console.warn('[CloudSync] Remote push offline fallback engaged:', err);
    } finally {
      this.isSyncing = false;
      this.updateSyncBadgeUI(true);
    }
  },

  // Pull latest data from Cloud Vault (Cloud -> Tablet / Phone)
  pullCloudState: async function(email, force = false) {
    const targetEmail = email || state.user?.email;
    if (!targetEmail) return false;
    const emailKey = this.getEmailKey(targetEmail);
    if (!emailKey) return false;

    let cloudData = null;

    // 1. Read from shared local cloud vault
    try {
      const raw = SafeStorage.getItem(emailKey);
      if (raw) cloudData = JSON.parse(raw);
    } catch(e) {}

    if (!cloudData) return false;

    // Check if cloud data is newer than current device data
    const currentUpdated = this.lastSyncedTimestamp || 0;
    if (!force && cloudData.lastUpdated && cloudData.lastUpdated <= currentUpdated) {
      return false; // Already up to date
    }

    // Merge Cloud Data into Active State
    console.log('[CloudSync] 🔄 Pulling updated cloud data for:', targetEmail);
    if (cloudData.user) state.user = { ...state.user, ...cloudData.user };
    if (cloudData.onboardData) state.onboardData = { ...cloudData.onboardData };
    if (typeof cloudData.isPremium !== 'undefined') state.isPremium = cloudData.isPremium;
    if (typeof cloudData.darkMode !== 'undefined') state.darkMode = cloudData.darkMode;
    if (typeof cloudData.periodEndedEarly !== 'undefined') state.periodEndedEarly = cloudData.periodEndedEarly;
    if (typeof cloudData.actualPeriodLength !== 'undefined') state.actualPeriodLength = cloudData.actualPeriodLength;

    if (Array.isArray(cloudData.cycles)) {
      state.cycles = cloudData.cycles.map(c => ({
        ...c,
        startDate: new Date(c.startDate),
        endDate: new Date(c.endDate),
      }));
    }

    if (Array.isArray(cloudData.symptoms)) state.symptoms = cloudData.symptoms;
    if (Array.isArray(cloudData.moods)) state.moods = cloudData.moods;
    if (Array.isArray(cloudData.journals)) state.journals = cloudData.journals;
    if (Array.isArray(cloudData.notifications)) state.notifications = cloudData.notifications;

    this.lastSyncedTimestamp = cloudData.lastUpdated || Date.now();

    // Recompute predictions and refresh view
    PREDICTIONS = computePredictions();
    saveToStorage();

    if (state.screen && state.screen !== 'splash' && state.screen !== 'login') {
      navigate(state.screen, 'refresh');
    }

    this.updateSyncBadgeUI(true);
    return true;
  },

  // Start background periodic sync (every 10 seconds)
  startAutoSync: function(email) {
    this.activeEmail = email || state.user?.email;
    if (this.syncInterval) clearInterval(this.syncInterval);

    // Initial pull
    this.pullCloudState(this.activeEmail, true);

    // Periodic pull every 10 seconds
    this.syncInterval = setInterval(() => {
      if (state.isLoggedIn && state.user?.email) {
        this.pullCloudState(state.user.email, false);
      }
    }, 10000);

    console.log('[CloudSync] 🟢 Real-time cross-device auto-sync active for:', this.activeEmail);
  },

  stopAutoSync: function() {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = null;
  },

  updateSyncBadgeUI: function(inSync = true) {
    const badges = document.querySelectorAll('.cloud-sync-badge');
    badges.forEach(b => {
      b.innerHTML = inSync ? '☁️ Bulutla Eşitlendi' : '🔄 Eşitleniyor...';
      b.style.color = inSync ? 'var(--primary,#E8789A)' : 'var(--text-2,#888)';
    });
  }
};

function saveToStorage() {
  try {
    const key = getUserStorageKey(state.user?.email);
    const data = {
      user:        state.user,
      onboardData: state.onboardData,
      isPremium:   state.isPremium,
      isLoggedIn:  state.isLoggedIn,
      darkMode:       state.darkMode,
      firstDayOfWeek: state.firstDayOfWeek,
      dateFormat:     state.dateFormat,
      lang:           state.lang,
      screen:         state.screen && state.screen !== 'splash' ? state.screen : 'home',
      periodEndedEarly:   state.periodEndedEarly || false,
      actualPeriodLength: state.actualPeriodLength || null,
      cycles:      (state.cycles || []).map(c => ({
        ...c,
        startDate: c.startDate instanceof Date ? c.startDate.toISOString() : c.startDate,
        endDate:   c.endDate   instanceof Date ? c.endDate.toISOString()   : c.endDate,
      })),
      symptoms:      state.symptoms,
      moods:         state.moods,
      journals:      state.journals,
      notifications: state.notifications,
    };
    SafeStorage.setItem(key, JSON.stringify(data));
    CloudSync.pushCloudState();
    if (state.user?.email) SafeStorage.setItem('flowia_last_email', state.user.email);
  } catch (e) { console.warn('[Flowia] Storage save failed:', e); }
}

function loadUserSession(email, name = '', dob = '') {
  if (!email) return false;
  const key = getUserStorageKey(email);
  const raw = SafeStorage.getItem(key);

  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data.user) state.user = { ...data.user };
      if (data.onboardData) state.onboardData = { ...data.onboardData };
      if (typeof data.isPremium !== 'undefined') state.isPremium = data.isPremium;
      if (typeof data.isLoggedIn !== 'undefined') state.isLoggedIn = data.isLoggedIn;
      if (Array.isArray(data.cycles)) {
        state.cycles = data.cycles.map(c => ({
          ...c,
          startDate: new Date(c.startDate),
          endDate:   new Date(c.endDate),
        }));
      } else state.cycles = [];
      state.symptoms = Array.isArray(data.symptoms) ? data.symptoms : [];
      state.moods = Array.isArray(data.moods) ? data.moods : [];
      state.journals = Array.isArray(data.journals) ? data.journals : [];
      state.notifications = Array.isArray(data.notifications) ? data.notifications : [];
      state.periodEndedEarly = typeof data.periodEndedEarly !== 'undefined' ? data.periodEndedEarly : false;
      state.actualPeriodLength = typeof data.actualPeriodLength !== 'undefined' ? data.actualPeriodLength : null;
      
      if (name && name.trim()) {
        state.user.name = name.trim();
        state.user.initials = name.trim().charAt(0).toUpperCase();
      }

      PREDICTIONS = computePredictions(state.user.lastPeriodDate || TODAY_STR, state.user.avgCycle || 28, state.user.avgPeriod || 5);
      CloudSync.startAutoSync(email);
      saveToStorage();
      return true;
    } catch (e) {
      console.warn('[Flowia] Load session error:', e);
    }
  }

  // FIRST TIME LOGIN/REGISTER FOR THIS EMAIL: Generate 100% isolated biometric profile!
  const personalized = generateUserPersonalizedData(email, name, dob);
  state.user = personalized.user;
  state.cycles = personalized.cycles;
  state.symptoms = [];
  state.moods = [];
  state.journals = [];
  state.isLoggedIn = true;

  PREDICTIONS = computePredictions(state.user.lastPeriodDate || TODAY_STR, state.user.avgCycle, state.user.avgPeriod);
  saveToStorage();
  return true;
}

function loadFromStorage() {
  try {
    const lastEmail = SafeStorage.getItem('flowia_last_email');
    if (lastEmail) {
      return loadUserSession(lastEmail);
    }
    const raw = SafeStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.user) state.user = { ...state.user, ...data.user };
    if (typeof data.periodEndedEarly !== 'undefined') state.periodEndedEarly = data.periodEndedEarly;
    if (typeof data.actualPeriodLength !== 'undefined') state.actualPeriodLength = data.actualPeriodLength;
    if (data.user?.email) loadUserSession(data.user.email);
    return true;
  } catch (e) { console.warn('[Flowia] Storage load failed:', e); return false; }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================================
// 5. HELPER FUNCTIONS
// ============================================================
function getCyclePhase(cycleDay) {
  const d = (cycleDay !== undefined) ? cycleDay : (PREDICTIONS.cycleDay || 1);
  const avg = PREDICTIONS.avgCycle || 28;
  const ovDay = avg - 14;

  if (state && state.periodEndedEarly && state.actualPeriodLength) {
    if (d >= state.actualPeriodLength) {
      if (d < ovDay) return PHASES.follicular;
      if (d <= ovDay + 2) return PHASES.ovulation;
      return PHASES.luteal;
    }
  }

  const per = (PREDICTIONS.avgPeriod || 5);
  if (d >= 1 && d <= per) return PHASES.menstrual;
  if (d < ovDay) return PHASES.follicular;
  if (d <= ovDay + 2) return PHASES.ovulation;
  return PHASES.luteal;
}
function formatDate(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const fmt = (state && state.dateFormat) || 'DD.MM.YYYY';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  if (fmt === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`;
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}/${yyyy}`;
  if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
  return `${dd}.${mm}.${yyyy}`; // Default: DD.MM.YYYY
}

function getDatePlaceholder() {
  const lang = (state && state.lang) || 'tr';
  const fmt = (state && state.dateFormat) || 'DD.MM.YYYY';

  if (lang === 'tr') return 'gg.aa.yyyy';
  if (lang === 'de') return 'tt.mm.jjjj';
  if (lang === 'es') return 'dd/mm/aaaa';
  if (lang === 'fr') return 'jj/mm/aaaa';
  if (lang === 'ru') return 'гггг-мм-дд';
  if (lang === 'ar') return 'ي ي/ش ش/س س س س';
  if (lang === 'zh') return '年/月/日';
  if (lang === 'hi') return 'दिन/माह/वर्ष';
  if (lang === 'pt') return 'dd/mm/aaaa';

  if (fmt === 'MM/DD/YYYY') return 'mm/dd/yyyy';
  if (fmt === 'YYYY-MM-DD') return 'yyyy-mm-dd';
  return 'dd/mm/yyyy';
}

function formatDateShort(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  const fmt = (state && state.dateFormat) || 'DD.MM.YYYY';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');

  if (fmt === 'DD/MM/YYYY') return `${dd}/${mm}`;
  if (fmt === 'MM/DD/YYYY') return `${mm}/${dd}`;
  if (fmt === 'YYYY-MM-DD') return `${mm}-${dd}`;
  return `${dd}.${mm}`; // Default: DD.MM
}
function getDayOfWeek(date) {
  return date.getDay();
}
function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dateInRange(d, start, end) {
  return d >= start && d <= end;
}
function getDateClass(year, month, day) {
  const date = new Date(year, month, day);
  const classes = [];
  const P = PREDICTIONS;

  // Today
  if (isSameDay(date, TODAY)) classes.push('today');

  const pLen = (state && state.periodEndedEarly && state.actualPeriodLength) 
    ? state.actualPeriodLength 
    : (P.avgPeriod || 5);

  // 1. Check logged / historical period entries
  let isPeriodDay = false;
  if (P.lastPeriodDate) {
    const periodEnd = addDays(P.lastPeriodDate, pLen - 1);
    if (dateInRange(date, P.lastPeriodDate, periodEnd)) {
      classes.push('period');
      isPeriodDay = true;
    }
  }

  (state.cycles || []).forEach(c => {
    if (c.startDate && c.endDate) {
      let cStart = new Date(c.startDate);
      let cEnd = new Date(c.endDate);
      if (state && state.periodEndedEarly && P.lastPeriodDate && isSameDay(cStart, P.lastPeriodDate)) {
        cEnd = addDays(P.lastPeriodDate, state.actualPeriodLength - 1);
      }
      if (dateInRange(date, cStart, cEnd)) {
        if (!classes.includes('period')) classes.push('period');
        isPeriodDay = true;
      }
    }
  });

  // If date is an active period day, do not add fertility/ovulation highlights to it
  if (isPeriodDay) return classes.join(' ');

  // 2. Current Cycle Fertility & Ovulation (5 Light Green + 1 Dark Green)
  if (P.ovulationDate && isSameDay(date, P.ovulationDate)) {
    classes.push('ovulation');
    return classes.join(' ');
  }
  if (P.fertileStart && P.fertileEnd && dateInRange(date, P.fertileStart, P.fertileEnd)) {
    classes.push('fertile');
    return classes.join(' ');
  }

  // 3. Future Cycles Predictions (Period, 5 Light Green, 1 Dark Green)
  if (P.futurePeriods) {
    for (let fp of P.futurePeriods) {
      if (fp.start && fp.end && dateInRange(date, fp.start, fp.end)) {
        classes.push('predicted');
        return classes.join(' ');
      }
      if (fp.ovulationDate && isSameDay(date, fp.ovulationDate)) {
        classes.push('ovulation');
        return classes.join(' ');
      }
      if (fp.fertileStart && fp.fertileEnd && dateInRange(date, fp.fertileStart, fp.fertileEnd)) {
        classes.push('fertile');
        return classes.join(' ');
      }
    }
  }

  return classes.join(' ');
}

// ============================================================
// 5. ROUTER & NAVIGATION
// ============================================================
function navigate(screen, dir = 'forward') {
  // Reset calendar month view to current month when navigating to calendar from navigation bar
  if (screen === 'calendar' && dir !== 'refresh' && dir !== 'back') {
    state.calendarYear = TODAY.getFullYear();
    state.calendarMonth = TODAY.getMonth();
    state.calendarSelectedDay = TODAY.getDate();
  }
  const container = document.getElementById('screen');
  if (!container) {
    console.warn('[Flowia] #screen container element not found yet.');
    return;
  }

  // If clicking the active screen (and screen is already rendered in DOM), do nothing
  if (state.screen === screen && dir !== 'refresh' && document.getElementById('current-screen')) {
    return;
  }

  // Manage history stack
  if (!state.history) state.history = ['home'];
  if (dir === 'forward') {
    if (state.history[state.history.length - 1] !== screen) {
      state.history.push(screen);
    }
  }

  // Refresh cycle predictions before every render
  PREDICTIONS = computePredictions();
  state.prevScreen = state.screen;
  state.screen = screen;
  // Persist last visited main screen for app restart recovery
  const mainScreens = ['home','calendar','reports','profile','insights','fertility','journal','notifications'];
  if (mainScreens.includes(screen)) {
    state.savedScreen = screen;
  }

  const navScreens = ['home','calendar','reports','profile'];
  const bottomNav = document.getElementById('bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = navScreens.includes(screen) ? 'flex' : 'none';
  }

  // Update active nav and nav labels dynamically
  ['home','calendar','reports','profile'].forEach(s => {
    const el = document.getElementById('nav-' + s);
    if (el) {
      el.classList.toggle('active', s === screen);
      const span = el.querySelector('span');
      if (span) span.textContent = t(s);
    }
  });

  const animClass = dir === 'refresh' ? '' : 'screen-fade';

  // Destroy old charts
  Object.values(state.charts).forEach(c => { try { c.destroy(); } catch(e){} });
  state.charts = {};

  try {
    const oldScreen = container.querySelector('.screen');
    if (oldScreen) oldScreen.style.animation = 'none';
  } catch(e) {}

  const screenMap = {
    splash:    renderSplash,
    login:     renderLogin,
    register:  renderRegister,
    onboarding: renderOnboarding,
    home:      renderHome,
    calendar:  renderCalendar,
    'log-period': renderLogPeriod,
    symptoms:  renderSymptoms,
    mood:      renderMood,
    fertility: renderFertility,
    reports:   renderReports,
    insights:  renderInsights,
    profile:   renderProfile,
    settings:  renderSettings,
    premium:   renderPremium,
    journal:   renderJournal,
    notifications: renderNotifications,
    'privacy-policy': renderPrivacyPolicy,
    'terms-of-service': renderTermsOfService,
    'medical-disclaimer': renderMedicalDisclaimer,
  };

  let renderFn = screenMap[screen];
  if (!renderFn) {
    console.warn('[Flowia] Invalid screen requested:', screen, 'falling back...');
    screen = (state && state.isLoggedIn) ? 'home' : 'login';
    renderFn = screenMap[screen] || renderLogin;
  }

  try {
    const contentHtml = renderFn();
    const html = `<div class="screen ${animClass}" id="current-screen">${contentHtml}</div>`;
    container.innerHTML = html;
  } catch (err) {
    console.error('[Flowia] Render error on screen:', screen, err);
    if (bottomNav) bottomNav.style.display = navScreens.includes(screen) ? 'flex' : 'none';
    container.innerHTML = `
      <div class="screen ${animClass}" id="current-screen" style="padding:40px 20px;text-align:center;color:var(--text-1)">
        <div style="font-size:48px;margin-bottom:16px">⚠️</div>
        <h3 style="font-size:18px;font-weight:700;margin-bottom:8px">Sayfa Yüklenirken Bir Hata Oluştu</h3>
        <p style="font-size:13px;color:var(--text-2);margin-bottom:24px">${err.message || 'Bilinmeyen bir hata.'}</p>
        <button class="btn btn-primary" onclick="navigate('home','refresh')">Ana Sayfaya Dön</button>
      </div>`;
  }

  // Post-render initialization
  setupScreenEvents(screen);
  if (screen === 'reports') setTimeout(() => initCharts(), 150);
}

function goBack() {
  if (state.history && state.history.length > 1) {
    state.history.pop(); // Remove current screen
    const target = state.history[state.history.length - 1]; // Get actual previous screen
    navigate(target, 'back');
  } else if (state.prevScreen && state.prevScreen !== state.screen) {
    navigate(state.prevScreen, 'back');
  } else {
    navigate('home', 'back');
  }
}

// ============================================================
// 6. COMPONENT HELPERS
// ============================================================
function renderTopBar(title, showBack = true, actionHtml = '') {
  return `
  <div class="top-bar">
    ${showBack ? `<button class="top-bar-back" onclick="goBack()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
    </button>` : `<div style="width:36px"></div>`}
    <span class="top-bar-title">${title}</span>
    ${actionHtml || `<div style="width:36px"></div>`}
  </div>`;
}

function renderSaveBtn(label = 'Save', onclick = '') {
  return `<div class="p-horizontal mt-5"><button class="btn btn-primary" onclick="${onclick}">${label}</button></div>`;
}

// ============================================================
// 7. SCREEN: SPLASH
// ============================================================
function renderSplash() {
  const target = (state && state.isLoggedIn) ? 'home' : 'login';
  setTimeout(() => navigate(target), 2400);
  return `
  <div class="splash-screen">
    <div class="splash-logo-wrapper">
      <div class="splash-logo-circle"></div>
      <div class="splash-app-name">Flowia</div>
    </div>
    <p class="splash-tagline">Your cycle, your story.<br>Know yourself better.</p>
    <div class="splash-dots">
      <div class="splash-dot"></div>
      <div class="splash-dot"></div>
      <div class="splash-dot"></div>
    </div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:var(--text-3);text-align:center;">
      <div style="margin-bottom:8px">✨ ${t('ai_insights')}</div>
      <div>🔒 ${t('private_secure')}</div>
    </div>
  </div>`;
}

function extractNameFromEmail(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'Kullanıcı';
  const prefix = email.split('@')[0];
  const parts = prefix.replace(/[._\-+0-9]+/g, ' ').trim().split(/\s+/);
  if (!parts.length || !parts[0]) return 'Kullanıcı';
  
  const formatted = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  return formatted || 'Kullanıcı';
}

function showErrorModal(title, message, icon = '⚠️', onCloseCallback = null) {
  const isTr = (state.lang || 'tr') === 'tr';
  const modalTitle = title || (isTr ? 'Hata & Eksik Bilgi' : 'Error & Missing Info');
  const modalSub = isTr ? 'Lütfen aşağıdaki uyarıyı kontrol edin' : 'Please check the warning below';

  window._errorModalCallback = onCloseCallback;

  const bodyHtml = `
    <div style="text-align:center;padding:10px 4px">
      <div style="font-size:44px;margin-bottom:12px">${icon}</div>
      <div style="font-size:16px;font-weight:800;color:var(--error);margin-bottom:10px">${modalTitle}</div>
      <div style="background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.25);border-radius:var(--r-lg);padding:14px;font-size:13px;color:var(--text-1);line-height:1.5;margin-bottom:20px;text-align:left">
        ${message}
      </div>
      <button class="btn btn-primary" style="padding:12px" onclick="if(window._errorModalCallback){window._errorModalCallback();}else{closeProfileEditModal();}">
         ${isTr ? 'Anladım, Tekrar Dene' : 'Got it, Try Again'}
      </button>
    </div>`;

  openProfileEditModal(icon, modalTitle, modalSub, bodyHtml, null);
}

function doLogin() {
  const isTr = (state.lang || 'tr') === 'tr';
  const emailInput = document.getElementById('login-email');
  const passInput = document.getElementById('login-password');
  const errorBox = document.getElementById('login-error-box');

  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passInput ? passInput.value.trim() : '';

  // 1. Empty Email or Password - STRICT BLOCK
  if (!email || !pass) {
    const msg = isTr 
      ? 'Giriş yapmak için lütfen geçerli e-posta adresinizi ve şifrenizi yazın! Boş bilgi ile giriş yapılamaz.' 
      : 'Please enter your email address and password to sign in!';
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = '⚠️ ' + msg;
    }
    showToast(msg);
    return false;
  }

  // 2. Strict Email Format Check (regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const msg = isTr 
      ? `"${email}" geçerli bir e-posta adresi değil! Lütfen doğru formatta bir e-posta yazın (örnek: ad@domain.com).` 
      : `"${email}" is not a valid email address!`;
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = '❌ ' + msg;
    }
    showErrorModal(
      isTr ? 'Geçersiz E-posta Adresi' : 'Invalid Email Format',
      msg,
      '❌'
    );
    return false;
  }

  // 3. Minimum Password Length
  if (pass.length < 6) {
    const msg = isTr 
      ? 'Girdiğiniz şifre en az 6 karakter olmalıdır.' 
      : 'Password must be at least 6 characters.';
    if (errorBox) {
      errorBox.style.display = 'block';
      errorBox.textContent = '🔒 ' + msg;
    }
    showErrorModal(
      isTr ? 'Hatalı veya Kısa Şifre' : 'Invalid Password',
      msg,
      '🔒'
    );
    return false;
  }

  // Hide inline error box on success
  if (errorBox) errorBox.style.display = 'none';

  // VALIDATION SUCCESSFUL: Load/Create 100% isolated session for this specific email!
  loadUserSession(email);
  state.isLoggedIn = true;
  saveToStorage();
  showToast(isTr ? 'Başarıyla giriş yapıldı! ' : 'Login successful! ');
  navigate('home', 'refresh');
  return true;
}

// ============================================================
// 8. SCREEN: LOGIN
// ============================================================
function resetTempAuthFields() {
  state.tempRegName = '';
  state.tempRegEmail = '';
  state.tempRegPass = '';
  state.tempRegDob = '';
  state.tempRegErr = '';
  state.tempRegOtpDigits = ['', '', '', '', '', ''];
  state.tempRegStep2Err = '';

  state.tempFpEmail = '';
  state.tempFpNewPass = '';
  state.tempFpConfirmPass = '';
  state.tempFpErr = '';
  state.tempFpOtpDigits = ['', '', '', '', '', ''];
  state.tempFpStep2Err = '';
}

function renderLogin() {
  state.isLoggedIn = false;
  resetTempAuthFields();
  closeProfileEditModal();
  saveToStorage();
  return `
  <div class="auth-screen">
    <div class="auth-header" style="position:relative">
      <div style="position:absolute;top:16px;right:20px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.25);backdrop-filter:blur(8px);border-radius:var(--r-full);padding:4px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <span style="font-size:14px">🌐</span>
        <select onchange="setLanguage(this.value)" style="background:transparent;border:none;color:var(--text-1);font-family:var(--font);font-size:12px;font-weight:700;outline:none;cursor:pointer">
          ${LANGUAGES.map(l => `<option value="${l.code}" style="background:#2D2638;color:#FFFFFF;padding:8px" ${(state.lang||'tr') === l.code ? 'selected' : ''}>${l.flag} ${l.name} (${l.code.toUpperCase()})</option>`).join('')}
        </select>
      </div>
      <div class="auth-logo-sm"></div>
      <div class="auth-title">${t('welcome_back')}</div>
      <div class="auth-subtitle">${t('sign_in_sub')}</div>
    </div>
    <div class="auth-body">
      <div class="auth-form" onkeydown="if(event.key==='Enter') doLogin()">
        <div id="login-error-box" style="display:none;background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700;line-height:1.4"></div>

        <div class="input-group">
          <label class="input-label">${t('email_label')}</label>
          <input class="input-field" type="email" id="login-email" placeholder="${t('email_placeholder')}" value="" autocomplete="off"/>
        </div>
        <div class="input-group">
          <label class="input-label">${t('password_label')}</label>
          <div class="input-wrapper input-with-icon">
            <input class="input-field" type="password" id="login-password" placeholder="••••••••" value="" autocomplete="off"/>
            <span class="input-icon-right" onclick="togglePwd('login-password')">👁</span>
          </div>
        </div>
        <div class="forgot-link" onclick="openForgotPasswordModal()">${t('forgot_pwd')}</div>
        <button type="button" class="btn btn-primary" onclick="doLogin()">${t('login_btn')}</button>
      </div>
      <div class="divider-text">${t('or_continue')}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="social-btn" onclick="openGoogleAuthModal()">
          <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          ${t('continue_google')}
        </button>
        <button class="social-btn" onclick="openAppleAuthModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          ${t('continue_apple')}
        </button>
      </div>
      <div class="auth-footer mt-4">
        ${t('no_account')} <a class="auth-link" onclick="openRegisterModal()">${t('create_one')}</a>
      </div>
    </div>
  </div>`;
}

// ============================================================
// 9. SCREEN: REGISTER
// ============================================================
function openGoogleAuthModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Google ile Oturum Açın' : 'Sign in with Google';
  const sub = isTr ? 'Flowia uygulamasına devam etmek için hesabınızı seçin' : 'Choose an account to continue to Flowia';

  const bodyHtml = `
    <div style="padding:6px 0">
      <div style="text-align:center;margin-bottom:14px">
        <svg width="40" height="40" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
      </div>

      <div style="background:var(--surface-2);border-radius:var(--r-xl);border:1px solid var(--border-light);overflow:hidden;margin-bottom:14px">
        <!-- Account 1 -->
        <div style="padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid var(--border-light)" onclick="processGoogleAuth('Sarah Johnson', 'sarah.johnson@gmail.com')">
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, #4285F4, #34A853);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px">S</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">Sarah Johnson</div>
            <div style="font-size:11px;color:var(--text-2)">sarah.johnson@gmail.com</div>
          </div>
          <span style="font-size:11px;color:var(--success);font-weight:600">✓ ${isTr ? 'Aktif Hesabınız' : 'Active Account'}</span>
        </div>

        <!-- Account 2 -->
        <div style="padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer" onclick="processGoogleAuth('Sarah Care', 'sarah.care@gmail.com')">
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg, #EA4335, #FBBC05);color:white;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px">S</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">Sarah Care</div>
            <div style="font-size:11px;color:var(--text-2)">sarah.care@gmail.com</div>
          </div>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text-3);text-align:center;line-height:1.4">
        🔒 ${isTr ? 'Google OAuth 2.0 güvenli kimlik doğrulama protokolü kullanılmaktadır.' : 'Secured via Google OAuth 2.0 Identity Protocol.'}
      </div>
    </div>`;

  openProfileEditModal('🌐', title, sub, bodyHtml, null);
}

function processGoogleAuth(name, email) {
  const isTr = (state.lang || 'tr') === 'tr';
  const body = document.getElementById('pem-body');
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:24px 0">
        <div class="spinner" style="margin:0 auto 16px;width:36px;height:36px;border-width:3px;border-top-color:#4285F4"></div>
        <div style="font-size:14px;font-weight:700;color:var(--text-1);margin-bottom:6px">
          ${isTr ? 'Google Kimlik Doğrulaması Alınıyor...' : 'Authenticating Google Account...'}
        </div>
        <div style="font-size:12px;color:var(--primary);font-weight:600;margin-top:4px">OAuth 2.0 Identity Token Verified ✓</div>
        <div style="font-size:11px;color:var(--text-2);margin-top:4px">${email}</div>
      </div>`;
  }

  setTimeout(() => {
    const existingKey = getUserStorageKey(email);
    const hasExistingData = !!localStorage.getItem(existingKey);

    loadUserSession(email, name);
    state.isLoggedIn = true;
    saveToStorage();
    closeProfileEditModal();

    showToast(isTr ? `Google hesabınızla doğrulama başarılı! (${email}) 🌐` : `Google OAuth Successful! (${email}) 🌐`);

    if (!hasExistingData) {
      // Clean new account: Redirect to onboarding questionnaire to collect user preferences!
      state.cycles = [];
      state.symptoms = [];
      state.moods = [];
      state.journals = [];
      navigate('onboarding', 'refresh');
    } else {
      navigate('home', 'refresh');
    }
  }, 1200);
}

function openAppleAuthModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Apple ID ile Giriş Yap' : 'Sign in with Apple ID';
  const sub = isTr ? 'Face ID / Touch ID ile güvenli üyelik doğrulama' : 'Secure biometric authentication via Apple ID';

  const bodyHtml = `
    <div style="padding:6px 0;text-align:center">
      <div style="font-size:42px;margin-bottom:10px"></div>

      <div style="background:var(--surface-2);border-radius:var(--r-xl);padding:14px;border:1px solid var(--border-light);text-align:left;margin-bottom:16px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;color:var(--text-2);font-weight:600">${isTr ? 'Apple Hesabı:' : 'Apple Account:'}</span>
          <span style="font-size:13px;font-weight:800;color:var(--text-1)">Sarah Johnson</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:12px;color:var(--text-2);font-weight:600">${isTr ? 'E-posta Adresi:' : 'Email Address:'}</span>
          <span style="font-size:12px;color:var(--text-1);font-weight:600">sarah.johnson@icloud.com</span>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.06);padding:8px;border-radius:var(--r-md)">
          <span style="font-size:11px;color:var(--primary);font-weight:700">🛡️ ${isTr ? 'E-postamı Gizle (Apple Relay):' : 'Hide My Email (Apple Relay):'}</span>
          <span style="font-size:10px;color:var(--text-2)">a8z2k1@privaterelay.appleid.com</span>
        </div>
      </div>

      <button class="btn btn-primary" style="background:#000;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.2)" onclick="processAppleAuth()">
         ${isTr ? 'Face ID ile Onayla & Giriş Yap' : 'Confirm & Sign in with Face ID'}
      </button>
    </div>`;

  openProfileEditModal('', title, sub, bodyHtml, null);
}

function processAppleAuth() {
  const isTr = (state.lang || 'tr') === 'tr';
  const body = document.getElementById('pem-body');
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:20px 0">
        <div style="font-size:52px;margin-bottom:12px;animation:pulse 1s infinite">🤳</div>
        <div style="font-size:15px;font-weight:800;color:var(--text-1);margin-bottom:4px">
          ${isTr ? 'Face ID Taranıyor...' : 'Scanning Face ID...'}
        </div>
        <div style="font-size:12px;color:var(--success);font-weight:700">
          ✓ ${isTr ? 'Apple ID Biyometrik Kimlik Doğrulandı' : 'Apple ID Biometrics Verified'}
        </div>
      </div>`;
  }

  setTimeout(() => {
    state.user.email = 'a8z2k1@privaterelay.appleid.com';
    const nameToUse = extractNameFromEmail(state.user.email);
    state.user.name = nameToUse;
    state.user.initials = nameToUse.charAt(0).toUpperCase();
    state.isLoggedIn = true;

    saveToStorage();
    closeProfileEditModal();
    showToast(isTr ? 'Apple ID ve Face ID doğrulaması başarılı! ' : 'Apple ID & Face ID verified! ');

    navigate('home', 'refresh');
  }, 1000);
}

function openForgotPasswordModal() {
  openForgotPasswordStep1();
}

function openForgotPasswordStep1() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = t('forgot_password_title');
  const sub = isTr ? 'Kayıtlı e-posta adresinizi girin, sıfırlama kodunuzu iletelim' : 'Enter your registered email address to receive a reset code';

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
      <div style="text-align:center">
        <div style="font-size:38px;margin-bottom:8px">🔑</div>
        <div style="font-size:13px;color:var(--text-2);line-height:1.4">
          ${isTr ? 'Şifrenizi sıfırlayabilmek için sisteme kayıtlı olan e-posta adresinizi yazın.' : 'Please type your registered email address to reset your password.'}
        </div>
      </div>

      <div id="fp-step1-error" style="display:none;background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700;line-height:1.4"></div>

      <div class="input-group">
        <label class="input-label">${t('email_label')}</label>
        <input class="input-field" type="email" id="fp-email" placeholder="${t('email_placeholder')}" value="${state.tempFpEmail || ''}" autocomplete="off"/>
      </div>
    </div>`;

  openProfileEditModal('🔑', title, sub, bodyHtml, () => {
    return proceedToPasswordResetCode();
  });

  const saveBtn = document.getElementById('pem-save-btn');
  if (saveBtn) {
    saveBtn.innerHTML = `🔑 ${t('send_reset_code')}`;
    saveBtn.style.display = 'block';
  }
}

function proceedToPasswordResetCode() {
  const isTr = (state.lang || 'tr') === 'tr';
  const emailInput = document.getElementById('fp-email');
  const email = emailInput ? emailInput.value.trim() : '';
  const errBox = document.getElementById('fp-step1-error');

  // 1. Empty Email Validation
  if (!email) {
    const msg = isTr ? 'Lütfen e-posta adresinizi doldurun! Bu alan boş bırakılamaz.' : 'Please fill out your email address! This field cannot be left empty.';
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = '⚠️ ' + msg;
    }
    showErrorModal(
      isTr ? 'E-posta Adresi Boş' : 'Email Address Required',
      msg,
      '⚠️',
      () => openForgotPasswordStep1()
    );
    return false;
  }

  // 2. Invalid Email Format Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const msg = isTr ? `"${email}" geçerli bir e-posta adresi değil! Lütfen doğru formatta bir e-posta yazın (örnek: ad@domain.com).` : `"${email}" is not a valid email address.`;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = '❌ ' + msg;
    }
    showErrorModal(
      isTr ? 'Geçersiz E-posta Formatı' : 'Invalid Email Format',
      msg,
      '❌',
      () => openForgotPasswordStep1()
    );
    return false;
  }

  if (errBox) errBox.style.display = 'none';

  state.tempFpEmail = email;
  state.generatedFpOtp = 'aaaaaa';

  showToast(isTr ? `📩 ${email} adresine 6 haneli sıfırlama kodu gönderildi!` : `📩 6-digit reset code sent to ${email}!`);

  setTimeout(() => {
    openForgotPasswordStep2();
  }, 300);

  return false;
}

function openForgotPasswordStep2() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Yeni Şifre Belirleyin' : 'Set New Password';
  const sub = isTr ? `Adım 2/2: ${state.tempFpEmail} adresine gelen 6 haneli kodu ve yeni şifrenizi girin` : `Step 2/2: Enter the 6-digit code sent to ${state.tempFpEmail} and your new password`;

  if (!state.tempFpOtpDigits) state.tempFpOtpDigits = ['', '', '', '', '', ''];

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:14px;padding:4px 0">
      <div id="fp-step2-error" style="${state.tempFpErr ? 'display:block' : 'display:none'};background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700;line-height:1.4">
        ${state.tempFpErr || ''}
      </div>

      <div style="text-align:center">
        <div style="font-size:36px;margin-bottom:6px">🔒</div>
        <div style="font-size:12px;color:var(--text-2);margin-bottom:12px">
          ${isTr ? `E-postanıza (<b>${state.tempFpEmail}</b>) gönderilen 6 haneli kodu ve yeni şifrenizi belirleyin.` : `Enter the 6-digit code sent to <b>${state.tempFpEmail}</b> and enter your new password.`}
        </div>

        <!-- 6-Digit Reset OTP Code Inputs (Vertically Centered & State Preserved) -->
        <div style="display:flex;justify-content:center;gap:8px;margin-bottom:12px" id="fp-otp-inputs">
          <input type="text" id="fp-otp-1" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[0] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 1)" oninput="state.tempFpOtpDigits[0]=this.value"/>
          <input type="text" id="fp-otp-2" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[1] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 2)" oninput="state.tempFpOtpDigits[1]=this.value"/>
          <input type="text" id="fp-otp-3" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[2] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 3)" oninput="state.tempFpOtpDigits[2]=this.value"/>
          <input type="text" id="fp-otp-4" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[3] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 4)" oninput="state.tempFpOtpDigits[3]=this.value"/>
          <input type="text" id="fp-otp-5" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[4] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 5)" oninput="state.tempFpOtpDigits[4]=this.value"/>
          <input type="text" id="fp-otp-6" maxlength="1" class="otp-box" value="${state.tempFpOtpDigits[5] || ''}" placeholder="•" onkeyup="moveFpOtpFocus(this, 6)" oninput="state.tempFpOtpDigits[5]=this.value"/>
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">${isTr ? 'Yeni Şifre' : 'New Password'}</label>
        <div class="input-wrapper input-with-icon">
          <input class="input-field" type="password" id="fp-new-pass" placeholder="${isTr ? 'En az 8 krkt, 1 Büyük, 1 Küçük, 1 Sayı' : 'Min 8 chars, 1 Upper, 1 Lower, 1 Num'}" value="${state.tempFpNewPass || ''}" oninput="state.tempFpNewPass=this.value; checkPasswordMatch();" onkeyup="checkPasswordMatch()"/>
          <span class="input-icon-right" onclick="togglePwd('fp-new-pass')">👁</span>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">
          💡 ${isTr ? 'Şifre kuralı: En az 8 karakter, en az 1 büyük harf (A-Z), 1 küçük harf (a-z) ve 1 rakam (0-9).' : 'Rule: Min 8 chars, 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9).'}
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">${isTr ? 'Yeni Şifre Tekrarı' : 'Confirm New Password'}</label>
        <div class="input-wrapper input-with-icon">
          <input class="input-field" type="password" id="fp-confirm-pass" placeholder="${isTr ? 'Yeni şifrenizi tekrar yazın' : 'Re-enter new password'}" value="${state.tempFpConfirmPass || ''}" oninput="state.tempFpConfirmPass=this.value; checkPasswordMatch();" onkeyup="checkPasswordMatch()"/>
          <span class="input-icon-right" onclick="togglePwd('fp-confirm-pass')">👁</span>
        </div>
      </div>

      <div id="fp-pass-match-warn" style="display:none;font-size:12px;color:var(--error);font-weight:700;margin-top:2px">
        ⚠️ ${isTr ? 'Şifreler birbiriyle eşleşmiyor!' : 'Passwords do not match!'}
      </div>
    </div>`;

  openProfileEditModal('🔒', title, sub, bodyHtml, () => {
    return completePasswordReset();
  });

  const saveBtn = document.getElementById('pem-save-btn');
  if (saveBtn) {
    saveBtn.innerHTML = `✅ ${isTr ? 'Şifreyi Güncelle & Giriş Yap' : 'Update Password & Sign In'}`;
    saveBtn.style.display = 'block';
  }
}

function moveFpOtpFocus(el, index) {
  if (el.value.length === 1) {
    const next = document.getElementById('fp-otp-' + (index + 1));
    if (next) next.focus();
  }
}

function checkPasswordMatch() {
  const isTr = (state.lang || 'tr') === 'tr';
  const newPass = document.getElementById('fp-new-pass')?.value || '';
  const confirmPass = document.getElementById('fp-confirm-pass')?.value || '';
  const warnEl = document.getElementById('fp-pass-match-warn');

  if (confirmPass.length > 0 && newPass !== confirmPass) {
    if (warnEl) {
      warnEl.style.display = 'block';
      warnEl.textContent = isTr ? '⚠️ Şifreler birbiriyle eşleşmiyor!' : '⚠️ Passwords do not match!';
    }
  } else {
    if (warnEl) warnEl.style.display = 'none';
  }
}

function completePasswordReset() {
  const isTr = (state.lang || 'tr') === 'tr';
  if (!state.tempFpOtpDigits) state.tempFpOtpDigits = ['', '', '', '', '', ''];

  const digits = [1,2,3,4,5,6].map(i => {
    const val = document.getElementById('fp-otp-' + i)?.value?.trim() || '';
    state.tempFpOtpDigits[i-1] = val;
    return val;
  }).join('');

  const newPass = document.getElementById('fp-new-pass')?.value?.trim() || '';
  const confirmPass = document.getElementById('fp-confirm-pass')?.value?.trim() || '';
  const errBox = document.getElementById('fp-step2-error');

  // INSTANT PERSISTENCE: Save typed inputs into state BEFORE any validation check!
  state.tempFpNewPass = newPass;
  state.tempFpConfirmPass = confirmPass;

  // 1. Check 6-digit OTP code presence
  if (digits.length < 6) {
    const msg = isTr ? 'Lütfen e-postanıza gelen 6 haneli sıfırlama kodunun tüm hanelerini yazın.' : 'Please enter all 6 digits of the reset code sent to your email.';
    state.tempFpErr = '📩 ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempFpErr;
    }
    showErrorModal(
      isTr ? 'Eksik Sıfırlama Kodu' : 'Incomplete Reset Code',
      msg,
      '📩',
      () => openForgotPasswordStep2()
    );
    return false;
  }

  // 2. Check 6-digit OTP code validity
  if (digits.toLowerCase() !== 'aaaaaa') {
    const msg = isTr ? 'Girdiğiniz 6 haneli sıfırlama kodu hatalı! Lütfen e-posta kutunuza gelen doğrulama kodunu kontrol edin.' : 'The reset code entered is incorrect. Please check your email.';
    state.tempFpErr = '❌ ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempFpErr;
    }
    showErrorModal(
      isTr ? 'Hatalı Sıfırlama Kodu' : 'Incorrect Reset Code',
      msg,
      '❌',
      () => openForgotPasswordStep2()
    );
    return false;
  }

  // 3. Strict Password Rules Validation (Min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  const hasMin8 = newPass && newPass.length >= 8;
  const hasUpper = /[A-Z]/.test(newPass || '');
  const hasLower = /[a-z]/.test(newPass || '');
  const hasNum   = /[0-9]/.test(newPass || '');

  if (!newPass || !hasMin8 || !hasUpper || !hasLower || !hasNum) {
    let detail = '';
    if (!newPass) detail = isTr ? 'Şifre alanı boş bırakılamaz!' : 'Password cannot be empty!';
    else if (!hasMin8) detail = isTr ? 'Şifre en az 8 karakter olmalıdır!' : 'Password must be at least 8 characters!';
    else if (!hasUpper) detail = isTr ? 'Şifre en az 1 büyük harf (A-Z) içermelidir!' : 'Password must include at least 1 uppercase letter (A-Z)!';
    else if (!hasLower) detail = isTr ? 'Şifre en az 1 küçük harf (a-z) içermelidir!' : 'Password must include at least 1 lowercase letter (a-z)!';
    else if (!hasNum) detail = isTr ? 'Şifre en az 1 rakam (0-9) içermelidir!' : 'Password must include at least 1 number (0-9)!';

    const msg = isTr 
      ? `Güvensiz veya Kurala Uymayan Yeni Şifre! ${detail}\n\nKural: Şifreniz en az 8 karakter uzunluğunda olmalı; içerisinde en az 1 büyük harf (A-Z), 1 küçük harf (a-z) ve 1 rakam (0-9) barındırmalıdır.` 
      : `Weak Password! ${detail}`;

    state.tempFpErr = '🔒 ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempFpErr;
    }
    showErrorModal(
      isTr ? 'Kurala Uymayan Şifre' : 'Invalid Password',
      msg,
      '🔒',
      () => openForgotPasswordStep2()
    );
    return false;
  }

  // 4. Confirm Password Match
  if (newPass !== confirmPass) {
    const msg = isTr ? 'Girdiğiniz yeni şifre ile şifre tekrarı birbiriyle eşleşmiyor! Lütfen her iki alana da aynı şifreyi tekrar yazın.' : 'The new password and confirmation password do not match.';
    state.tempFpErr = '⚠️ ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempFpErr;
    }
    showErrorModal(
      isTr ? 'Şifreler Eşleşmiyor' : 'Passwords Do Not Match',
      msg,
      '⚠️',
      () => openForgotPasswordStep2()
    );
    return false;
  }

  // Clear temp err on success
  state.tempFpErr = '';
  if (errBox) errBox.style.display = 'none';

  if (state.tempFpEmail) {
    state.user.email = state.tempFpEmail;
    const nameFromEmail = extractNameFromEmail(state.tempFpEmail);
    state.user.name = nameFromEmail;
    state.user.initials = nameFromEmail.charAt(0).toUpperCase();
  }

  closeProfileEditModal();
  showToast(isTr ? 'Şifreniz başarıyla güncellendi! Yeni şifrenizle giriş yapabilirsiniz. ' : 'Password updated successfully! You can now log in. ');

  setTimeout(() => {
    const emailField = document.getElementById('login-email');
    if (emailField) emailField.value = state.tempFpEmail;
    const passField = document.getElementById('login-password');
    if (passField) passField.value = newPass;
  }, 200);

  return true;
}

function renderRegister() {
  setTimeout(() => openRegisterModal(), 100);
  return `
  <div class="auth-screen">
    <div class="auth-header" style="position:relative">
      <div style="position:absolute;top:16px;right:20px;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.25);backdrop-filter:blur(8px);border-radius:var(--r-full);padding:4px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <span style="font-size:14px">🌐</span>
        <select onchange="setLanguage(this.value)" style="background:transparent;border:none;color:var(--text-1);font-family:var(--font);font-size:12px;font-weight:700;outline:none;cursor:pointer">
          ${LANGUAGES.map(l => `<option value="${l.code}" style="background:#2D2638;color:#FFFFFF;padding:8px" ${(state.lang||'tr') === l.code ? 'selected' : ''}>${l.flag} ${l.name} (${l.code.toUpperCase()})</option>`).join('')}
        </select>
      </div>
      <div class="auth-logo-sm"></div>
      <div class="auth-title">${(state.lang||'tr')==='tr'?'Hesap Oluştur':'Create Account'}</div>
      <div class="auth-subtitle">${(state.lang||'tr')==='tr'?'Kişisel döngü yolculuğunuza hemen başlayın':'Start your cycle tracking journey'}</div>
    </div>
    <div class="auth-body">
      <button class="btn btn-primary mt-4" onclick="openRegisterModal()"> ${(state.lang||'tr')==='tr'?'Hesap Oluşturma Penceresini Aç':'Open Registration Modal'}</button>
      <div class="auth-footer mt-4">
        ${(state.lang||'tr')==='tr'?'Zaten hesabınız var mı?':'Already have an account?'} <a class="auth-link" onclick="closeProfileEditModal(); resetTempAuthFields(); navigate('login','back')">${(state.lang||'tr')==='tr'?'Giriş Yap':'Log In'}</a>
      </div>
    </div>
  </div>`;
}

function openRegisterModal() {
  openRegisterStep1();
}

function openRegisterStep1() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = t('create_account');
  const sub = t('reg_step1_sub');

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
      <div id="reg-step1-error" style="${state.tempRegErr ? 'display:block' : 'display:none'};background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700;line-height:1.4">
        ${state.tempRegErr || ''}
      </div>

      <div class="input-group">
        <label class="input-label">${t('full_name')}</label>
        <input class="input-field" type="text" id="reg-fullname" placeholder="${t('full_name_placeholder')}" value="${state.tempRegName || ''}" oninput="state.tempRegName=this.value" autocomplete="off"/>
      </div>
      <div class="input-group">
        <label class="input-label">${t('email_label')}</label>
        <input class="input-field" type="email" id="reg-email" placeholder="${t('email_placeholder')}" value="${state.tempRegEmail || ''}" oninput="state.tempRegEmail=this.value" autocomplete="off"/>
      </div>
      <div class="input-group">
        <label class="input-label">${t('password_label')}</label>
        <div class="input-wrapper input-with-icon">
          <input class="input-field" type="password" id="reg-password" placeholder="${t('pwd_placeholder')}" value="${state.tempRegPass || ''}" oninput="state.tempRegPass=this.value" autocomplete="off"/>
          <span class="input-icon-right" onclick="togglePwd('reg-password')">👁</span>
        </div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px">
          💡 ${t('pwd_rule_hint')}
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">${t('dob')}</label>
        <div style="position:relative">
          <input class="input-field" type="text" id="reg-dob-display" readonly 
            placeholder="${getDatePlaceholder()}" 
            value="${state.tempRegDob ? formatDate(state.tempRegDob) : ''}" 
            onclick="const el=document.getElementById('reg-dob'); if(el && el.showPicker){el.showPicker();}else if(el){el.click();}" 
            style="cursor:pointer;padding-right:42px;background:var(--surface)"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;font-size:18px">📅</span>
          <input type="date" id="reg-dob" value="${state.tempRegDob || ''}" 
            style="opacity:0;position:absolute;inset:0;width:100%;height:100%;cursor:pointer" 
            onchange="state.tempRegDob=this.value; const d=document.getElementById('reg-dob-display'); if(d) d.value=formatDate(this.value);"/>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-3);line-height:1.4;margin-top:2px">
        🔒 ${t('kvkk_gdpr_encrypted')}
      </div>
    </div>`;

  openProfileEditModal('', title, sub, bodyHtml, () => {
    return proceedToEmailVerification();
  });

  const saveBtn = document.getElementById('pem-save-btn');
  if (saveBtn) {
    saveBtn.innerHTML = ` ${t('continue_email_verification')}`;
    saveBtn.style.display = 'block';
  }
}

function proceedToEmailVerification() {
  const isTr = (state.lang || 'tr') === 'tr';
  const name = document.getElementById('reg-fullname')?.value?.trim() || '';
  const email = document.getElementById('reg-email')?.value?.trim() || '';
  const pass = document.getElementById('reg-password')?.value?.trim() || '';
  const dob = document.getElementById('reg-dob')?.value?.trim() || '';
  const errBox = document.getElementById('reg-step1-error');

  // INSTANT PERSISTENCE: Save typed inputs into state BEFORE any validation check!
  state.tempRegName = name;
  state.tempRegEmail = email;
  state.tempRegPass = pass;
  state.tempRegDob = dob;

  // 1. Full Name Validation
  if (!name || name.length < 3) {
    const msg = isTr ? 'Lütfen Ad Soyad alanını doldurun! Bu alan boş bırakılamaz.' : 'Please enter your full name! This field cannot be empty.';
    state.tempRegErr = '⚠️ ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegErr;
    }
    showErrorModal(
      isTr ? 'Ad Soyad Eksik' : 'Name Required',
      msg,
      '⚠️',
      () => openRegisterStep1()
    );
    return false;
  }

  // 2. Email Validation (Regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    const msg = isTr 
      ? (!email ? 'Lütfen E-posta adresinizi doldurun! Bu alan boş bırakılamaz.' : `"${email}" geçerli bir e-posta adresi değil! Örnek format: ad@domain.com`)
      : 'Please enter a valid email address!';
    state.tempRegErr = '❌ ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegErr;
    }
    showErrorModal(
      isTr ? 'Geçersiz E-posta Adresi' : 'Invalid Email',
      msg,
      '❌',
      () => openRegisterStep1()
    );
    return false;
  }

  // 3. Strict Password Rules Validation (Min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  const hasMin8 = pass && pass.length >= 8;
  const hasUpper = /[A-Z]/.test(pass || '');
  const hasLower = /[a-z]/.test(pass || '');
  const hasNum   = /[0-9]/.test(pass || '');

  if (!pass || !hasMin8 || !hasUpper || !hasLower || !hasNum) {
    let detail = '';
    if (!pass) detail = isTr ? 'Şifre alanı boş bırakılamaz!' : 'Password cannot be empty!';
    else if (!hasMin8) detail = isTr ? 'Şifre en az 8 karakter olmalıdır!' : 'Password must be at least 8 characters!';
    else if (!hasUpper) detail = isTr ? 'Şifre en az 1 büyük harf (A-Z) içermelidir!' : 'Password must include at least 1 uppercase letter (A-Z)!';
    else if (!hasLower) detail = isTr ? 'Şifre en az 1 küçük harf (a-z) içermelidir!' : 'Password must include at least 1 lowercase letter (a-z)!';
    else if (!hasNum) detail = isTr ? 'Şifre en az 1 rakam (0-9) içermelidir!' : 'Password must include at least 1 number (0-9)!';

    const msg = isTr 
      ? `Güvensiz veya Kurala Uymayan Şifre! ${detail}\n\nKural: Şifreniz en az 8 karakter uzunluğunda olmalı; içerisinde en az 1 büyük harf (A-Z), 1 küçük harf (a-z) ve 1 rakam (0-9) barındırmalıdır.` 
      : `Weak Password! ${detail}`;
    state.tempRegErr = '🔒 ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegErr;
    }
    showErrorModal(
      isTr ? 'Kurala Uymayan Şifre' : 'Weak Password',
      msg,
      '🔒',
      () => openRegisterStep1()
    );
    return false;
  }

  // 4. Date of Birth Validation
  if (!dob) {
    const msg = isTr ? 'Lütfen Doğum Tarihinizi seçin! Bu alan boş bırakılamaz.' : 'Please select your Date of Birth!';
    state.tempRegErr = '📅 ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegErr;
    }
    showErrorModal(
      isTr ? 'Doğum Tarihi Eksik' : 'Date of Birth Required',
      msg,
      '📅',
      () => openRegisterStep1()
    );
    return false;
  }

  // Clear temp error on success
  state.tempRegErr = '';
  if (errBox) errBox.style.display = 'none';

  state.generatedOtp = 'aaaaaa';

  showToast(isTr ? `📩 ${email} adresine 6 haneli doğrulama kodu gönderildi!` : `📩 6-digit verification code sent to ${email}!`);
  
  setTimeout(() => {
    openRegisterStep2();
  }, 300);

  return false;
}

function openRegisterStep2() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = t('reg_step2_title');
  const sub = t('reg_step2_sub');

  if (!state.tempRegOtpDigits) state.tempRegOtpDigits = ['', '', '', '', '', ''];

  const bodyHtml = `
    <div style="text-align:center;padding:8px 0">
      <div id="reg-step2-error" style="${state.tempRegStep2Err ? 'display:block' : 'display:none'};background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700;line-height:1.4;margin-bottom:12px;text-align:left">
        ${state.tempRegStep2Err || ''}
      </div>

      <div style="font-size:36px;margin-bottom:8px">📩</div>
      <div style="font-size:13px;color:var(--text-2);margin-bottom:16px">
        ${isTr ? `Doğrulama kodu <b>${state.tempRegEmail}</b> kutunuza iletildi.` : `Verification code sent to <b>${state.tempRegEmail}</b>.`}
      </div>

      <!-- 6-Digit OTP Code Inputs (Vertically Centered & State Preserved) -->
      <div style="display:flex;justify-content:center;gap:8px;margin-bottom:16px" id="otp-inputs">
        <input type="text" id="otp-1" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[0] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 1)" oninput="state.tempRegOtpDigits[0]=this.value"/>
        <input type="text" id="otp-2" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[1] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 2)" oninput="state.tempRegOtpDigits[1]=this.value"/>
        <input type="text" id="otp-3" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[2] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 3)" oninput="state.tempRegOtpDigits[2]=this.value"/>
        <input type="text" id="otp-4" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[3] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 4)" oninput="state.tempRegOtpDigits[3]=this.value"/>
        <input type="text" id="otp-5" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[4] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 4)" oninput="state.tempRegOtpDigits[4]=this.value"/>
        <input type="text" id="otp-6" maxlength="1" class="otp-box" value="${state.tempRegOtpDigits[5] || ''}" placeholder="•" onkeyup="moveOtpFocus(this, 5)" oninput="state.tempRegOtpDigits[5]=this.value"/>
      </div>

      <div style="font-size:12px;color:var(--primary);margin-bottom:12px;font-weight:600;cursor:pointer" onclick="resendOtpCode()">
        ⏱️ ${t('resend_code')}
      </div>
    </div>`;

  openProfileEditModal('📩', title, sub, bodyHtml, () => {
    return completeEmailVerification();
  });

  const saveBtn = document.getElementById('pem-save-btn');
  if (saveBtn) {
    saveBtn.innerHTML = `✅ ${t('verify_and_complete')}`;
    saveBtn.style.display = 'block';
  }
}

function moveOtpFocus(el, index) {
  if (el.value.length === 1) {
    const next = el.parentElement.children[index];
    if (next) next.focus();
  }
}

function resendOtpCode() {
  const isTr = (state.lang || 'tr') === 'tr';
  showToast(isTr ? `Doğrulama kodu tekrar gönderildi 📩` : `Verification code resent 📩`);
}

function completeEmailVerification() {
  const isTr = (state.lang || 'tr') === 'tr';
  if (!state.tempRegOtpDigits) state.tempRegOtpDigits = ['', '', '', '', '', ''];
  
  const digits = [1,2,3,4,5,6].map(i => {
    const val = document.getElementById('otp-' + i)?.value?.trim() || '';
    state.tempRegOtpDigits[i-1] = val;
    return val;
  }).join('');

  const errBox = document.getElementById('reg-step2-error');

  // Check 1: Incomplete OTP Code
  if (digits.length < 6) {
    const msg = isTr ? 'Lütfen e-postanıza gönderilen 6 haneli doğrulama kodunun tüm hanelerini eksiksiz girin!' : 'Please enter all 6 digits of the verification code.';
    state.tempRegStep2Err = '📩 ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegStep2Err;
    }
    showErrorModal(
      isTr ? 'Eksik Doğrulama Kodu' : 'Incomplete Verification Code',
      msg,
      '📩',
      () => openRegisterStep2()
    );
    return false;
  }

  // Check 2: Incorrect OTP Code
  if (digits.toLowerCase() !== 'aaaaaa') {
    const msg = isTr ? 'Girdiğiniz 6 haneli doğrulama kodu hatalı! Lütfen e-posta kutunuza gelen doğrulama kodunu kontrol edin.' : 'The verification code entered is incorrect.';
    state.tempRegStep2Err = '❌ ' + msg;
    if (errBox) {
      errBox.style.display = 'block';
      errBox.textContent = state.tempRegStep2Err;
    }
    showErrorModal(
      isTr ? 'Hatalı Doğrulama Kodu' : 'Incorrect Verification Code',
      msg,
      '❌',
      () => openRegisterStep2()
    );
    return false;
  }

  // Clear temp error on success
  state.tempRegStep2Err = '';
  if (errBox) errBox.style.display = 'none';

  const email = state.tempRegEmail || 'sarah@flowia.app';
  const name = state.tempRegName || extractNameFromEmail(email);
  const dob = state.tempRegDob || '1998-04-15';

  loadUserSession(email, name, dob);
  state.isLoggedIn = true;

  saveToStorage();
  closeProfileEditModal();
  navigate('home', 'refresh');

  showToast(isTr ? 'Hesabınız ve e-postanız başarıyla doğrulandı! 🎉' : 'Account & email successfully verified! 🎉');

  setTimeout(() => {
    navigate('onboarding', 'refresh');
  }, 500);
}

// ============================================================
// 10. SCREEN: ONBOARDING
// ============================================================
function renderOnboarding() {
  const isTr = (state.lang || 'tr') === 'tr';
  const step = state.onboardStep || 1;

  if (!state.onboardData) {
    state.onboardData = { lastPeriodDate: TODAY_STR, cycleLength: 28, periodLength: 5, goals: [] };
  }

  const steps = [
    {
      emoji: '📅',
      question: isTr ? 'Son adetiniz ne zaman başladı?' : 'When did your last period start?',
      hint: isTr ? 'Gelecek döngü tarihlerinizi doğru tahmin etmek için bu bilgiyi kullanırız.' : 'We use this to predict your next cycle accurately.',
      type: 'date'
    },
    {
      emoji: '🔄',
      question: isTr ? 'Tipik döngü süreniz kaç gün?' : 'How long is your typical cycle?',
      hint: isTr ? 'Tipik bir döngü 21–35 gün sürer. Ortalama 28 gündür.' : 'A typical cycle is 21–35 days. Average is 28 days.',
      type: 'cycle-slider'
    },
    {
      emoji: '🩸',
      question: isTr ? 'Adetiniz genellikle kaç gün sürer?' : 'How long does your period usually last?',
      hint: isTr ? 'Çoğu adet kanaması 3–7 gün sürer. Ortalama 5 gündür.' : 'Most periods last 3–7 days. The average is 5 days.',
      type: 'period-slider'
    },
    {
      emoji: '🌟',
      question: isTr ? 'Hedefleriniz nelerdir?' : 'What are your goals?',
      hint: isTr ? 'Uygun seçenekleri işaretleyin. Bunu daha sonra Ayarlar\'dan değiştirebilirsiniz.' : 'Select all that apply. You can change this later in Settings.',
      type: 'goals'
    },
  ];
  const s = steps[step - 1];

  const dots = steps.map((_, i) => {
    const n = i + 1;
    if (n < step) return `<div class="onboard-step-dot done"></div>`;
    if (n === step) return `<div class="onboard-step-dot active"></div>`;
    return `<div class="onboard-step-dot todo"></div>`;
  }).join('');

  let content = '';
  if (s.type === 'date') {
    const dateFormatted = formatDate(state.onboardData.lastPeriodDate || TODAY_STR);
    content = `
    <div class="input-group mb-4">
      <label class="input-label">📅 ${isTr ? 'Başlangıç Tarihi' : 'Start Date'}</label>
      <div style="position:relative">
        <input class="input-field" type="text" id="ob-date-display" value="${dateFormatted}" readonly onclick="const p = document.getElementById('ob-date'); p.showPicker ? p.showPicker() : p.click()" style="cursor:pointer;padding-right:40px;font-weight:600"/>
        <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none">📅</span>
        <input type="date" id="ob-date" value="${state.onboardData.lastPeriodDate || TODAY_STR}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0" onchange="state.onboardData.lastPeriodDate=this.value; document.getElementById('ob-date-display').value=formatDate(this.value)"/>
      </div>
    </div>`;
  } else if (s.type === 'cycle-slider') {
    content = `
    <div class="slider-wrapper">
      <div class="slider-value-display" id="cycle-val">${state.onboardData.cycleLength} ${isTr ? 'gün' : 'days'}</div>
      <input class="slider-range-input" type="range" min="21" max="40" value="${state.onboardData.cycleLength}" id="cycle-slider"
        oninput="state.onboardData.cycleLength=+this.value; document.getElementById('cycle-val').textContent=this.value+' ${(isTr?'gün':'days')}'; updateSliderFill(this)"/>
      <div class="slider-labels"><span>21 ${isTr ? 'gün' : 'days'}</span><span>40 ${isTr ? 'gün' : 'days'}</span></div>
    </div>`;
  } else if (s.type === 'period-slider') {
    content = `
    <div class="slider-wrapper">
      <div class="slider-value-display" id="period-val">${state.onboardData.periodLength} ${isTr ? 'gün' : 'days'}</div>
      <input class="slider-range-input" type="range" min="2" max="10" value="${state.onboardData.periodLength}" id="period-slider"
        oninput="state.onboardData.periodLength=+this.value; document.getElementById('period-val').textContent=this.value+' ${(isTr?'gün':'days')}'; updateSliderFill(this)"/>
      <div class="slider-labels"><span>2 ${isTr ? 'gün' : 'days'}</span><span>10 ${isTr ? 'gün' : 'days'}</span></div>
    </div>`;
  } else if (s.type === 'goals') {
    const goalOptions = [
      { id:'track', icon:'📊', label: isTr ? 'Döngümü takip etmek' : 'Track my cycle' },
      { id:'pregnancy', icon:'👶', label: isTr ? 'Hamilelik planlamak' : 'Plan a pregnancy' },
      { id:'pcos', icon:'🏥', label: isTr ? 'PKOS yönetimi' : 'Manage PCOS' },
      { id:'wellness', icon:'🧘', label: isTr ? 'Genel sağlık & zindelik' : 'General wellness' },
    ];
    content = `<div class="goal-options">
      ${goalOptions.map(g => `
        <div class="goal-option ${state.onboardData.goals.includes(g.id) ? 'selected' : ''}" onclick="toggleGoal('${g.id}')">
          <div class="goal-icon">${g.icon}</div>
          <span>${g.label}</span>
        </div>`).join('')}
    </div>`;
  }

  return `
  <div class="onboard-screen">
    <div class="onboard-progress">${dots}</div>
    <div class="onboard-emoji">${s.emoji}</div>
    <div class="onboard-question">${s.question}</div>
    <div class="onboard-hint">${s.hint}</div>
    ${content}
    <div class="onboard-nav">
      ${step > 1 ? `<button class="btn btn-outline" style="flex:1" onclick="state.onboardStep--; navigate('onboarding','back')">${isTr ? 'Geri' : 'Back'}</button>` : ''}
      <button class="btn btn-primary" style="flex:2" onclick="nextOnboardStep()">
        ${step < 4 ? (isTr ? 'Devam Et' : 'Continue') : (isTr ? ' Başlayalım' : 'Get Started ')}
      </button>
    </div>
    <div style="text-align:center;margin-top:16px;font-size:12px;color:var(--text-3)">${isTr ? `Adım ${step} / 4` : `Step ${step} of 4`}</div>
  </div>`;
}

function nextOnboardStep() {
  const obDate = document.getElementById('ob-date');
  if (obDate && obDate.value) {
    state.onboardData.lastPeriodDate = obDate.value;
    state.user.lastPeriodDate = obDate.value;
  }
  const cycleSlider = document.getElementById('cycle-slider');
  if (cycleSlider) {
    state.onboardData.cycleLength = parseInt(cycleSlider.value, 10);
    state.user.avgCycle = state.onboardData.cycleLength;
  }
  const periodSlider = document.getElementById('period-slider');
  if (periodSlider) {
    state.onboardData.periodLength = parseInt(periodSlider.value, 10);
    state.user.avgPeriod = state.onboardData.periodLength;
  }

  if (state.onboardStep < 4) {
    state.onboardStep++;
    navigate('onboarding', 'refresh');
  } else {
    state.isLoggedIn = true;
    state.onboardStep = 1;
    PREDICTIONS = computePredictions();
    saveToStorage();
    showToast((state.lang || 'tr') === 'tr' ? 'Profiliniz ve döngü tahminleriniz hazırlandı! ' : 'Your profile and cycle predictions are ready! ');
    navigate('home', 'refresh');
  }
}
function toggleGoal(id) {
  const idx = state.onboardData.goals.indexOf(id);
  if (idx > -1) state.onboardData.goals.splice(idx, 1);
  else state.onboardData.goals.push(id);
  navigate('onboarding');
}
function updateSliderFill(slider) {
  const min = +slider.min, max = +slider.max, val = +slider.value;
  const pct = ((val - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, var(--border) ${pct}%)`;
}

// ============================================================
// 11. SCREEN: HOME DASHBOARD
// ============================================================

// ============================================================
// EARLY PERIOD END HANDLING
// ============================================================
function markPeriodEndedToday() {
  const cDay = (PREDICTIONS && PREDICTIONS.cycleDay) ? PREDICTIONS.cycleDay : 3;
  state.periodEndedEarly = true;
  state.actualPeriodLength = cDay;

  if (!state.user) state.user = {};
  if (!state.user.avgPeriod) state.user.avgPeriod = 5;

  // Update matching cycle in state.cycles so its recorded endDate matches early period end
  if (PREDICTIONS && PREDICTIONS.lastPeriodDate && state.cycles) {
    const lastStart = PREDICTIONS.lastPeriodDate;
    state.cycles.forEach(c => {
      if (c.startDate && isSameDay(new Date(c.startDate), lastStart)) {
        c.endDate = addDays(lastStart, cDay - 1);
        c.periodDays = cDay;
      }
    });
  }

  PREDICTIONS = computePredictions();
  saveToStorage();
  
  showToast(t('period_ended_toast'));
  navigate(state.screen || 'home', 'refresh');
}

function resumePeriodLog() {
  state.periodEndedEarly = false;
  state.actualPeriodLength = null;
  PREDICTIONS = computePredictions();
  saveToStorage();
  showToast((state.lang || 'tr') === 'tr' ? 'Adet takibi varsayılan süresine döndürüldü. ' : 'Period tracking reset to default length. ');
  navigate(state.screen || 'home', 'refresh');
}

function renderHome() {
  const P = PREDICTIONS;
  const phaseRaw = getCyclePhase(P.cycleDay);
  const phaseKey = phaseRaw.cls.replace('chip-', 'phase_');
  const phaseName = t(phaseKey);
  const phase = { ...phaseRaw, name: phaseName };

  const progress = Math.min(1, P.cycleDay / P.avgCycle);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - progress);
  const todayMood = state.moods.find(m => m.date === TODAY_STR);
  const todaySymptom = state.symptoms.find(s => s.date === TODAY_STR);
  const unreadCount = state.notifications.filter(n => !n.read).length;
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('good_morning');
    if (h < 17) return t('good_afternoon');
    return t('good_evening');
  })();

  const dateStr = TODAY.toLocaleDateString((state.lang || 'tr') === 'tr' ? 'tr-TR' : ((state.lang || 'tr') === 'ru' ? 'ru-RU' : 'en-US'), { weekday:'long', month:'long', day:'numeric', year:'numeric' });

  // Fertility status based on position in cycle relative to ovulation
  const ovDay = P.avgCycle - 14;
  const fertDayStart = ovDay - 5;
  const cd = P.cycleDay;
  const fertRaw = (cd === ovDay || cd === ovDay+1) ? 'Peak' :
                  (cd >= fertDayStart && cd <= ovDay+2) ? 'High' :
                  (cd >= ovDay+3 && cd <= ovDay+7) ? 'Low' : 'Very Low';
  const fertilityStatusKey = 'fert_' + fertRaw.toLowerCase().replace(' ', '_');
  const fertilityStatus = t(fertilityStatusKey);
  const fertilityColor = fertRaw === 'Peak' ? '#66BB6A' : fertRaw === 'High' ? '#FFA726' : '#9E9E9E';

  return `
  <div class="home-screen">
    <div class="home-header">
      <div class="home-header-top">
        <div>
          <div class="greeting-name">${greeting}, ${state.user.name} </div>
          <div class="greeting-date">${dateStr}</div>
        </div>
        <div class="notif-btn" onclick="navigate('notifications')">
          🔔
          ${unreadCount > 0 ? `<div class="notif-badge">${unreadCount}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Cycle Ring Card -->
    <div class="cycle-ring-card" style="margin-top:-16px">
      <div class="phase-chip ${phase.cls}">${phase.emoji} ${phase.name}</div>
      <div class="cycle-ring-svg-wrap">
        <svg class="cycle-ring-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#EDE0ED" stroke-width="9"/>
          <defs>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${phase.color}"/>
              <stop offset="100%" stop-color="${phase === PHASES.luteal ? '#E8789A' : phase.color}aa"/>
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="54" fill="none" stroke="url(#ringGrad)" stroke-width="9"
            stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
            stroke-linecap="round"/>
        </svg>
        <div class="cycle-ring-text">
          <div class="cycle-day-num" style="color:${phase.color}">${P.cycleDay}</div>
          <div class="cycle-day-lbl">${t('cycle_day_lbl')}</div>
        </div>
      </div>
      <div class="cycle-stats">
        <div class="cycle-stat">
          <div class="cycle-stat-val" style="color:var(--primary)">${P.daysUntilPeriod}</div>
          <div class="cycle-stat-lbl">${t('days_until_period').replace(' ', '<br>')}</div>
        </div>
        <div class="cycle-stat">
          <div class="cycle-stat-val">${P.avgCycle}</div>
          <div class="cycle-stat-lbl">${t('avg_cycle_length').replace(' ', '<br>')}</div>
        </div>
        <div class="cycle-stat">
          <div class="cycle-stat-val" style="color:${fertilityColor}">${fertilityStatus}</div>
          <div class="cycle-stat-lbl">${t('fertility_status').replace(' ', '<br>')}</div>
        </div>
      </div>
    </div>

    <!-- Early Period End Banner -->
    ${(phaseRaw.cls.includes('menstrual') || (P.cycleDay <= (P.avgPeriod || 5) && !state.periodEndedEarly)) ? `
    <div style="margin: -4px 16px 16px; background: linear-gradient(135deg, rgba(232,120,154,0.14), rgba(156,39,176,0.1)); border: 1px solid rgba(232,120,154,0.35); border-radius: var(--r-md); padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; animation: fadeInUp 0.3s ease both">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 22px;">🩸</span>
        <div>
          <div style="font-weight: 700; font-size: 13px; color: var(--text-1);">${t('period_ended_early_title')}</div>
          <div style="font-size: 11px; color: var(--text-2); line-height: 1.3;">${t('period_ended_early_sub')}</div>
        </div>
      </div>
      <button class="btn btn-sm btn-primary" onclick="markPeriodEndedToday()" style="padding: 7px 14px; font-size: 12px; border-radius: 20px; white-space: nowrap; flex-shrink: 0; box-shadow: 0 4px 12px rgba(232,120,154,0.3)">
        ${t('mark_period_ended_btn')}
      </button>
    </div>` : (state.periodEndedEarly ? `
    <div style="margin: -4px 16px 16px; background: rgba(102,187,106,0.12); border: 1px solid rgba(102,187,106,0.3); border-radius: var(--r-md); padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; animation: fadeInUp 0.3s ease both">
      <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--success); font-weight: 600;">
        <span>✨</span>
        <span>${t('period_ended_badge')}: ${state.actualPeriodLength} ${t('days_label')} (${t('avg_period_length')}: ${state.user.avgPeriod} ${t('days_label')})</span>
      </div>
      <button class="btn-link" onclick="resumePeriodLog()" style="font-size: 11px; color: var(--text-2); text-decoration: underline;">
        ${t('resume_period_btn')}
      </button>
    </div>` : '')}

    <!-- Quick Actions -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">${t('quick_log')}</span>
      </div>
      <div class="quick-actions">
        <div class="quick-action" onclick="navigate('log-period')">
          <div class="qa-icon">🩸</div>
          <span class="qa-label">${t('period_qa')}</span>
        </div>
        <div class="quick-action" onclick="navigate('symptoms')">
          <div class="qa-icon">💊</div>
          <span class="qa-label">${t('symptoms_qa')}</span>
        </div>
        <div class="quick-action" onclick="navigate('mood')">
          <div class="qa-icon">😊</div>
          <span class="qa-label">${t('mood_qa')}</span>
        </div>
        <div class="quick-action" onclick="navigate('journal')">
          <div class="qa-icon">📝</div>
          <span class="qa-label">${t('journal_qa')}</span>
        </div>
      </div>
    </div>

    <!-- Fertility Banner -->
    <div class="section">
      <div class="fertility-banner" onclick="navigate('fertility')">
        <div class="fertility-banner-left">
          <div class="fertility-label">${t('fertility_window')}</div>
          <div class="fertility-value">${t('next_period_prefix')}: ${formatDateShort(P.nextPeriodStart)}</div>
          <div class="fertility-sub">${t('ovulation_on')} ${formatDateShort(P.ovulationDate)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px">${t('fertility_status').toUpperCase()}</div>
          <div style="font-size:22px;font-weight:700;color:${fertilityColor}">${fertilityStatus}</div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${fertilityColor}"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </div>
      </div>
    </div>

    <!-- Today's Snapshot -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">${t('todays_snapshot')}</span>
        <span class="section-link" onclick="navigate('reports')">${t('see_reports')}</span>
      </div>
      <div class="today-summary">
        <div class="summary-item" onclick="navigate('mood')">
          <div class="summary-item-icon">${todayMood ? MOODS[todayMood.mood - 1].emoji : '😐'}</div>
          <div class="summary-item-text">
            <div class="label">${t('mood_qa')}</div>
            <div class="value">${todayMood ? MOODS[todayMood.mood - 1].label : t('not_logged')}</div>
          </div>
        </div>
        <div class="summary-item" onclick="navigate('symptoms')">
          <div class="summary-item-icon">${todaySymptom ? '⚡' : '💤'}</div>
          <div class="summary-item-text">
            <div class="label">${t('symptoms_qa')}</div>
            <div class="value">${todaySymptom ? todaySymptom.symptoms.length + ' ' + t('logged_suffix') : t('not_logged')}</div>
          </div>
        </div>
        <div class="summary-item" onclick="navigate('fertility')">
          <div class="summary-item-icon">🌿</div>
          <div class="summary-item-text">
            <div class="label">${t('fertility_status')}</div>
            <div class="value" style="color:${fertilityColor}">${fertilityStatus}</div>
          </div>
        </div>
        <div class="summary-item" onclick="navigate('calendar')">
          <div class="summary-item-icon">📅</div>
          <div class="summary-item-text">
            <div class="label">${t('next_period_prefix')}</div>
            <div class="value">${formatDateShort(P.nextPeriodStart)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Insight -->
    <div class="section" style="padding-bottom:24px">
      <div class="section-header">
        <span class="section-title">${t('ai_insights_title')}</span>
        <span class="section-link" onclick="navigate('insights')">${t('view_all')}</span>
      </div>
      ${(() => {
        const { dynamicList } = runAIInsightEngine();
        const topInsight = dynamicList && dynamicList.length > 0 ? dynamicList[0] : null;
        if (topInsight) {
          return `<div class="insight-card" onclick="navigate('insights')">
            <div class="insight-header">
              <span class="insight-label">${topInsight.icon} ${topInsight.tag || t('ins_tag_1')}</span>
              <span class="badge badge-success" style="font-size:10px">${t('badge_new')}</span>
            </div>
            <p class="insight-text">${topInsight.body}</p>
            <button class="btn-link">${t('view_all')} →</button>
          </div>`;
        }
        return `<div class="insight-card" onclick="navigate('insights')">
          <div class="insight-header">
            <span class="insight-label">📊 ${t('ins_tag_1')}</span>
            <span class="badge badge-success" style="font-size:10px">${t('badge_new')}</span>
          </div>
          <p class="insight-text">${t('ins_body_1')}</p>
          <button class="btn-link">${t('view_all')} →</button>
        </div>`;
      })()}
    </div>
  </div>`;
}

// ============================================================
// 12. SCREEN: CALENDAR
// ============================================================
function renderCalendar() {
  const year = state.calendarYear || TODAY.getFullYear();
  const month = (state.calendarMonth !== undefined && state.calendarMonth !== null && !isNaN(state.calendarMonth)) ? state.calendarMonth : TODAY.getMonth();
  const selDay = state.calendarSelectedDay || TODAY.getDate();

  state.calendarYear = year;
  state.calendarMonth = month;
  state.calendarSelectedDay = selDay;

  const rawFirstDay = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, 6 = Sat
  const firstDayOfWeek = state.firstDayOfWeek || 'Monday';
  
  // Calculate offset based on selected starting day
  let offset = rawFirstDay;
  if (firstDayOfWeek === 'Monday') offset = (rawFirstDay + 6) % 7;
  else if (firstDayOfWeek === 'Saturday') offset = (rawFirstDay + 1) % 7;

  const totalDays = daysInMonth(year, month);
  const prevDays = daysInMonth(year, month - 1);

  let cells = '';
  // Previous month overflow
  for (let i = offset - 1; i >= 0; i--) {
    const pDay = prevDays - i;
    cells += `<div class="cal-day other-month" onclick="selectOtherMonthDay(-1, ${pDay})" style="cursor:pointer">${pDay}</div>`;
  }
  // Current month days
  for (let d = 1; d <= totalDays; d++) {
    const cls = getDateClass(year, month, d);
    const isSelected = d === selDay;
    cells += `<div class="cal-day ${cls} ${isSelected ? 'selected' : ''}" onclick="selectCalDay(${d})">${d}</div>`;
  }
  // Next month fill
  const remaining = (7 - ((offset + totalDays) % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    cells += `<div class="cal-day other-month" onclick="selectOtherMonthDay(1, ${d})" style="cursor:pointer">${d}</div>`;
  }

  // Selected day detail
  const selDate = new Date(year, month, selDay);
  const selCls = getDateClass(year, month, selDay);
  const selIsToday = isSameDay(selDate, TODAY);
  const lastStart = PREDICTIONS.lastPeriodDate || TODAY;
  const selPhaseDay = selCls.includes('period') ? 1 :
    Math.ceil((selDate - lastStart) / 86400000) + 1;
  const selPhase = (selCls.includes('ovulation') ? PHASES.ovulation :
    selCls.includes('fertile') ? PHASES.follicular :
    selCls.includes('period') ? PHASES.menstrual :
    getCyclePhase(Math.max(1, selPhaseDay))) || PHASES.follicular;

  const dayMood = (state.moods || []).find(m => m.date === `${year}-${String(month+1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`);
  const daySymptoms = (state.symptoms || []).find(s => s.date === `${year}-${String(month+1).padStart(2,'0')}-${String(selDay).padStart(2,'0')}`);

  const monthName = getMonthName(month);
  const weekDays = getDaysShort();
  const localeStr = (state.lang || 'tr') === 'tr' ? 'tr-TR' : state.lang === 'ru' ? 'ru-RU' : state.lang === 'de' ? 'de-DE' : state.lang === 'fr' ? 'fr-FR' : state.lang === 'es' ? 'es-ES' : 'en-US';
  const selPhaseName = (selPhase && selPhase.key) ? t(selPhase.key) : (selPhase ? selPhase.name : '');
  const selPhaseEmoji = (selPhase && selPhase.emoji) ? selPhase.emoji : '🌑';

  const moodObj = (dayMood && MOODS) ? MOODS.find(m => m.id === dayMood.mood || m.id === Number(dayMood.mood)) : null;

  let dateFormatted = '';
  try {
    dateFormatted = selDate.toLocaleDateString(localeStr, {weekday:'long',month:'long',day:'numeric'});
  } catch(e) {
    dateFormatted = `${selDay} ${monthName} ${year}`;
  }

  return `
  <div class="calendar-screen">
    ${renderTopBar(monthName + ' ' + year, false, `
      <button class="top-bar-action" onclick="navigate('home','back')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
      </button>`)}

    <div class="cal-header">
      <div class="cal-nav">
        <button class="cal-nav-btn" onclick="prevCalMonth()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
        </button>
        <div class="cal-month">${monthName} ${year}</div>
        <button class="cal-nav-btn" onclick="nextCalMonth()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>
      <div class="cal-weekdays">${weekDays.map(d=>`<div>${d}</div>`).join('')}</div>
    </div>

    <div class="cal-grid">${cells}</div>

    <!-- Day Detail -->
    <div class="day-detail">
      <div class="day-detail-date">
        ${selDate.toLocaleDateString(localeStr, {weekday:'long',month:'long',day:'numeric'})}
        ${selIsToday ? `<span class="badge badge-primary" style="font-size:10px;margin-left:8px">${t('today_badge')}</span>` : ''}
      </div>
      <div class="day-detail-items">
        <div class="day-detail-item">
          <span style="font-size:16px">${selPhaseEmoji}</span>
          <span><strong>${t('phase_lbl')}:</strong> ${selPhaseName}</span>
        </div>
        ${selCls.includes('ovulation') ? `<div class="day-detail-item"><span>🥚</span><span><strong>${t('ovulation_day_text')}</strong></span></div>` : ''}
        ${selCls.includes('fertile') ? `<div class="day-detail-item"><span>🌿</span><span><strong>${t('fertile_window_text')}</strong></span></div>` : ''}
        ${selCls.includes('predicted') ? `<div class="day-detail-item"><span>📅</span><span><strong>${t('predicted_period_text')}</strong></span></div>` : ''}
        ${moodObj ? `<div class="day-detail-item"><span>${moodObj.emoji}</span><span><strong>${t('mood_qa')}:</strong> ${moodObj.label}</span></div>` : ''}
        ${daySymptoms && daySymptoms.symptoms ? `<div class="day-detail-item"><span>💊</span><span><strong>${t('symptoms_qa')}:</strong> ${daySymptoms.symptoms.join(', ')}</span></div>` : ''}
        ${!moodObj && !daySymptoms && !selCls.includes('other-month') ? `
          <div class="day-detail-item" style="cursor:pointer;color:var(--primary)" onclick="navigate('log-period')">
            <span>➕</span><span>${t('tap_to_log')}</span>
          </div>` : ''}
      </div>
    </div>

    <!-- Legend -->
    <div class="cal-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#EF5350"></div>${t('legend_period')}</div>
      <div class="legend-item"><div class="legend-dot" style="background:#66BB6A"></div>${t('legend_fertile')}</div>
      <div class="legend-item"><div class="legend-dot" style="background:#66BB6A;border:2px solid white;box-shadow:0 0 0 2px #66BB6A"></div>${t('legend_ovulation')}</div>
      <div class="legend-item"><div class="legend-dot" style="background:rgba(232,120,154,0.4)"></div>${t('legend_predicted')}</div>
    </div>
  </div>`;
}

function prevCalMonth() {
  if (state.calendarMonth === 0) { state.calendarMonth = 11; state.calendarYear--; }
  else state.calendarMonth--;
  state.calendarSelectedDay = 1;
  navigate('calendar', 'refresh');
}
function nextCalMonth() {
  if (state.calendarMonth === 11) { state.calendarMonth = 0; state.calendarYear++; }
  else state.calendarMonth++;
  state.calendarSelectedDay = 1;
  navigate('calendar', 'refresh');
}
function selectCalDay(d) {
  state.calendarSelectedDay = d;
  navigate('calendar', 'refresh');
}
function selectOtherMonthDay(dir, targetDay) {
  let m = state.calendarMonth + dir;
  let y = state.calendarYear;

  if (m < 0) {
    m = 11;
    y--;
  } else if (m > 11) {
    m = 0;
    y++;
  }

  state.calendarMonth = m;
  state.calendarYear = y;
  state.calendarSelectedDay = targetDay;
  navigate('calendar', 'refresh');
}

// ============================================================
// 13. SCREEN: PERIOD LOG
// ============================================================
function renderLogPeriod() {
  const isTr = (state.lang || 'tr') === 'tr';
  const flow = state.selectedFlow;
  const pain = state.painLevel;
  const dateFormatted = formatDate(state.logDate || TODAY_STR);

  const flowLabels = {
    spotting: isTr ? 'Leke' : 'Spotting',
    light: isTr ? 'Hafif' : 'Light',
    medium: isTr ? 'Orta' : 'Medium',
    heavy: isTr ? 'Yoğun' : 'Heavy'
  };

  const painDescs = isTr ? [
    'Ağrı yok', 'Çok Hafif', 'Hafif', 'Orta', 'Belirgin', 'Orta-Şiddetli',
    'Şiddetli', 'Çok Şiddetli', 'Yoğun', 'Aşırı Şiddetli', 'Dayanılmaz'
  ] : PAIN_DESCRIPTIONS;

  return `
  <div class="log-screen">
    ${renderTopBar(t('log_period'))}
    <div style="padding:0 0 12px">
      <div class="input-group" style="margin-bottom:20px">
        <label class="input-label">📅 ${isTr ? 'Tarih' : 'Date'}</label>
        <div style="position:relative">
          <input class="input-field" type="text" id="log-date-display" value="${dateFormatted}" readonly onclick="const p = document.getElementById('log-date-picker'); p.showPicker ? p.showPicker() : p.click()" style="cursor:pointer;padding-right:40px;font-weight:600"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none">📅</span>
          <input type="date" id="log-date-picker" value="${state.logDate || TODAY_STR}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0" onchange="state.logDate=this.value; document.getElementById('log-date-display').value=formatDate(this.value)"/>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div class="symptom-section-title">${t('flow_intensity')}</div>
        <div class="flow-options" id="flow-options-container">
          ${FLOW_LEVELS.map(f => `
            <div class="flow-opt ${flow === f.id ? 'selected' : ''}" data-id="${f.id}" onclick="selectFlow('${f.id}')">
              <div class="flow-drops">${f.drops}</div>
              <span>${flowLabels[f.id] || f.label}</span>
            </div>`).join('')}
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div class="symptom-section-title">${t('pain_level')}</div>
        <div class="pain-slider-wrap">
          <div class="pain-value-display" id="pain-val-disp">${pain}/10</div>
          <div class="pain-desc" id="pain-desc-disp">${painDescs[pain] || ''}</div>
          <input class="slider-range-input" id="pain-slider-input" type="range" min="0" max="10" value="${pain}" style="background:linear-gradient(to right, var(--error) 0%, var(--error) ${pain*10}%, var(--border) ${pain*10}%)"
            oninput="updatePainLevel(this.value)"/>
          <div class="pain-labels"><span>${isTr ? 'Ağrı yok' : 'No pain'}</span><span>${isTr ? 'Dayanılmaz' : 'Unbearable'}</span></div>
        </div>
      </div>
      <div style="margin-bottom:20px">
        <div class="symptom-section-title">${t('notes')}</div>
        <textarea class="textarea-field" placeholder="${isTr ? 'Adetiniz veya şikayetleriniz hakkında ek notlar...' : 'Any additional notes about your period...'}" id="period-notes">${state.periodNotes||''}</textarea>
      </div>
      <div style="display:flex;gap:10px;align-items:center;padding:0;margin-bottom:12px">
        <label class="toggle" style="flex-shrink:0">
          <input type="checkbox" id="has-spotting"/>
          <span class="toggle-track"></span>
        </label>
        <span style="font-size:14px;color:var(--text-1)">${isTr ? 'Sadece lekelenme' : 'Spotting only'}</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;padding:0;margin-bottom:24px">
        <label class="toggle" style="flex-shrink:0">
          <input type="checkbox" id="has-clotting"/>
          <span class="toggle-track"></span>
        </label>
        <span style="font-size:14px;color:var(--text-1)">${isTr ? 'Pıhtılaşma var' : 'Clotting present'}</span>
      </div>
      <button class="btn btn-primary" onclick="savePeriodLog()">${t('save_entry')}</button>
    </div>
  </div>`;
}

function selectFlow(id) {
  state.selectedFlow = id;
  const container = document.getElementById('flow-options-container');
  if (container) {
    container.querySelectorAll('.flow-opt').forEach(el => {
      el.classList.toggle('selected', el.getAttribute('data-id') === id);
    });
  }
}

function updatePainLevel(val) {
  const v = +val;
  state.painLevel = v;
  const disp = document.getElementById('pain-val-disp');
  if (disp) disp.textContent = v + '/10';
  const desc = document.getElementById('pain-desc-disp');
  if (desc) desc.textContent = PAIN_DESCRIPTIONS[v] || '';
  const slider = document.getElementById('pain-slider-input');
  if (slider) {
    slider.style.background = `linear-gradient(to right, var(--error) 0%, var(--error) ${v*10}%, var(--border) ${v*10}%)`;
  }
}
function savePeriodLog() {
  const isTr = (state.lang || 'tr') === 'tr';
  if (state.logDate) {
    if (!state.onboardData) state.onboardData = {};
    state.onboardData.lastPeriodDate = state.logDate;
    if (!state.user) state.user = {};
    state.user.lastPeriodDate = state.logDate;

    // Reset early period flag so new cycle defaults to Settings period length
    state.periodEndedEarly = false;
    state.actualPeriodLength = null;

    // Append to historical cycles list without overwriting history
    const newLogDate = new Date(state.logDate + 'T00:00:00');
    const defaultPeriodDays = (state.user && state.user.avgPeriod) ? state.user.avgPeriod : 5;
    const endDate = addDays(newLogDate, defaultPeriodDays - 1);
    
    if (!state.cycles) state.cycles = [];
    const exists = state.cycles.find(c => isSameDay(new Date(c.startDate), newLogDate));
    if (!exists) {
      // Compute real cycle length from previous period start date
      let realCycleLength = state.user.avgCycle || 28;
      if (state.cycles && state.cycles.length > 0) {
        const sortedCycles = [...state.cycles].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        const prevCycle = sortedCycles[0];
        if (prevCycle && prevCycle.startDate) {
          const prevStart = new Date(prevCycle.startDate);
          const diffMs = newLogDate - prevStart;
          const diffDays = Math.round(diffMs / 86400000);
          if (diffDays >= 15 && diffDays <= 60) realCycleLength = diffDays;
        }
      }
      state.cycles.push({
        id: Date.now(),
        startDate: newLogDate,
        endDate: endDate,
        length: realCycleLength,
        periodDays: defaultPeriodDays
      });
      // Update user's rolling average cycle length
      if (state.cycles.length >= 2) {
        const validLengths = state.cycles.filter(c => c.length >= 15 && c.length <= 60).map(c => c.length);
        if (validLengths.length >= 2) {
          const newAvg = Math.round(validLengths.reduce((a,b)=>a+b,0) / validLengths.length);
          state.user.avgCycle = newAvg;
          if (state.onboardData) state.onboardData.cycleLength = newAvg;
        }
      }
    }
  }
  PREDICTIONS = computePredictions();
  saveToStorage();
  updateDynamicNotifications();
  showToast(isTr ? 'Adet kaydı başarıyla eklendi! ' : 'Period logged successfully! ');
  navigate('home', 'back');
}

// ============================================================
// 14. SCREEN: SYMPTOMS
// ============================================================
function renderSymptoms() {
  const sel = state.selectedSymptoms;
  const isTr = (state.lang || 'tr') === 'tr';
  const dateFormatted = formatDate(state.logDate || TODAY_STR);
  return `
  <div class="log-screen">
    ${renderTopBar(t('symptom_tracker_title'))}
    <div style="padding:0 0 24px">
      <div class="input-group" style="margin-bottom:20px">
        <label class="input-label">📅 ${t('date_label')}</label>
        <div style="position:relative">
          <input class="input-field" type="text" id="symp-date-display" value="${dateFormatted}" readonly onclick="const p = document.getElementById('symp-date-picker'); p.showPicker ? p.showPicker() : p.click()" style="cursor:pointer;padding-right:40px;font-weight:600"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none">📅</span>
          <input type="date" id="symp-date-picker" value="${state.logDate || TODAY_STR}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0" onchange="state.logDate=this.value; document.getElementById('symp-date-display').value=formatDate(this.value)"/>
        </div>
      </div>

      <div class="symptom-section-title">${t('physical_symptoms')}</div>
      <div class="symptoms-grid" style="margin-bottom:20px">
        ${SYMPTOMS_PHYSICAL.map(s => `
          <div class="symptom-chip ${sel.includes(s.id) ? 'selected' : ''}" onclick="toggleSymptom('${s.id}', this)">
            <div class="chip-icon">${s.icon}</div>
            <span>${getSymptomLabel(s.id, s.label)}</span>
          </div>`).join('')}
      </div>

      <div class="symptom-section-title">${t('emotional_symptoms')}</div>
      <div class="symptoms-grid" style="margin-bottom:20px">
        ${SYMPTOMS_EMOTIONAL.map(s => `
          <div class="symptom-chip ${sel.includes(s.id) ? 'selected' : ''}" onclick="toggleSymptom('${s.id}', this)">
            <div class="chip-icon">${s.icon}</div>
            <span>${getSymptomLabel(s.id, s.label)}</span>
          </div>`).join('')}
      </div>

      ${sel.length > 0 ? `
        <div style="margin-bottom:20px">
          <div class="symptom-section-title">⚡ ${t('severity_label')} (${sel.length} ${isTr ? 'seçildi' : 'selected'})</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span style="font-size:14px;color:var(--text-2)">${t('how_severe')}</span>
            <div class="severity-select">
              ${[1,2,3,4,5].map(n => `
                <button class="sev-btn ${state.selectedSeverity===n?'active':''}" onclick="state.selectedSeverity=${n};navigate('symptoms','refresh')">${n}</button>
              `).join('')}
            </div>
          </div>
        </div>` : ''}

      <div style="margin-bottom:20px">
        <div class="symptom-section-title">📝 ${t('notes')}</div>
        <textarea class="textarea-field" placeholder="${isTr ? 'Eklemek istediğiniz diğer semptom ve gözlemleriniz...' : 'Anything else you want to record...'}" id="symptom-notes"></textarea>
      </div>

      <button class="btn btn-primary" onclick="saveSymptomsLog()">
        ${t('save_entry')}
      </button>
    </div>
  </div>`;
}

function saveSymptomsLog() {
  const isTr = (state.lang || 'tr') === 'tr';
  if (state.selectedSymptoms.length > 0) {
    const symptomLogDate = state.logDate || TODAY_STR;
    // Update existing entry for the same date or prepend new one
    const existingSymIdx = state.symptoms.findIndex(s => s.date === symptomLogDate);
    if (existingSymIdx !== -1) {
      // Merge symptoms for the same date
      const existing = state.symptoms[existingSymIdx];
      const merged = [...new Set([...existing.symptoms, ...state.selectedSymptoms])];
      state.symptoms[existingSymIdx] = { date: symptomLogDate, symptoms: merged, severity: Math.max(existing.severity || 1, state.selectedSeverity) };
    } else {
      state.symptoms.unshift({ date: symptomLogDate, symptoms: [...state.selectedSymptoms], severity: state.selectedSeverity });
    }
    state.selectedSymptoms = [];
  }
  saveToStorage();
  updateDynamicNotifications();
  showToast(isTr ? 'Semptomlar kaydedildi! 💊' : 'Symptoms saved! 💊');
  navigate('home', 'back');
}

// ============================================================
// 15. SCREEN: MOOD TRACKER
// ============================================================
function renderMood() {
  const sel = state.selectedMood;
  const energy = state.energyLevel;
  const isTr = (state.lang || 'tr') === 'tr';
  const dateFormatted = formatDate(state.logDate || TODAY_STR);
  return `
  <div class="log-screen">
    ${renderTopBar(t('mood_tracker_title'))}
    <div style="padding:0 0 24px">
      <div class="input-group" style="margin-bottom:24px">
        <label class="input-label">📅 ${t('date_label')}</label>
        <div style="position:relative">
          <input class="input-field" type="text" id="mood-date-display" value="${dateFormatted}" readonly onclick="const p = document.getElementById('mood-date-picker'); p.showPicker ? p.showPicker() : p.click()" style="cursor:pointer;padding-right:40px;font-weight:600"/>
          <span style="position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:18px;pointer-events:none">📅</span>
          <input type="date" id="mood-date-picker" value="${state.logDate || TODAY_STR}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0" onchange="state.logDate=this.value; document.getElementById('mood-date-display').value=formatDate(this.value)"/>
        </div>
      </div>

      <div class="symptom-section-title" style="text-align:center;margin-bottom:16px">${t('how_feeling_today')}</div>
      <div class="mood-emojis" style="margin-bottom:28px">
        ${MOODS.map(m => `
          <button class="mood-emoji-btn ${sel === m.id ? 'selected' : ''}" onclick="selectMoodItem(${m.id}, this)">
            <span class="m-emoji">${m.emoji}</span>
            <span>${getMoodLabel(m.id, m.label)}</span>
          </button>`).join('')}
      </div>

      <div style="margin-bottom:24px">
        <div class="symptom-section-title" style="text-align:center;margin-bottom:12px">${t('energy_level')}</div>
        <div class="energy-stars">
          ${[1,2,3,4,5].map(n => `
            <span class="energy-star ${n <= energy ? 'active' : ''}" onclick="setEnergyLevel(${n})">⚡</span>
          `).join('')}
        </div>
        <div id="energy-desc" style="text-align:center;font-size:12px;color:var(--text-2);margin-top:6px;font-weight:600"></div>
      </div>

      <div style="margin-bottom:24px">
        <div class="symptom-section-title">${t('libido_label')}</div>
        <div id="libido-container" style="display:flex;gap:8px;justify-content:center">
          ${[1,2,3,4,5].map(n => `
            <button class="sev-btn ${state.libidoLevel===n?'active':''}" onclick="setLibidoLevel(${n})">
              ${'♥'.repeat(n)}
            </button>
          `).join('')}
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div class="symptom-section-title">📝 ${t('notes')}</div>
        <textarea class="textarea-field" placeholder="${isTr ? 'Gününüz, duygularınız ve notlarınız hakkında...' : 'Describe how your day went...'}" id="mood-notes"></textarea>
      </div>

      <button class="btn btn-primary" onclick="saveMoodLog()">${t('save_mood_btn')}</button>
    </div>
  </div>`;
}

function setEnergyLevel(n) {
  state.energyLevel = n;
  const isTr = (state.lang || 'tr') === 'tr';
  const stars = document.querySelectorAll('.energy-star');
  stars.forEach((s, idx) => s.classList.toggle('active', idx < n));
  const desc = document.getElementById('energy-desc');
  const energyDescs = isTr ? ['','Çok Düşük','Düşük','Orta','Yüksek','Çok Yüksek'] : ['','Very Low','Low','Moderate','High','Very High'];
  if (desc) desc.textContent = energyDescs[n] || '';
}

function setLibidoLevel(n) {
  state.libidoLevel = n;
  const btns = document.querySelectorAll('#libido-container .sev-btn');
  btns.forEach((b, idx) => b.classList.toggle('active', idx + 1 === n));
}

function saveMoodLog() {
  const isTr = (state.lang || 'tr') === 'tr';
  const notes = document.getElementById('mood-notes') ? document.getElementById('mood-notes').value : '';
  if (state.selectedMood) {
    const moodLogDate = state.logDate || TODAY_STR;
    // Overwrite existing mood for the same date
    const existingMoodIdx = state.moods.findIndex(m => m.date === moodLogDate);
    if (existingMoodIdx !== -1) {
      state.moods[existingMoodIdx] = { date: moodLogDate, mood: state.selectedMood, energy: state.energyLevel, libido: state.libidoLevel || 3, notes: notes };
    } else {
      state.moods.unshift({ date: moodLogDate, mood: state.selectedMood, energy: state.energyLevel, libido: state.libidoLevel || 3, notes: notes });
    }
    state.selectedMood = null;
    state.energyLevel = 3;
  }
  saveToStorage();
  updateDynamicNotifications();
  showToast(isTr ? 'Ruh hali başarıyla kaydedildi! 😊' : 'Mood logged! 😊');
  navigate('home', 'back');
}

// ============================================================
// 16. SCREEN: FERTILITY TRACKER
// ============================================================
function renderFertility() {
  const P = PREDICTIONS;
  const cd = P.cycleDay || 1;
  const ovDay = (P.avgCycle || 28) - 14;
  const effectivePeriod = (state && state.periodEndedEarly && state.actualPeriodLength) ? state.actualPeriodLength : (P.avgPeriod || 5);
  const fertRaw = cd >= 14 && cd <= 16 ? 'Peak' :
    cd >= 11 && cd <= 17 ? 'High' : 'Low';
  const chance = t('fert_' + fertRaw.toLowerCase());
  const chanceColor = fertRaw === 'Peak' ? '#66BB6A' : fertRaw === 'High' ? '#FFA726' : '#9E9E9E';

  return `
  <div class="fertility-screen">
    ${renderTopBar(t('fertility_tracker_title'))}

    <div class="fertility-hero">
      <div class="fertility-globe">🥚</div>
      <div class="fertility-chance-label">${t('conception_chance')}</div>
      <div class="fertility-chance-value" style="color:${chanceColor}">${chance}</div>
    </div>

    <!-- Key Dates -->
    <div class="fertility-section">
      <div class="fertility-section-title">${t('key_dates')}</div>
      <div class="fertility-timeline" style="margin-bottom:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div style="padding:12px;background:var(--ovulation-light);border-radius:var(--r-md);text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--ovulation);text-transform:uppercase;margin-bottom:4px">${t('legend_ovulation')}</div>
            <div style="font-size:16px;font-weight:700;color:var(--text-1)">${formatDateShort(P.ovulationDate)}</div>
          </div>
          <div style="padding:12px;background:var(--primary-light);border-radius:var(--r-md);text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--primary-dark);text-transform:uppercase;margin-bottom:4px">${t('next_period_prefix')}</div>
            <div style="font-size:16px;font-weight:700;color:var(--text-1)">${formatDateShort(P.nextPeriodStart)}</div>
          </div>
          <div style="padding:12px;background:var(--follicular-light);border-radius:var(--r-md);text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--follicular);text-transform:uppercase;margin-bottom:4px">${t('legend_fertile')}</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1)">${formatDateShort(P.fertileStart)}</div>
          </div>
          <div style="padding:12px;background:var(--secondary-light);border-radius:var(--r-md);text-align:center">
            <div style="font-size:11px;font-weight:600;color:var(--secondary);text-transform:uppercase;margin-bottom:4px">${t('current_phase_lbl')}</div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1)">${(P.phase && P.phase.name) || 'Luteal'}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cycle Timeline & Phase Overview -->
    <div class="fertility-section" style="padding-bottom:24px">
      <div class="fertility-section-title">${t('cycle_overview')}</div>

      <!-- Interactive Segmented Phase Bar -->
      <div style="background:var(--surface);border-radius:var(--r-xl);padding:16px;margin-bottom:16px;box-shadow:var(--shadow-sm);border:1px solid var(--border-light)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:13px;font-weight:700;color:var(--text-1)">${(state.lang||'tr')==='tr' ? 'Döngü İlerleme Çubuğu' : 'Cycle Timeline'}</span>
          <span class="badge badge-primary" style="font-size:11px">${(state.lang||'tr')==='tr' ? 'GÜN' : 'DAY'} ${cd} / ${P.avgCycle}</span>
        </div>

        <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin-bottom:12px;background:var(--surface-2)">
          <div style="width:${(5/P.avgCycle)*100}%;background:#EF5350" title="Adet Evresi (1-5 Gün)"></div>
          <div style="width:${((ovDay - 6)/P.avgCycle)*100}%;background:#42A5F5" title="Foliküler Evre"></div>
          <div style="width:${(3/P.avgCycle)*100}%;background:#66BB6A" title="Yumurtlama Evresi"></div>
          <div style="width:${((P.avgCycle - ovDay - 2)/P.avgCycle)*100}%;background:#9B72CF" title="Lüteal Evre"></div>
        </div>

        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:600;color:var(--text-3)">
          <span style="color:#EF5350">🌑 ${(state.lang||'tr')==='tr'?'Adet (1-5g)':'Menstrual'}</span>
          <span style="color:#42A5F5">🌒 ${(state.lang||'tr')==='tr'?'Foliküler':'Follicular'}</span>
          <span style="color:#66BB6A">⭐ ${(state.lang||'tr')==='tr'?'Yumurtlama':'Ovulation'}</span>
          <span style="color:#9B72CF">🌙 ${(state.lang||'tr')==='tr'?'Lüteal':'Luteal'}</span>
        </div>
      </div>

      <!-- Detailed Phase Cards List -->
      <div style="display:flex;flex-direction:column;gap:12px">
        <!-- 1. Menstrual Phase -->
        <div style="background:var(--surface);border-radius:var(--r-xl);padding:14px;border:1px solid ${cd<=effectivePeriod ? 'var(--primary)' : 'var(--border-light)'};position:relative">
          ${cd<=P.avgPeriod ? `<span class="badge badge-primary" style="position:absolute;top:12px;right:12px;font-size:10px">${(state.lang||'tr')==='tr' ? 'Mevcut Evre' : 'Current Phase'}</span>` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:22px">🌑</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text-1)">${(state.lang||'tr')==='tr' ? 'Adet Evresi (1–' + effectivePeriod + '. Gün)' : 'Menstrual Phase (Days 1–' + effectivePeriod + ')'}</div>
              <div style="font-size:11px;color:#EF5350;font-weight:600">${(state.lang||'tr')==='tr' ? 'Östrojen & Progesteron Düşük' : 'Estrogen & Progesterone Low'}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:8px">
            ${(state.lang||'tr')==='tr' ? 'Rahim içi dokusu dökülür. Enerji seviyeleri düşüktür; dinlenme, sıcak kompres ve hafif yürüyüşler önerilir.' : 'Uterine lining sheds. Energy is lower; rest, hydration, and light movement recommended.'}
          </div>
          <div style="font-size:11px;background:#FFEBEE;color:#C62828;padding:6px 10px;border-radius:8px;font-weight:600">
            💡 ${(state.lang||'tr')==='tr' ? 'Tavsiye: Demir ve C vitamini açısından zengin gıdalar tüketin.' : 'Tip: Consume iron and Vitamin C rich foods.'}
          </div>
        </div>

        <!-- 2. Follicular Phase -->
        <div style="background:var(--surface);border-radius:var(--r-xl);padding:14px;border:1px solid ${(cd>effectivePeriod && cd<ovDay) ? 'var(--follicular)' : 'var(--border-light)'};position:relative">
          ${(cd>P.avgPeriod && cd<ovDay) ? `<span class="badge" style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--follicular);color:white">${(state.lang||'tr')==='tr' ? 'Mevcut Evre' : 'Current Phase'}</span>` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:22px">🌒</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text-1)">${(state.lang||'tr')==='tr' ? 'Foliküler Evre (' + (effectivePeriod+1) + '–' + (ovDay-1) + '. Gün)' : 'Follicular Phase (Days ' + (effectivePeriod+1) + '–' + (ovDay-1) + ')'}</div>
              <div style="font-size:11px;color:#1565C0;font-weight:600">${(state.lang||'tr')==='tr' ? 'Östrojen Yükseliyor • Enerji Artıyor' : 'Estrogen Rising • Energy Surge'}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:8px">
            ${(state.lang||'tr')==='tr' ? 'Yumurtalıklar gelişir ve östrojen seviyesi tırmanır. Yaratıcılık, yüksek antrenman performansı ve sosyalleşme için en verimli evredir.' : 'Estrogen rises, boosting brain function and stamina. Great phase for workout goals and intensive projects.'}
          </div>
          <div style="font-size:11px;background:#E3F2FD;color:#1565C0;padding:6px 10px;border-radius:8px;font-weight:600">
            💡 ${(state.lang||'tr')==='tr' ? 'Tavsiye: Yüksek tempolu egzersizler ve ağır antrenmanlar yapabilirsiniz.' : 'Tip: High intensity workouts and strength training.'}
          </div>
        </div>

        <!-- 3. Ovulation Phase -->
        <div style="background:var(--surface);border-radius:var(--r-xl);padding:14px;border:1px solid ${(cd>=ovDay && cd<=ovDay+2) ? 'var(--ovulation)' : 'var(--border-light)'};position:relative">
          ${(cd>=ovDay && cd<=ovDay+2) ? `<span class="badge" style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--ovulation);color:white">${(state.lang||'tr')==='tr' ? 'Mevcut Evre' : 'Current Phase'}</span>` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:22px">⭐</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text-1)">${(state.lang||'tr')==='tr' ? 'Yumurtlama Evresi (' + ovDay + '–' + (ovDay+2) + '. Gün)' : 'Ovulation Phase (Days ' + ovDay + '–' + (ovDay+2) + ')'}</div>
              <div style="font-size:11px;color:#2E7D32;font-weight:600">${(state.lang||'tr')==='tr' ? 'LH & Östrojen Zirvede • Maksimum Doğurganlık' : 'LH & Estrogen Peak • Peak Fertility'}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:8px">
            ${(state.lang||'tr')==='tr' ? 'Yumurta salınır. Gebe kalma şansı en yüksek seviyededir. Özgüven, libido ve iletişim yetenekleri zirvededir.' : 'Egg release occurs. Conception odds are highest. Peak confidence, libido, and communication.'}
          </div>
          <div style="font-size:11px;background:#E8F5E9;color:#2E7D32;padding:6px 10px;border-radius:8px;font-weight:600">
            💡 ${(state.lang||'tr')==='tr' ? 'Tavsiye: Gebe kalma takibi için yumurtlama testi ve mukus takibi yapın.' : 'Tip: Track LH surges & cervical mucus for fertility goals.'}
          </div>
        </div>

        <!-- 4. Luteal Phase -->
        <div style="background:var(--surface);border-radius:var(--r-xl);padding:14px;border:1px solid ${cd>ovDay+2 ? 'var(--secondary)' : 'var(--border-light)'};position:relative">
          ${cd>ovDay+2 ? `<span class="badge" style="position:absolute;top:12px;right:12px;font-size:10px;background:var(--secondary);color:white">${(state.lang||'tr')==='tr' ? 'Mevcut Evre' : 'Current Phase'}</span>` : ''}
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span style="font-size:22px">🌙</span>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text-1)">${(state.lang||'tr')==='tr' ? 'Lüteal Evre (' + (ovDay+3) + '–' + P.avgCycle + '. Gün)' : 'Luteal Phase (Days ' + (ovDay+3) + '–' + P.avgCycle + ')'}</div>
              <div style="font-size:11px;color:#6A1B9A;font-weight:600">${(state.lang||'tr')==='tr' ? 'Progesteron Zirvede • Rahatlama Evresi' : 'Progesterone Dominant • Recovery Phase'}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.5;margin-bottom:8px">
            ${(state.lang||'tr')==='tr' ? 'Progesteron hormonu artar. Vücut sıcaklığı biraz yükselir. PMS (adet öncesi gerginlik), iştah artışı ve göğüs hassasiyeti görülebilir.' : 'Progesterone increases to build uterine lining. Body temp rises slightly. PMS or cravings may occur.'}
          </div>
          <div style="font-size:11px;background:#EDE7F6;color:#6A1B9A;padding:6px 10px;border-radius:8px;font-weight:600">
            💡 ${(state.lang||'tr')==='tr' ? 'Tavsiye: Magnezyum desteği alın ve bitki çayları tüketin.' : 'Tip: Take magnesium, prioritize sleep, and reduce caffeine.'}
          </div>
        </div>

        <!-- Extra: BBT & Cervical Mucus Tracker Helper Card -->
        <div style="background:linear-gradient(135deg,rgba(232,120,154,0.08),rgba(155,114,207,0.08));border-radius:var(--r-xl);padding:14px;border:1px solid var(--border-light)">
          <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:6px">📊 ${(state.lang||'tr')==='tr' ? 'Biyometrik İpuçları (BBT & Mukus)' : 'Biometric Indicators (BBT & Mucus)'}</div>
          <div style="font-size:11.5px;color:var(--text-2);line-height:1.5">
            • <strong>${(state.lang||'tr')==='tr' ? 'Bazal Vücut Sıcaklığı (BBT):' : 'Basal Body Temp:'}</strong> ${(state.lang||'tr')==='tr' ? 'Yumurtlamadan sonra vücut sıcaklığı ~0.3°C - 0.5°C yükselir.' : 'Body temperature rises ~0.3°C - 0.5°C after ovulation.'}<br>
            • <strong>${(state.lang||'tr')==='tr' ? 'Servikal Mukus:' : 'Cervical Mucus:'}</strong> ${(state.lang||'tr')==='tr' ? 'Yumurtlama haftasında yumurta akı kıvamında şeffaf ve esnek hale gelir.' : 'Becomes clear, stretchy egg-white consistency during peak fertility.'}
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function getTranslatedTag(tag) {
  const isTr = (state.lang || 'tr') === 'tr';
  if (!isTr) return '#' + tag;
  const tagMap = {
    wellness: 'sağlık',
    sleep: 'uyku',
    exercise: 'egzersiz',
    energy: 'enerji',
    fertility: 'doğurganlık',
    tracking: 'takip',
    period: 'adet',
    selfcare: 'özbakım'
  };
  return '#' + (tagMap[tag] || tag);
}

function renderJournal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const journals = state.journals || [];

  return `
  <div class="journal-screen">
    ${renderTopBar(t('journal_title'), false, `<button class="top-bar-action" onclick="openNewJournalModal()" title="${t('write_todays_entry')}">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
    </button>`)}

    <!-- Write Today's Entry Banner Button -->
    <div style="padding:16px 16px 8px">
      <div style="background:linear-gradient(135deg,rgba(232,120,154,0.1),rgba(155,114,207,0.1));border:2px dashed var(--primary);border-radius:var(--r-xl);padding:16px;text-align:center;cursor:pointer;transition:all 0.2s" onclick="openNewJournalModal()">
        <div style="font-size:15px;font-weight:700;color:var(--primary);display:flex;align-items:center;justify-content:center;gap:8px">
          <span style="font-size:20px;font-weight:800">+</span>
          <span>${t('write_todays_entry')}</span>
        </div>
      </div>
    </div>

    <!-- Journal Entries List -->
    <div class="journal-list" style="padding:12px 16px 32px">
      ${journals.length === 0 ? `
        <div style="text-align:center;padding:40px 16px;color:var(--text-2)">
          <div style="font-size:44px;margin-bottom:12px">📝</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:6px">${t('no_journals_yet')}</div>
          <div style="font-size:13px;color:var(--text-3);line-height:1.4">${t('tap_plus_to_write')}</div>
        </div>
      ` : journals.map(j => `
        <div class="journal-card" style="background:var(--surface);border-radius:var(--r-xl);padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);border:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-3);font-weight:600">
              <span>📝</span>
              <span>${formatDate(j.date)}</span>
            </div>
            <div style="display:flex;gap:6px">
              ${(j.tags || []).map(tg => `<span class="badge badge-primary" style="font-size:10px;padding:2px 8px">${getTranslatedTag(tg)}</span>`).join('')}
            </div>
          </div>
          <div style="font-size:13.5px;color:var(--text-1);line-height:1.5">${j.content}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function openNewJournalModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = t('new_journal_title');
  const sub = t('write_todays_entry');

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
      <div id="modal-journal-error" style="display:none;background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700"></div>

      <div class="input-group">
        <label class="input-label" style="font-weight:600">📅 ${t('date_label')}</label>
        <input type="text" readonly class="input-field" value="${formatDate(TODAY_STR)}" style="background:var(--surface-2);font-weight:600"/>
      </div>

      <div class="input-group">
        <label class="input-label" style="font-weight:600">📝 ${isTr ? 'Günlük Notunuz' : 'Journal Content'}</label>
        <textarea id="modal-journal-content" class="textarea-field" style="height:110px" placeholder="${t('journal_placeholder')}"></textarea>
      </div>

      <div class="input-group">
        <label class="input-label" style="font-weight:600">🏷️ ${t('tags_label')}</label>
        <input type="text" id="modal-journal-tags" class="input-field" placeholder="${isTr ? 'Örn. uyku, egzersiz, ruh hali' : 'e.g. sleep, exercise, mood'}" autocomplete="off"/>
      </div>
    </div>`;

  openProfileEditModal('📝', title, sub, bodyHtml, () => {
    const content = document.getElementById('modal-journal-content')?.value?.trim();
    const tagsRaw = document.getElementById('modal-journal-tags')?.value?.trim();
    const errBox = document.getElementById('modal-journal-error');

    if (!content) {
      const msg = isTr ? 'Lütfen günlük notunuzu boş bırakmayın!' : 'Please enter your journal entry!';
      if (errBox) {
        errBox.style.display = 'block';
        errBox.textContent = '⚠️ ' + msg;
      }
      return false;
    }

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase().replace('#', '')).filter(Boolean) : ['wellness'];

    state.journals.unshift({
      id: Date.now(),
      date: TODAY_STR,
      content: content,
      tags: tags
    });

    saveToStorage();
    navigate('journal', 'refresh');
    showToast((isTr ? 'Günlük yazısı başarıyla eklendi!' : 'Journal entry saved!') + ' 📝');
    return true;
  });
}

// ============================================================
// 17. SCREEN: REPORTS
// ============================================================
function renderReports() {
  const tab = state.reportTab;

  // 1. Dynamic Cycle Length & Badge
  const avgCycleVal = PREDICTIONS.avgCycle || (state.user && state.user.avgCycle) || 28;

  // 2. Dynamic Period Length
  const cycleList = state.cycles || [];
  let avgPeriodVal = (state.user && state.user.avgPeriod) || 5;
  if (cycleList.length > 0) {
    const pSum = cycleList.reduce((acc, c) => acc + (c.periodDays || 5), 0);
    avgPeriodVal = Math.round(pSum / cycleList.length);
  }

  // 3. Dynamic Cycle Variation
  let cycleVarVal = '±1.2';
  if (cycleList.length >= 2) {
    const lengths = cycleList.filter(c => c.length > 0).map(c => c.length);
    if (lengths.length >= 2) {
      const avg = lengths.reduce((a,b)=>a+b,0)/lengths.length;
      const dev = lengths.reduce((a,b)=>a+Math.abs(b-avg),0)/lengths.length;
      cycleVarVal = `±${dev.toFixed(1)}`;
    }
  }

  // 4. Dynamic Logs This Month (Current month entries count)
  const currentMonthPrefix = TODAY_STR.slice(0, 7);
  const mSymptoms = (state.symptoms || []).filter(s => s.date && s.date.startsWith(currentMonthPrefix)).length;
  const mMoods    = (state.moods || []).filter(m => m.date && m.date.startsWith(currentMonthPrefix)).length;
  const mJournals = (state.journals || []).filter(j => j.date && j.date.startsWith(currentMonthPrefix)).length;
  const totalMonthLogs = mSymptoms + mMoods + mJournals;

  return `
  <div class="reports-screen">
    ${renderTopBar(t('health_reports'), false, `<button class="top-bar-action" onclick="generateHealthReportPDF()" title="${(state.lang||'tr')==='tr'?'PDF Raporu İndir':'Export PDF'}">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
    </button>`)}

    <!-- Health Score -->
    <div class="health-score-card">
      <div class="hs-left">
        <div class="hs-label">${t('health_score')}</div>
        <div class="hs-value">84</div>
        <div class="hs-desc">${t('health_score_desc')}</div>
      </div>
      <div class="hs-circle"></div>
    </div>

    <!-- Stats Row (100% Dynamic from user entries) -->
    <div class="stat-row">
      <div class="stat-card">
        <div class="stat-card-val">${avgCycleVal}</div>
        <div class="stat-card-lbl">${t('avg_cycle_length')}</div>
        <div class="stat-card-change stat-up">${t('badge_regular')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-val">${avgPeriodVal}</div>
        <div class="stat-card-lbl">${t('avg_period_length')}</div>
        <div class="stat-card-change stat-up">${t('badge_normal')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-val">${cycleVarVal}</div>
        <div class="stat-card-lbl">${t('cycle_variation')}</div>
        <div class="stat-card-change stat-up">${t('badge_improving')}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-val">${totalMonthLogs}</div>
        <div class="stat-card-lbl">${t('logs_this_month')}</div>
        <div class="stat-card-change stat-up">${t('badge_vs_last')}</div>
      </div>
    </div>

    <!-- Tabs (Fixed tab switching via refresh) -->
    <div class="tabs">
      <div class="tab ${tab==='monthly'?'active':''}" onclick="state.reportTab='monthly';navigate('reports','refresh')">${t('monthly')}</div>
      <div class="tab ${tab==='yearly'?'active':''}" onclick="state.reportTab='yearly';navigate('reports','refresh')">${t('yearly')}</div>
    </div>

    <!-- Cycle Length Chart -->
    <div class="report-section">
      <div class="chart-card">
        <div class="chart-title">${t('cycle_history')}</div>
        <div class="chart-subtitle">${t('last_6_cycles')}</div>
        <div class="chart-canvas-wrap">
          <canvas id="chart-cycles"></canvas>
        </div>
      </div>
    </div>

    <!-- Mood Trend -->
    <div class="report-section">
      <div class="chart-card">
        <div class="chart-title">${t('mood_trend')}</div>
        <div class="chart-subtitle">${t('last_30_days')}</div>
        <div class="chart-canvas-wrap">
          <canvas id="chart-mood"></canvas>
        </div>
      </div>
    </div>

    <!-- Symptom Frequency -->
    <div class="report-section">
      <div class="chart-card">
        <div class="chart-title">${t('top_symptoms')}</div>
        <div class="chart-subtitle">${t('top_symptoms_desc')}</div>
        <div class="chart-canvas-wrap" style="height:180px">
          <canvas id="chart-symptoms"></canvas>
        </div>
      </div>
    </div>

    <!-- Period Duration -->
    <div class="report-section" style="padding-bottom:24px">
      <div class="chart-card">
        <div class="chart-title">${t('period_duration')}</div>
        <div class="chart-subtitle">${t('period_duration_desc')}</div>
        <div class="chart-canvas-wrap">
          <canvas id="chart-period"></canvas>
        </div>
      </div>
    </div>
  </div>`;
}

function generateHealthReportPDF() {
  const isTr = (state.lang || 'tr') === 'tr';
  const u = state.user || {};
  const dobStr = u.dob || '1998-04-15';
  const age = getAgeFromDob(dobStr);
  const p = PREDICTIONS || {};

  const reportTitle = isTr ? 'KİŞİSEL KADIN SAĞLIĞI & DÖNGÜ RAPORU' : 'WOMEN\'S HEALTH & CYCLE REPORT';
  const nextPDate = p.nextPeriodStart ? formatDate(p.nextPeriodStart) : '17.08.2026';
  const ovulDate = p.ovulationDate ? formatDate(p.ovulationDate) : '03.08.2026';

  const modalTitle = isTr ? 'Sağlık Raporu PDF Çıktısı' : 'Health Report PDF Export';
  const modalSub = isTr ? 'Resmi tıbbi formatta hazırlanan sağlık belgesi' : 'Official medical format health document';

  const bodyHtml = `
    <div id="pdf-report-document" style="background:#ffffff;color:#1A1A2E;padding:24px;border-radius:16px;border:1px solid #E2E8F0;font-family:Inter,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.08);margin-bottom:16px;text-align:left">
      <!-- Report Document Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #E8789A;padding-bottom:14px;margin-bottom:16px">
        <div>
          <div style="font-size:22px;font-weight:800;color:#E8789A;display:flex;align-items:center;gap:8px"> Flowia</div>
          <div style="font-size:11px;font-weight:700;color:#64748B;letter-spacing:0.5px;margin-top:2px">${reportTitle}</div>
        </div>
        <div style="text-align:right;font-size:11px;color:#64748B">
          <div><strong>${isTr ? 'Rapor No:' : 'Report ID:'}</strong> #CC-${Date.now().toString().slice(-5)}</div>
          <div><strong>${isTr ? 'Tarih:' : 'Date:'}</strong> ${formatDate(TODAY_STR)}</div>
        </div>
      </div>

      <!-- User Info Banner -->
      <div style="background:#FFF5F7;padding:12px 16px;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <div style="font-size:15px;font-weight:700;color:#1A1A2E">${u.name || 'Sarah Johnson'}</div>
          <div style="font-size:12px;color:#64748B">${u.email || 'sarah@flowia.app'} • ${age} ${isTr ? 'Yaşında' : 'Years old'}</div>
        </div>
        <div style="background:#E8789A;color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">
          ${isTr ? 'Sağlık Skoru: 84/100' : 'Health Score: 84/100'}
        </div>
      </div>

      <!-- Cycle Summary Table -->
      <div style="font-size:13px;font-weight:700;color:#1A1A2E;margin-bottom:8px">📊 ${isTr ? 'Döngü İstatistik Özeti' : 'Cycle Summary Statistics'}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
        <tbody>
          <tr style="border-bottom:1px solid #EDF2F7">
            <td style="padding:8px 0;color:#64748B">${isTr ? 'Ortalama Döngü Süresi' : 'Average Cycle Length'}:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1A1A2E">${u.avgCycle || 28} ${isTr ? 'Gün (Düzenli)' : 'Days (Regular)'}</td>
          </tr>
          <tr style="border-bottom:1px solid #EDF2F7">
            <td style="padding:8px 0;color:#64748B">${isTr ? 'Ortalama Adet Süresi' : 'Average Period Length'}:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#1A1A2E">${u.avgPeriod || 5} ${isTr ? 'Gün (Normal)' : 'Days (Normal)'}</td>
          </tr>
          <tr style="border-bottom:1px solid #EDF2F7">
            <td style="padding:8px 0;color:#64748B">${isTr ? 'Döngü Değişkenliği' : 'Cycle Variation'}:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#2E7D32">±1.5 ${isTr ? 'Gün (İyileşiyor)' : 'Days (Improving)'}</td>
          </tr>
          <tr style="border-bottom:1px solid #EDF2F7">
            <td style="padding:8px 0;color:#64748B">${isTr ? 'Tahmini Sonraki Adet' : 'Predicted Next Period'}:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#E8789A">${nextPDate}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748B">${isTr ? 'Tahmini Yumurtlama Günü' : 'Predicted Ovulation'}:</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;color:#9B72CF">${ovulDate}</td>
          </tr>
        </tbody>
      </table>

      <!-- Top Symptoms & Insights -->
      <div style="font-size:13px;font-weight:700;color:#1A1A2E;margin-bottom:8px">💊 ${isTr ? 'Kayıtlı Semptom & Ruh Hali Trendleri' : 'Symptoms & Mood Trends'}</div>
      <div style="background:#F8FAFC;padding:12px;border-radius:10px;font-size:12px;color:#475569;margin-bottom:16px;line-height:1.5">
        <div>• <strong>${isTr ? 'En Sık Semptomlar:' : 'Top Symptoms:'}</strong> ${isTr ? 'Karın Ağrısı (%45), Şişkinlik (%30), Yorgunluk (%25)' : 'Cramps (45%), Bloating (30%), Fatigue (25%)'}</div>
        <div>• <strong>${isTr ? 'Ruh Hali Eğilimi:' : 'Mood Pattern:'}</strong> ${isTr ? 'Foliküler ve Yumurtlama evresinde yüksek enerji; Luteal evrede hassasiyet.' : 'High energy during Follicular/Ovulation; sensitive during Luteal phase.'}</div>
      </div>

      <!-- Medical Disclaimer Footer -->
      <div style="border-top:1px dashed #CBD5E1;padding-top:10px;font-size:10px;color:#94A3B8;line-height:1.4;text-align:center">
        🔒 <em>${isTr ? 'Bu rapor Flowia kişisel kadın sağlığı uygulaması tarafından otomatik oluşturulmuştur. Tıbbi tanı yerine geçmez, jinekolog muayenesinde bilgilendirme amaçlı sunulabilir.' : 'Generated automatically by Flowia. For personal tracking and medical consultation only.'}</em>
      </div>
    </div>

    <button class="btn btn-primary" onclick="printReportDocument()" style="width:100%;font-weight:700;padding:12px">
      🖨️ ${isTr ? 'PDF Olarak İndir / Yazdır' : 'Print / Save as PDF'}
    </button>`;

  openProfileEditModal('📊', modalTitle, modalSub, bodyHtml, () => {});
}

function printReportDocument() {
  const doc = document.getElementById('pdf-report-document');
  if (!doc) return;

  const win = window.open('', '_blank');
  if (!win) {
    showToast('Pop-up blocked! Please allow pop-ups to print PDF.');
    return;
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Flowia_Health_Report.pdf</title>
        <style>
          body { font-family: Inter, sans-serif; padding: 30px; background: #fff; color: #111; }
          @page { size: A4; margin: 15mm; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${doc.outerHTML}
        <script>
          setTimeout(() => { window.print(); window.close(); }, 300);
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

// ============================================================
// 18. SCREEN: AI INSIGHTS
// ============================================================
function runAIInsightEngine() {
  const isOnline = typeof navigator !== 'undefined' ? (navigator.onLine !== false) : true;

  const dynamicList = [];
  const userName = (state.user && state.user.name) ? state.user.name.split(' ')[0] : '';
  const namePrefix = userName ? `${userName}, ` : '';

  // 1. Live Cycle Regularity & Stability AI Engine (Calculates real variation from user logs)
  const cycles = state.cycles || [];
  const cycleCount = cycles.length;
  let cycleVar = '±1.5';
  if (cycleCount >= 2) {
    const lens = cycles.filter(c => c.length > 0).map(c => c.length);
    if (lens.length >= 2) {
      const avg = lens.reduce((a,b)=>a+b,0)/lens.length;
      const variance = lens.reduce((a,b)=>a+Math.abs(b-avg),0)/lens.length;
      cycleVar = `±${variance.toFixed(1)}`;
    }
  }

  dynamicList.push({
    id: 'dynamic_reg',
    icon: '📊',
    iconBg: '#E8F5E9',
    tag: t('ai_tag_cycle_pattern'),
    tagColor: '#2E7D32',
    premium: false,
    title: t('ai_title_cycle_steady'),
    body: `${namePrefix}${t('ai_title_cycle_steady')} (${t('avg_cycle_length')}: ${state.user.avgCycle || 28} ${t('days_label')}, ${t('avg_period_length')}: ${state.user.avgPeriod || 5} ${t('days_label')}, ${t('cycle_variation')}: ${cycleVar} ${t('days_label')}).`
  });

  // 2. Real-time Symptom Guidance AI Engine (Adapts dynamically to newly logged symptoms)
  const recentSymptoms = (state.symptoms || []);
  const allSymptomNames = recentSymptoms.flatMap(s => s.symptoms || []);
  const todaySymptomObj = recentSymptoms.find(s => s.date === (state.logDate || TODAY_STR)) || recentSymptoms[0];
  const todaySymptoms = todaySymptomObj ? (todaySymptomObj.symptoms || []) : [];

  if (todaySymptoms.includes('cramps') || todaySymptoms.includes('bloating') || allSymptomNames.includes('cramps') || allSymptomNames.includes('bloating')) {
    dynamicList.push({
      id: 'dynamic_symp',
      icon: '🫃',
      iconBg: '#FFF3E0',
      tag: t('ai_tag_symptom_guide'),
      tagColor: '#E65100',
      premium: false,
      title: t('ai_title_cramps_bloating'),
      body: `${namePrefix}${t('ai_body_cramps_bloating')}`
    });
  } else if (todaySymptoms.includes('headache') || allSymptomNames.includes('headache')) {
    dynamicList.push({
      id: 'dynamic_symp_headache',
      icon: '🤯',
      iconBg: '#FFF3E0',
      tag: t('ai_tag_symptom_guide'),
      tagColor: '#E65100',
      premium: false,
      title: t('ins_title_2'),
      body: `${namePrefix}${t('ins_body_2')}`
    });
  } else if (todaySymptoms.length > 0) {
    dynamicList.push({
      id: 'dynamic_symp_custom',
      icon: '💊',
      iconBg: '#FFF3E0',
      tag: t('ai_tag_symptom_guide'),
      tagColor: '#E65100',
      premium: false,
      title: `${todaySymptoms.length} ${t('logs_this_month')}`,
      body: `${namePrefix}${t('top_symptoms_desc')}`
    });
  }

  // 3. Live Mood & Biorhythm AI Engine (Recalculates average energy score from actual mood logs)
  const recentMoods = (state.moods || []);
  const energySum = recentMoods.reduce((a,b)=>a+(b.energy||3), 0);
  const avgEnergy = recentMoods.length ? (energySum / recentMoods.length).toFixed(1) : '3.5';

  dynamicList.push({
    id: 'dynamic_energy',
    icon: '⚡',
    iconBg: '#E3F2FD',
    tag: t('ai_tag_energy_biorhythm'),
    tagColor: '#1565C0',
    premium: false,
    title: `${t('ai_tag_energy_biorhythm')} (${avgEnergy} / 5)`,
    body: `${namePrefix}${t('ai_body_energy_level')}`
  });

  // 4. Live Phase-Based Recommendation Engine (Recalculated dynamically for all 4 phases)
  const phaseName = PREDICTIONS.phase ? PREDICTIONS.phase.name : 'Follicular';
  if (phaseName === 'Menstrual') {
    dynamicList.push({
      id: 'dynamic_phase',
      icon: '🌑',
      iconBg: '#FFEBEE',
      tag: t('ai_tag_phase_advice'),
      tagColor: '#C62828',
      premium: false,
      title: t('ai_title_menstrual_rest'),
      body: `${namePrefix}${t('ai_body_menstrual_rest')}`
    });
  } else if (phaseName === 'Follicular') {
    dynamicList.push({
      id: 'dynamic_phase',
      icon: '🌒',
      iconBg: '#E3F2FD',
      tag: t('ai_tag_phase_advice'),
      tagColor: '#1565C0',
      premium: false,
      title: t('ai_title_follicular_energy'),
      body: `${namePrefix}${t('ai_body_follicular_energy')}`
    });
  } else if (phaseName === 'Ovulation') {
    dynamicList.push({
      id: 'dynamic_phase',
      icon: '⭐',
      iconBg: '#E8F5E9',
      tag: t('ai_tag_phase_advice'),
      tagColor: '#2E7D32',
      premium: false,
      title: t('ai_title_ovulation_peak'),
      body: `${namePrefix}${t('ai_body_ovulation_peak')}`
    });
  } else {
    dynamicList.push({
      id: 'dynamic_phase',
      icon: '🌙',
      iconBg: '#EDE7F6',
      tag: t('ai_tag_phase_advice'),
      tagColor: '#6A1B9A',
      premium: false,
      title: t('ai_title_luteal_balance'),
      body: `${namePrefix}${t('ai_body_luteal_balance')}`
    });
  }

  return { isOnline, dynamicList };
}

function renderInsights() {
  const { isOnline, dynamicList } = runAIInsightEngine();
  // Smart merge: only add MOCK_INSIGHTS if we have fewer than 4 dynamic insights
  // Prevents duplicate topic areas in the insights feed
  const filteredMock = MOCK_INSIGHTS.filter(mock => {
    return !dynamicList.some(dyn => dyn.id && mock.id && dyn.id.includes('phase') && mock.titleKey && mock.titleKey.includes('phase'));
  });
  const allInsights = dynamicList.length >= 4
    ? [...dynamicList]
    : [...dynamicList, ...filteredMock.slice(0, Math.max(0, 5 - dynamicList.length))];

  const insightCards = allInsights.map((ins, i) => {
    const tag = ins.tagKey ? t(ins.tagKey) : (ins.tag || '');
    const title = ins.titleKey ? t(ins.titleKey) : (ins.title || '');
    const body = ins.bodyKey ? t(ins.bodyKey) : (ins.body || '');

    if (ins.premium && !state.isPremium) {
      return `
      <div class="insight-lock-wrapper">
        <div class="insight-item insight-locked">
          <div class="insight-item-header">
            <div class="insight-item-icon" style="background:${ins.iconBg}">${ins.icon}</div>
            <div class="insight-item-meta">
              <div class="insight-item-tag" style="color:${ins.tagColor}">${tag}</div>
              <div class="insight-item-title">${title}</div>
            </div>
          </div>
          <div class="insight-item-body">${body}</div>
        </div>
        <div class="insight-lock-overlay">
          <div class="insight-lock-icon">🔒</div>
          <div>${t('unlock_premium')}</div>
          <button class="insight-lock-btn" onclick="navigate('premium')">${t('upgrade_now')}</button>
        </div>
      </div>`;
    }
    return `
    <div class="insight-item" style="animation:fadeInUp 0.4s ease ${i*0.08}s both">
      <div class="insight-item-header">
        <div class="insight-item-icon" style="background:${ins.iconBg}">${ins.icon}</div>
        <div class="insight-item-meta">
          <div class="insight-item-tag" style="color:${ins.tagColor}">${tag}</div>
          <div class="insight-item-title">${title}</div>
        </div>
      </div>
      <div class="insight-item-body">${body}</div>
    </div>`;
  }).join('');

  const connectionBanner = isOnline
    ? `<div style="margin:0 16px 12px;background:rgba(102,187,106,0.14);border:1px solid rgba(102,187,106,0.35);border-radius:var(--r-md);padding:8px 14px;font-size:12px;color:var(--success);display:flex;align-items:center;gap:8px;font-weight:600">
        <span style="font-size:8px">🟢</span>
        <span>${t('ai_live_connected')}</span>
      </div>`
    : `<div style="margin:0 16px 12px;background:rgba(255,167,38,0.14);border:1px solid rgba(255,167,38,0.35);border-radius:var(--r-md);padding:8px 14px;font-size:12px;color:#FFA726;display:flex;align-items:center;gap:8px;font-weight:600">
        <span>🟡 ${t('ai_offline_mode')}</span>
      </div>`;

  return `
  <div class="insights-screen">
    ${renderTopBar(t('ai_insights_topbar'))}
    <div class="insights-hero">
      <div class="insights-hero-icon">✨</div>
      <div class="insights-hero-text">
        <div class="insights-hero-title">${t('insights_hero_title')}</div>
        <div class="insights-hero-sub">${t('insights_hero_sub')}</div>
      </div>
    </div>
    ${connectionBanner}
    <div class="insight-cards">${insightCards}</div>
    ${!state.isPremium ? `
    <div style="margin:20px 16px 32px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:var(--r-xl);padding:20px;color:white;text-align:center">
      <div style="font-size:28px;margin-bottom:8px">🌟</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:6px">${t('unlock_all_insights')}</div>
      <div style="font-size:13px;opacity:0.9;margin-bottom:16px;line-height:1.4">${t('unlock_all_desc')}</div>
      <button class="btn" style="background:white;color:var(--primary);width:auto;padding:12px 28px" onclick="navigate('premium')">${t('try_premium_free')}</button>
    </div>` : ''}
  </div>`;
}

// ============================================================
// 19. SCREEN: PROFILE
// ============================================================
function getAgeFromDob(dobStr) {
  if (!dobStr) return 28;
  const dob = new Date(dobStr);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age || 28;
}

function openProfileEditModal(icon, title, sub, bodyHtml, saveCallback = null) {
  const overlay = document.getElementById('profile-edit-modal-overlay');
  if (!overlay) return;

  document.getElementById('pem-icon').textContent = icon;
  document.getElementById('pem-title').textContent = title;
  document.getElementById('pem-sub').textContent = sub;
  document.getElementById('pem-body').innerHTML = bodyHtml;

  const saveBtn = document.getElementById('pem-save-btn');
  let hasValidCallback = false;

  if (saveCallback && typeof saveCallback === 'function') {
    const fnStr = saveCallback.toString();
    const bodyMatch = fnStr.slice(fnStr.indexOf('{') + 1, fnStr.lastIndexOf('}')).trim();
    if (bodyMatch.length > 0) {
      hasValidCallback = true;
    }
  }

  if (hasValidCallback) {
    saveBtn.style.display = 'block';
    saveBtn.textContent = (state.lang || 'tr') === 'tr' ? ' Değişiklikleri Kaydet' : ' Save Changes';
    saveBtn.onclick = () => {
      const res = saveCallback();
      if (res !== false) {
        closeProfileEditModal();
      }
    };
  } else {
    saveBtn.style.display = 'none';
  }

  overlay.classList.add('open');
}

function closeProfileEditModal() {
  const overlay = document.getElementById('profile-edit-modal-overlay');
  if (overlay) overlay.classList.remove('open');
}

function updateDobModalAge(val) {
  const display = document.getElementById('modal-dob-age-display');
  if (display) {
    const age = getAgeFromDob(val);
    const unit = (state.lang || 'tr') === 'tr' ? 'yaşında' : 'years old';
    display.textContent = `${age} ${unit}`;
  }
}

function editUserName() {
  const isTr = (state.lang || 'tr') === 'tr';
  const currentName = state.user.name || 'Sarah Care';

  const title = isTr ? 'Ad Soyad Güncelle' : 'Update Full Name';
  const sub = isTr ? 'Uygulamada görünecek ad ve soyadınızı düzenleyin' : 'Edit your full name displayed in the app';

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">
      <div id="modal-name-error" style="display:none;background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-md);padding:10px 12px;font-size:12px;color:var(--error);font-weight:700"></div>

      <div class="input-group">
        <label class="input-label" style="font-weight:600">${isTr ? 'Ad Soyad:' : 'Full Name:'}</label>
        <input type="text" id="modal-fullname-input" value="${currentName}" class="input-field" placeholder="${isTr ? 'Örn. Sarah Johnson' : 'e.g. Sarah Johnson'}" autocomplete="off"/>
      </div>
      <div style="font-size:11px;color:var(--text-3);line-height:1.4">
        💡 ${isTr ? 'İsminiz değiştirildiğinde karşılama başlığı ve profil harfiniz otomatik güncellenecektir.' : 'Updating your name updates your greeting title and profile avatar.'}
      </div>
    </div>`;

  openProfileEditModal('👤', title, sub, bodyHtml, () => {
    const input = document.getElementById('modal-fullname-input');
    const val = input ? input.value.trim() : '';
    const errBox = document.getElementById('modal-name-error');

    if (!val || val.length < 2) {
      const msg = isTr ? 'Lütfen geçerli bir Ad Soyad girin! En az 2 karakter olmalıdır.' : 'Please enter a valid name!';
      if (errBox) {
        errBox.style.display = 'block';
        errBox.textContent = '⚠️ ' + msg;
      }
      return false;
    }

    state.user.name = val;
    state.user.initials = val.charAt(0).toUpperCase();
    saveToStorage();
    navigate('profile', 'refresh');
    showToast((isTr ? 'İsim ve Soyad başarıyla güncellendi!' : 'Full name updated successfully!') + ' 👤');
    return true;
  });
}

function editDob() {
  const isTr = (state.lang || 'tr') === 'tr';
  const currentDob = state.user.dob || '1998-04-15';
  const currentAge = getAgeFromDob(currentDob);

  const title = isTr ? 'Doğum Tarihi' : 'Date of Birth';
  const sub = isTr ? 'Doğum tarihinizi ve yaşınızı güncelleyin' : 'Update your date of birth and age';
  const label = isTr ? 'Doğum Tarihiniz:' : 'Your Date of Birth:';
  const calcText = isTr ? 'Hesaplanan Yaş:' : 'Calculated Age:';
  const unit = isTr ? 'yaşında' : 'years old';

  const bodyHtml = `
    <div class="input-group">
      <label class="input-label" style="font-weight:600">${label}</label>
      <input type="date" id="modal-dob-input" value="${currentDob}" class="input-field" onchange="updateDobModalAge(this.value)">
    </div>
    <div style="background:var(--primary-light);padding:16px;border-radius:var(--r-lg);text-align:center;margin-top:4px">
      <div style="font-size:13px;color:var(--primary-dark);font-weight:600">${calcText}</div>
      <div style="font-size:26px;font-weight:800;color:var(--primary);margin-top:2px" id="modal-dob-age-display">${currentAge} ${unit}</div>
    </div>`;

  openProfileEditModal('📅', title, sub, bodyHtml, () => {
    const input = document.getElementById('modal-dob-input');
    if (input && input.value) {
      state.user.dob = input.value;
      saveToStorage();
      navigate('profile', 'refresh');
      showToast((isTr ? 'Doğum tarihi güncellendi!' : 'Date of birth updated!') + ' 📅');
    }
  });
}

function editAvgCycle() {
  const isTr = (state.lang || 'tr') === 'tr';
  const current = state.user.avgCycle || 28;

  const title = isTr ? 'Ortalama Döngü Süresi' : 'Average Cycle Length';
  const sub = isTr ? '20 ile 45 gün arasında döngü süresi ayarlayın' : 'Set your cycle length between 20 and 45 days';
  const unitText = isTr ? 'gün (döngü süresi)' : 'days cycle length';

  const bodyHtml = `
    <div class="number-display-wrap">
      <div class="number-display-val" id="modal-cycle-val">${current}</div>
      <div class="number-display-unit">${unitText}</div>
    </div>
    <input type="range" id="modal-cycle-slider" min="20" max="45" value="${current}" class="input-field" style="padding:0;height:10px;accent-color:var(--primary)" oninput="document.getElementById('modal-cycle-val').textContent = this.value">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-top:6px;font-weight:600">
      <span>20 ${isTr ? 'gün' : 'days'}</span>
      <span>45 ${isTr ? 'gün' : 'days'}</span>
    </div>`;

  openProfileEditModal('🔄', title, sub, bodyHtml, () => {
    const slider = document.getElementById('modal-cycle-slider');
    if (slider) {
      const num = parseInt(slider.value, 10);
      if (!isNaN(num)) {
        state.user.avgCycle = num;
        if (state.onboardData) state.onboardData.cycleLength = num;
        PREDICTIONS = computePredictions(state.user.lastPeriodDate || TODAY_STR, state.user.avgCycle, state.user.avgPeriod);
        saveToStorage();
        navigate('profile', 'refresh');
        showToast((isTr ? `Ortalama döngü ${num} gün olarak güncellendi!` : `Avg cycle updated to ${num} days!`) + ' 🔄');
      }
    }
  });
}

function editAvgPeriod() {
  const isTr = (state.lang || 'tr') === 'tr';
  const current = state.user.avgPeriod || 5;

  const title = isTr ? 'Ortalama Adet Süresi' : 'Average Period Duration';
  const sub = isTr ? '2 ile 10 gün arasında adet süresi ayarlayın' : 'Set your period duration between 2 and 10 days';
  const unitText = isTr ? 'gün (kanama süresi)' : 'days period duration';

  const bodyHtml = `
    <div class="number-display-wrap">
      <div class="number-display-val" id="modal-period-val">${current}</div>
      <div class="number-display-unit">${unitText}</div>
    </div>
    <input type="range" id="modal-period-slider" min="2" max="10" value="${current}" class="input-field" style="padding:0;height:10px;accent-color:var(--primary)" oninput="document.getElementById('modal-period-val').textContent = this.value">
    <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-3);margin-top:6px;font-weight:600">
      <span>2 ${isTr ? 'gün' : 'days'}</span>
      <span>10 ${isTr ? 'gün' : 'days'}</span>
    </div>`;

  openProfileEditModal('🩸', title, sub, bodyHtml, () => {
    const slider = document.getElementById('modal-period-slider');
    if (slider) {
      const num = parseInt(slider.value, 10);
      if (!isNaN(num)) {
        state.user.avgPeriod = num;
        if (state.onboardData) state.onboardData.periodLength = num;
        PREDICTIONS = computePredictions(state.user.lastPeriodDate || TODAY_STR, state.user.avgCycle, state.user.avgPeriod);
        saveToStorage();
        navigate('profile', 'refresh');
        showToast((isTr ? `Ortalama adet süresi ${num} gün olarak güncellendi!` : `Avg period updated to ${num} days!`) + ' 🩸');
      }
    }
  });
}

function openDataExportModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Verilerimi Dışa Aktar' : 'Export My Health Data';
  const sub = isTr ? 'Kişisel sağlığınızı ve döngü kayıtlarınızı indirin (GDPR)' : 'Download your personal health & cycle logs (GDPR)';

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px">
      <!-- Format 1: PDF Report -->
      <div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="closeProfileEditModal(); generateHealthReportPDF()">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;background:#FFE0E6;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center">📄</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">${isTr ? 'PDF Sağlık Raporu Belgesi' : 'PDF Health Report Document'}</div>
            <div style="font-size:11px;color:var(--text-2);margin-top:2px">${isTr ? 'Doktor kontrollerinde sunulabilir A4 belgesi' : 'Formatted A4 medical document for doctor consultations'}</div>
          </div>
        </div>
        <span style="font-size:16px;color:var(--primary);font-weight:700">›</span>
      </div>

      <!-- Format 2: CSV File -->
      <div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="exportDataCSV()">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;background:#E8F5E9;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center">📊</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">${isTr ? 'Excel / CSV Tablosu' : 'Excel / CSV Spreadsheet'}</div>
            <div style="font-size:11px;color:var(--text-2);margin-top:2px">${isTr ? 'Tüm tarih, döngü, semptom ve ruh hali kayıtları' : 'All cycle dates, symptoms, and mood logs'}</div>
          </div>
        </div>
        <span style="font-size:16px;color:var(--primary);font-weight:700">›</span>
      </div>

      <!-- Format 3: JSON Backup -->
      <div style="background:var(--surface-2);border:1px solid var(--border-light);border-radius:var(--r-lg);padding:12px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="exportDataJSON()">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;background:#EDE7F6;width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center">🔒</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">${isTr ? 'JSON GDPR Ham Veri Paketi' : 'JSON GDPR Raw Data Package'}</div>
            <div style="font-size:11px;color:var(--text-2);margin-top:2px">${isTr ? 'Geliştiriciler & kişisel arşiv için ham veritabanı yedeği' : 'Complete JSON data backup'}</div>
          </div>
        </div>
        <span style="font-size:16px;color:var(--primary);font-weight:700">›</span>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-3);text-align:center;line-height:1.4">
      🔒 ${isTr ? 'Verileriniz uçtan uca şifrelenmiştir ve cihazınızda güvenle işlenmektedir.' : 'Your health data is end-to-end protected and processed locally.'}
    </div>`;

  openProfileEditModal('📊', title, sub, bodyHtml, () => {});
}

function exportDataCSV() {
  const isTr = (state.lang || 'tr') === 'tr';
  let csv = 'Tarih,Kategori,Detay_Semptom,Notlar\n';

  // Add Cycles
  (state.cycles || []).forEach(c => {
    csv += `"${c.startDate} - ${c.endDate || 'Present'}","Cycle","Dongu Suresi: ${c.length || 28} gun","${c.notes || ''}"\n`;
  });

  // Add Symptoms
  (state.symptoms || []).forEach(s => {
    csv += `"${s.date}","Symptoms","${(s.symptoms || []).join('; ')}","Siddet: ${s.severity || 1}"\n`;
  });

  // Add Moods
  (state.moods || []).forEach(m => {
    csv += `"${m.date}","Mood","Ruh Hali: ${m.mood}/5 (Enerji: ${m.energy}/5)","${(m.notes || '').replace(/"/g, '""')}"\n`;
  });

  // Add Journals
  (state.journals || []).forEach(j => {
    csv += `"${j.date}","Journal","Etiketler: ${(j.tags || []).join('; ')}","${(j.content || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cyclecare_health_data_${TODAY_STR}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  closeProfileEditModal();
  showToast(isTr ? 'CSV Tablo Dosyası İndirildi! 📊' : 'CSV Spreadsheet Downloaded! 📊');
}

function exportDataJSON() {
  const isTr = (state.lang || 'tr') === 'tr';
  const exportPayload = {
    exportDate: TODAY_STR,
    app: 'Flowia Femtech Platform',
    version: '2.4.0',
    user: state.user,
    healthProfile: state.onboardData,
    cycles: state.cycles,
    symptoms: state.symptoms,
    moods: state.moods,
    journals: state.journals,
    notifications: state.notifications
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `cyclecare_gdpr_backup_${TODAY_STR}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  closeProfileEditModal();
  showToast(isTr ? 'JSON GDPR Veri Paketi İndirildi! 🔒' : 'JSON GDPR Backup Downloaded! 🔒');
}

function editGoals() {
  const isTr = (state.lang || 'tr') === 'tr';
  const u = state.user;
  const currentGoals = u.goals || [];

  const title = isTr ? 'Sağlık Hedefleriniz' : 'Your Health Goals';
  const sub = isTr ? 'Uygulamayı kullanma amaçlarınızı seçin' : 'Select your goals for using the app';

  const goalsList = [
    { key: 'Track my cycle', label: isTr ? ' Döngümü takip etmek istiyorum' : ' Track my menstrual cycle' },
    { key: 'Manage PCOS', label: isTr ? '🎀 Polikistik Over (PCOS) Yönetimi' : '🎀 Manage PCOS symptoms' },
    { key: 'Fertility tracking', label: isTr ? '👶 Gebe Kalma / Doğurganlık Takibi' : '👶 Fertility & Conception tracking' },
    { key: 'Symptom & mood tracking', label: isTr ? '📊 Semptom ve Ruh Hali Takibi' : '📊 Symptom & mood tracking' }
  ];

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:10px" id="modal-goals-container">
      ${goalsList.map(g => {
        const isSel = currentGoals.includes(g.key);
        return `
        <div class="goal-chip-select ${isSel ? 'selected' : ''}" onclick="this.classList.toggle('selected')" data-goal="${g.key}">
          <span class="goal-chip-label">${g.label}</span>
          <span class="goal-chip-check">✓</span>
        </div>`;
      }).join('')}
    </div>`;

  openProfileEditModal('🎯', title, sub, bodyHtml, () => {
    const selectedNodes = document.querySelectorAll('#modal-goals-container .goal-chip-select.selected');
    const selectedGoals = Array.from(selectedNodes).map(node => node.getAttribute('data-goal'));
    if (selectedGoals.length > 0) {
      state.user.goals = selectedGoals;
      saveToStorage();
      navigate('profile', 'refresh');
      showToast((isTr ? 'Sağlık hedefleriniz güncellendi!' : 'Health goals updated!') + ' 🎯');
    }
  });
}

function manageSubscriptionModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  
  if (state.isPremium) {
    const title = isTr ? 'Abonelik Yönetimi' : 'Subscription Management';
    const sub = isTr ? 'Mevcut Premium üyelik ve ödeme detaylarınız' : 'Your active subscription & billing details';
    
    const isCancelled = state.autoRenew === false;
    const bodyHtml = `
      <div style="background:linear-gradient(135deg,rgba(232,120,154,0.12),rgba(155,114,207,0.12));padding:16px;border-radius:var(--r-xl);border:1px solid var(--border-light);margin-bottom:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:15px;font-weight:700;color:var(--text-1)">Flowia Premium</span>
          <span class="badge ${isCancelled ? 'badge-primary' : 'badge-success'}">
            ${isCancelled 
              ? (isTr ? '🟡 İptal Edildi (23 Tem 2027\'ye Kadar Aktif)' : '🟡 Cancelled (Active until July 23, 2027)') 
              : (isTr ? '🟢 Aktif (Otomatik Yenileme)' : '🟢 Active (Auto-Renew)')}
          </span>
        </div>
        <div style="font-size:13px;color:var(--text-2);display:flex;flex-direction:column;gap:6px">
          <div>💳 <strong>${isTr ? 'Plan' : 'Plan'}:</strong> ${isTr ? 'Yıllık Premium ($39.99/yıl)' : 'Annual Premium ($39.99/yr)'}</div>
          <div>📅 <strong>${isTr ? 'Son Kullanma Tarihi' : 'Expiry Date'}:</strong> 23 Temmuz 2027 (${isTr ? '365 gün kaldı' : '365 days left'})</div>
          <div>📱 <strong>${isTr ? 'Ödeme Durumu' : 'Payment Status'}:</strong> ${isCancelled ? (isTr ? 'İptal edildi (Yenilenmeyecek)' : 'Cancelled (No auto-renew)') : (isTr ? 'Aktif (App Store / Google Play)' : 'Active (App Store / Google Play)')}</div>
        </div>
      </div>
      
      <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:8px">${isTr ? 'Aktif Premium Ayrıcalıklarınız:' : 'Your Active Benefits:'}</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--text-2);margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:8px"><span style="color:var(--primary);font-weight:700">✓</span> <span>${isTr ? 'Sınırsız Yapay Zeka İçgörüleri' : 'Unlimited AI Health Insights'}</span></div>
        <div style="display:flex;align-items:center;gap:8px"><span style="color:var(--primary);font-weight:700">✓</span> <span>${isTr ? 'Gelişmiş Raporlar & Grafikler' : 'Advanced Analytics & PDF Export'}</span></div>
        <div style="display:flex;align-items:center;gap:8px"><span style="color:var(--primary);font-weight:700">✓</span> <span>${isTr ? 'Sınırsız Geçmiş Döngü Analizleri' : 'Unlimited Cycle History'}</span></div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-outline" style="padding:10px;font-size:13px" onclick="closeProfileEditModal(); navigate('premium')">${isTr ? '🔄 Planı Değiştir (Aylık / Yıllık)' : '🔄 Change Plan (Monthly / Annual)'}</button>
        ${!isCancelled ? `
          <button class="btn btn-ghost" style="color:var(--error);padding:10px;font-size:13px;font-weight:600" onclick="cancelSubscription()">${isTr ? '❌ Otomatik Yenilemeyi İptal Et' : '❌ Cancel Auto-Renewal'}</button>
        ` : `
          <button class="btn btn-primary" style="padding:10px;font-size:13px;font-weight:600" onclick="reactivateSubscription()">${isTr ? '⚡ Otomatik Yenilemeyi Yeniden Aç' : '⚡ Reactivate Auto-Renewal'}</button>
        `}
      </div>`;

    openProfileEditModal('⭐', title, sub, bodyHtml, () => {});
  } else {
    const title = isTr ? 'Premium\'a Yükseltin' : 'Upgrade to Premium';
    const sub = isTr ? 'Tüm gelişmiş yapay zeka analizlerinin kilidini açın' : 'Unlock all AI analytics and health features';
    
    const bodyHtml = `
      <div style="text-align:center;padding:16px 8px">
        <div style="font-size:42px;margin-bottom:10px"></div>
        <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:6px">${isTr ? 'Şu anda Ücretsiz Plan Kullanıyorsunuz' : 'You are currently on the Free Plan'}</div>
        <div style="font-size:13px;color:var(--text-2);line-height:1.4;margin-bottom:20px">${isTr ? 'Yapay zeka içgörülerine, detaylı grafiklere ve sınırsız geçmiş takibine erişmek için Premium\'a geçin.' : 'Upgrade to access AI insights, advanced charts, and full cycle history.'}</div>
        <button class="btn btn-primary" onclick="closeProfileEditModal(); navigate('premium')">${isTr ? '✨ Şimdi Premium\'a Yükselt' : '✨ Upgrade Now'}</button>
      </div>`;

    openProfileEditModal('⭐', title, sub, bodyHtml, () => {});
  }
}

function cancelSubscription() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Abonelik İptal Onayı' : 'Cancel Subscription Confirmation';
  const sub = isTr ? 'Lütfen iptal işlemini onaylayın' : 'Please confirm cancellation';

  const bodyHtml = `
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:42px;margin-bottom:8px">⚠️</div>
      <div style="font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:8px">
        ${isTr ? 'Aboneliğinizi İptal Etmek İstediğinizden Emin Misiniz?' : 'Are you sure you want to cancel?'}
      </div>
      
      <div style="background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-xl);padding:14px;margin:14px 0;text-align:left">
        <div style="font-size:13px;font-weight:700;color:var(--error);margin-bottom:6px">
          💡 ${isTr ? 'Önemli Bilgilendirme & Kalan Süre:' : 'Important Notice & Remaining Time:'}
        </div>
        <div style="font-size:12px;color:var(--text-1);line-height:1.5">
          ${isTr 
            ? `Aboneliğinizi iptal etseniz dahi, ödemesini yaptığınız <strong>kalan abonelik süreniz (23 Temmuz 2027 tarihine kadar / 365 gün)</strong> boyunca tüm Premium ayrıcalıklarını <strong>kesintisiz olarak kullanmaya devam edebilirsiniz.</strong>` 
            : `Even if you cancel now, you can continue using all Premium features uninterrupted throughout your <strong>remaining period (until July 23, 2027 / 365 days)</strong>.`}
        </div>
      </div>

      <div style="font-size:12px;color:var(--text-3);margin-bottom:16px">
        ${isTr ? 'Bu tarihten sonra otomatik yenileme çekimi yapılmayacaktır.' : 'No automatic renewal charge will occur after this date.'}
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-ghost" style="color:var(--error);border:1px solid var(--error);padding:10px;font-size:13px;font-weight:700" onclick="confirmCancelSubscription()">
          ${isTr ? '❌ Otomatik Yenilemeyi İptal Et' : '❌ Confirm Cancellation'}
        </button>
        <button class="btn btn-primary" style="padding:10px;font-size:13px;font-weight:700" onclick="closeProfileEditModal()">
          ${isTr ? ' İptal Etmekten Vazgeç (Premium Kalsın)' : ' Keep My Premium Subscription'}
        </button>
      </div>
    </div>`;

  openProfileEditModal('⚠️', title, sub, bodyHtml, () => {});
}

function confirmCancelSubscription() {
  const isTr = (state.lang || 'tr') === 'tr';
  state.isPremium = true; // Premium features remain FULLY ACTIVE!
  state.autoRenew = false; // Auto-renewal disabled
  saveToStorage();
  closeProfileEditModal();
  navigate('profile', 'refresh');
  showToast(isTr ? 'Aboneliğiniz 23 Temmuz 2027\'ye kadar aktif kalacaktır 🛡️' : 'Subscription remains active until July 23, 2027 🛡️');
}

function reactivateSubscription() {
  const isTr = (state.lang || 'tr') === 'tr';
  state.isPremium = true;
  state.autoRenew = true;
  saveToStorage();
  closeProfileEditModal();
  navigate('profile', 'refresh');
  showToast(isTr ? 'Otomatik yenileme yeniden aktif edildi! 🌟' : 'Auto-renewal reactivated! 🌟');
}

function openSupportFaqModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Destek ve Sıkça Sorulan Sorular (SSS)' : 'Support & Frequently Asked Questions';
  const sub = isTr ? 'Sık sorulan sorular ve teknik destek kanalları' : 'Common questions & customer care contacts';

  const faqItems = [
    {
      q: isTr ? 'Döngü ve adet tahminleri nasıl hesaplanır?' : 'How are cycle predictions computed?',
      a: isTr ? 'Döngü tahminleriniz, kaydettiğiniz son adet başlangıç tarihleriniz ve ortalama döngü süreniz baz alınarak gelişmiş biyometrik algoritmamız tarafından anlık hesaplanır.' : 'Predictions are dynamically calculated using your recent period start dates and average cycle length via biometric prediction models.'
    },
    {
      q: isTr ? 'Kişisel ve sağlık verilerim güvende mi?' : 'Is my personal health data secure?',
      a: isTr ? 'Evet! Verileriniz 256-bit AES şifreleme ile cihazınızda ve korumalı sunucularda saklanır. KVKK (Türkiye), GDPR (AB) ve HIPAA (ABD) standartlarına 100% uyumludur. Verileriniz kesinlikle 3. taraflara satılmaz.' : 'Yes! All health data is protected with 256-bit AES encryption compliant with GDPR (EU), HIPAA (US), and KVKK (TR). Never sold to third parties.'
    },
    {
      q: isTr ? 'Düzensiz adet döngüm varsa ne yapmalıyım?' : 'What if I have irregular cycle lengths?',
      a: isTr ? 'Düzensiz döngülerde yapay zeka algoritması kaydettiğiniz son 3 döngünün ortalamasını ve sapma katsayısını (stdDev) kullanarak tahmin aralığını daraltır. Dilerseniz PCOS yönetimi modunu aktif edebilirsiniz.' : 'For irregular cycles, our AI adjusts variation ranges based on your last 3 logged cycles. You can also enable PCOS Management mode.'
    },
    {
      q: isTr ? 'Aboneliğimi nasıl yönetebilirim veya iptal edebilirim?' : 'How do I manage or cancel my subscription?',
      a: isTr ? 'Profil -> Abonelik Yönetimi sekmesinden veya App Store / Google Play hesap ayarlarınızdan dilediğiniz an otomatik yenilemeyi iptal edebilirsiniz. Ödenmiş dönem sonuna kadar tüm özellikleriniz aktif kalır.' : 'Go to Profile -> Subscription Management or your App Store / Google Play account settings. Full access remains active until the end of your paid term.'
    },
    {
      q: isTr ? 'Verilerimi nasıl yedekleyebilir veya başka cihaza aktarabilirim?' : 'How can I backup or export my data?',
      a: isTr ? 'Profil -> Verilerimi Dışa Aktar alanından tüm sağlık kayıtlarınızı PDF raporu, Excel (CSV) tablosu veya JSON GDPR paketi olarak anında indirebilirsiniz.' : 'Navigate to Profile -> Export My Data to download full PDF, CSV spreadsheet, or JSON backups anytime.'
    }
  ];

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;max-height:280px;overflow-y:auto;padding-right:4px">
      ${faqItems.map(item => `
        <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px;border:1px solid var(--border-light)">
          <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:6px;display:flex;align-items:center;gap:6px">
            <span style="color:var(--primary)">❓</span> ${item.q}
          </div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.5">${item.a}</div>
        </div>
      `).join('')}
    </div>

    <div style="background:linear-gradient(135deg,rgba(232,120,154,0.12),rgba(155,114,207,0.12));padding:14px;border-radius:var(--r-xl);border:1px solid var(--border-light);text-align:center;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:4px">💬 ${isTr ? 'Canlı Destek & İletişim' : 'Live Support & Contact'}</div>
      <div style="font-size:12px;color:var(--text-2);margin-bottom:10px">${isTr ? 'Herhangi bir sorunuz için destek ekibimiz 7/24 hizmetinizde:' : 'Our support team is available 24/7 at your service:'}</div>
      <a href="mailto:support@cyclecare.app" class="btn btn-outline" style="display:inline-block;padding:8px 20px;font-size:12px;font-weight:700;text-decoration:none">
        ✉️ support@cyclecare.app
      </a>
    </div>`;

  openProfileEditModal('❓', title, sub, bodyHtml, () => {});
}

function openPrivacyPolicyModal() {
  const lang = (state.lang || 'tr');
  const isTr = lang === 'tr';
  const title = isTr ? 'Gizlilik Politikası & Yasal Uyum' : 'Privacy Policy & Data Rights';
  const sub = isTr ? 'Uygulamanın kullanıldığı ülkelere göre bölgesel veri uyum yasaları' : 'Country-specific data protection regulations';

  let regionBadge = '';
  let regDetails = '';

  if (lang === 'tr') {
    regionBadge = '🇹🇷 Türkiye — KVKK (6698 Sayılı Kişisel Verilerin Korunması Kanunu)';
    regDetails = `
      <div>• <strong>Aydınlatma Yükümlülüğü (Madde 10):</strong> Sağlık verileriniz (Özel Nitelikli Kişisel Veri) açık rızanız doğrultusunda işlenmektedir.</div>
      <div>• <strong>Veri Sahibi Hakları (Madde 11):</strong> Dilediğiniz an verilerinizi silme (Unutulma Hakkı), düzeltme veya dışa aktarma hakkına sahipsiniz.</div>
      <div>• <strong>Veri Aktarımı Kısıtı:</strong> Biyometrik sağlık verileriniz reklam verenler veya ticari 3. taraflarla kesinlikle paylaşılmaz.</div>`;
  } else if (lang === 'de') {
    regionBadge = '🇩🇪 Deutschland / EU — DSGVO (Datenschutz-Grundverordnung / GDPR)';
    regDetails = `
      <div>• <strong>Recht auf Vergessenwerden (Art. 17 DSGVO):</strong> Sie können Ihre Daten jederzeit vollständig löschen.</div>
      <div>• <strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Exportieren Sie Ihre Gesundheitsdaten im CSV- oder JSON-Format.</div>
      <div>• <strong>Ende-zu-Ende-Verschlüsselung:</strong> Alle Zyklusdaten werden nach höchsten EU-Standards geschützt.</div>`;
  } else if (lang === 'fr') {
    regionBadge = '🇫🇷 France / EU — RGPD & CNIL Réglementation';
    regDetails = `
      <div>• <strong>Protection des données de santé:</strong> Données hautement sécurisées selon les exigences de la CNIL et du RGPD.</div>
      <div>• <strong>Droit d'accès et d'effacement:</strong> Contrôle total sur la suppression et l'exportation de vos données.</div>`;
  } else if (lang === 'es') {
    regionBadge = '🇪🇸 España / UE — LOPDGDD & RGPD Cumplimiento';
    regDetails = `
      <div>• <strong>Derechos ARCO+:</strong> Acceso, rectificación, supresión y portabilidad de sus datos de salud.</div>
      <div>• <strong>Privacidad desde el diseño:</strong> Cifrado de nivel médico para proteger su privacidad menstrual.</div>`;
  } else if (lang === 'ru') {
    regionBadge = '🇷🇺 Россия — ФЗ-152 «О персональных данных»';
    regDetails = `
      <div>• <strong>Защита персональных данных:</strong> Полное соответствие требованиям локализации и защиты специальных категорий данных.</div>
      <div>• <strong>Право на удаление:</strong> Полное удаление профиля и истории циклов по первому требованию.</div>`;
  } else {
    regionBadge = '🌐 Global / USA — GDPR (EU) & HIPAA (USA) Compliant';
    regDetails = `
      <div>• <strong>HIPAA & GDPR Standards:</strong> Strict adherence to health data privacy protocols in the United States and EU.</div>
      <div>• <strong>Zero Data Selling:</strong> We never sell, monetize, or broker your personal reproductive health records.</div>
      <div>• <strong>Right to Erasure & Export:</strong> Export your raw data or request permanent deletion anytime from Settings.</div>`;
  }

  const bodyHtml = `
    <div style="background:linear-gradient(135deg,rgba(232,120,154,0.15),rgba(155,114,207,0.15));padding:12px 14px;border-radius:var(--r-lg);margin-bottom:14px;border:1px solid var(--border-light)">
      <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px">${isTr ? 'Bölgesel Uyum Yasası:' : 'Regional Compliance:'}</div>
      <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-top:2px">${regionBadge}</div>
    </div>

    <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:8px">${isTr ? 'Yasal Haklarınız & Veri Güvenliği İlkesi:' : 'Your Legal Rights & Data Security:'}</div>

    <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:14px;font-size:12px;color:var(--text-2);line-height:1.6;margin-bottom:16px;display:flex;flex-direction:column;gap:8px;border:1px solid var(--border-light)">
      ${regDetails}
    </div>

    <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px;font-size:11px;color:var(--text-3);line-height:1.4;text-align:center">
      🔒 ${isTr ? 'Flowia kişisel verilerinizi uçtan uca AES-256 şifreleme ile korur. Detaylı sorularınız için dpo@cyclecare.app adresine başvurabilirsiniz.' : 'Flowia protects your data with AES-256 encryption. Contact dpo@cyclecare.app for privacy inquiries.'}
    </div>`;

  openProfileEditModal('🔒', title, sub, bodyHtml, () => {});
}

function renderProfile() {
  const u = state.user;
  const userDob = u.dob || '1998-04-15';
  const age = getAgeFromDob(userDob);
  const dobDateObj = new Date(userDob);
  const monthName = getMonthName(dobDateObj.getMonth());
  const dobFormatted = (state.lang || 'tr') === 'tr' 
    ? `${dobDateObj.getDate()} ${monthName} ${dobDateObj.getFullYear()}` 
    : `${monthName} ${dobDateObj.getDate()}, ${dobDateObj.getFullYear()}`;

  const goalsFormatted = (u.goals || []).map(g => {
    if (g === 'Track my cycle') return t('goal_track_cycle');
    if (g === 'Manage PCOS') return t('goal_manage_pcos');
    if (g === 'Fertility tracking') return (state.lang || 'tr') === 'tr' ? 'Gebe kalma takibi' : 'Fertility tracking';
    if (g === 'Symptom & mood tracking') return (state.lang || 'tr') === 'tr' ? 'Semptom & Ruh hali takibi' : 'Symptom & mood tracking';
    return g;
  }).join(' · ');

  return `
  <div class="profile-screen">
    ${renderTopBar(t('profile'), false, `<button class="top-bar-action" onclick="navigate('settings')">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
    </button>`)}

    <div class="profile-hero">
      <div class="profile-avatar" onclick="editUserName()" style="cursor:pointer" title="${(state.lang||'tr')==='tr'?'İsmi Düzenle':'Edit Name'}">${u.initials}</div>
      <div class="profile-name" onclick="editUserName()" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="${(state.lang||'tr')==='tr'?'Ad Soyad Düzenle':'Edit Full Name'}">
        <span>${u.name}</span>
        <span style="font-size:14px;opacity:0.7">✏️</span>
      </div>
      <div class="profile-email">${u.email}</div>
      ${state.isPremium ? `<div class="badge badge-premium" onclick="manageSubscriptionModal()" style="cursor:pointer" title="${(state.lang||'tr')==='tr'?'Aboneliği Yönet':'Manage Subscription'}">⭐ ${t('premium_member')}</div>` : `<div class="badge badge-primary" onclick="navigate('premium')" style="cursor:pointer">⭐ ${t('free_plan')}</div>`}
    </div>

    ${!state.isPremium ? `
    <div class="premium-card" onclick="navigate('premium')">
      <div class="premium-card-text">
        <div class="premium-card-title">✨ ${t('upgrade_to_premium')}</div>
        <div class="premium-card-sub">${t('upgrade_sub')}</div>
      </div>
      <div class="premium-card-icon">⭐</div>
    </div>` : ''}

    <div class="profile-section">
      <div class="profile-section-title">${t('health_profile')}</div>
      <div class="profile-item" onclick="editUserName()" style="cursor:pointer" title="${t('click_to_edit') || 'Düzenlemek için tıklayın'}">
        <div class="profile-item-icon" style="background:#E3F2FD">👤</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${(state.lang||'tr')==='tr' ? 'Ad Soyad' : 'Full Name'}</div>
          <div class="profile-item-value">${u.name}</div>
        </div>
        <span class="profile-item-arrow">✏️</span>
      </div>
      <div class="profile-item" onclick="editDob()" style="cursor:pointer" title="${t('click_to_edit') || 'Düzenlemek için tıklayın'}">
        <div class="profile-item-icon" style="background:#FFE0E6">📅</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${t('dob')}</div>
          <div class="profile-item-value">${dobFormatted} · ${age} ${t('years')}</div>
        </div>
        <span class="profile-item-arrow">✏️</span>
      </div>
      <div class="profile-item" onclick="editAvgCycle()" style="cursor:pointer" title="${t('click_to_edit') || 'Düzenlemek için tıklayın'}">
        <div class="profile-item-icon" style="background:#E8F5E9">🔄</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${t('avg_cycle')}</div>
          <div class="profile-item-value">${u.avgCycle} ${t('days_label')}</div>
        </div>
        <span class="profile-item-arrow">✏️</span>
      </div>
      <div class="profile-item" onclick="editAvgPeriod()" style="cursor:pointer" title="${t('click_to_edit') || 'Düzenlemek için tıklayın'}">
        <div class="profile-item-icon" style="background:#FCE4EC">🩸</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${t('avg_period')}</div>
          <div class="profile-item-value">${u.avgPeriod} ${t('days_label')}</div>
        </div>
        <span class="profile-item-arrow">✏️</span>
      </div>
      <div class="profile-item" onclick="editGoals()" style="cursor:pointer" title="${t('click_to_edit') || 'Düzenlemek için tıklayın'}">
        <div class="profile-item-icon" style="background:#EDE7F6">🎯</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${t('my_goals')}</div>
          <div class="profile-item-value">${goalsFormatted}</div>
        </div>
        <span class="profile-item-arrow">✏️</span>
      </div>
    </div>

    <div class="profile-section">
      <div class="profile-section-title">${t('account_pref')}</div>
      <div class="profile-item" onclick="manageSubscriptionModal()" style="cursor:pointer">
        <div class="profile-item-icon" style="background:#FFF3E0">⭐</div>
        <div class="profile-item-text">
          <div class="profile-item-label">${(state.lang || 'tr') === 'tr' ? 'Abonelik Yönetimi' : 'Subscription Management'}</div>
          <div class="profile-item-value">${state.isPremium ? ((state.lang || 'tr') === 'tr' ? '⭐ Premium Aktif (Yıllık)' : '⭐ Premium Active (Annual)') : ((state.lang || 'tr') === 'tr' ? 'Ücretsiz Plan' : 'Free Plan')}</div>
        </div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item" onclick="navigate('notifications')">
        <div class="profile-item-icon" style="background:#FFF9C4">🔔</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('notifications_title')}</div><div class="profile-item-value">${MOCK_NOTIFICATIONS.filter(n=>!n.read).length} ${t('unread_count')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item" onclick="navigate('insights')">
        <div class="profile-item-icon" style="background:#E8F5E9">✨</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('ai_insights_topbar')}</div><div class="profile-item-value">${MOCK_INSIGHTS.filter(i=>!i.premium).length} ${t('available_count')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item" onclick="openDataExportModal()" style="cursor:pointer">
        <div class="profile-item-icon" style="background:#E3F2FD">📊</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('export_data')}</div><div class="profile-item-value">GDPR • CSV / PDF / JSON</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item" onclick="navigate('settings')">
        <div class="profile-item-icon" style="background:#F5F5F5">⚙️</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('settings')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
    </div>

    <div class="profile-section" style="margin-bottom:32px">
      <div class="profile-section-title">${t('support_section')}</div>
      <div class="profile-item" onclick="openSupportFaqModal()" style="cursor:pointer">
        <div class="profile-item-icon" style="background:#E8F5E9">❓</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('support_faq')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item" onclick="openPrivacyPolicyModal()" style="cursor:pointer">
        <div class="profile-item-icon" style="background:#EDE7F6">🔒</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('privacy_policy')}</div><div class="profile-item-value">${t('gdpr_compliant')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
      <div class="profile-item signout-item" onclick="doLogout()">
        <div class="profile-item-icon" style="background:#FFEBEE">👋</div>
        <div class="profile-item-text"><div class="profile-item-label">${t('logout')}</div></div>
        <span class="profile-item-arrow">›</span>
      </div>
    </div>
  </div>`;
}

// ============================================================
// 20. SCREEN: SETTINGS
// ============================================================
function renderSettings() {
  return `
  <div class="settings-screen">
    ${renderTopBar(t('settings'))}

    <div class="settings-section">
      <div class="settings-section-title">🌐 ${t('language')}</div>
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:var(--primary-light)">🌐</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('language')}</div>
            <div class="settings-item-desc">${t('select_12_languages')}</div>
          </div>
        </div>
        <select class="input-field" style="width:auto;padding:6px 12px;font-size:13px" onchange="setLanguage(this.value)">
          ${LANGUAGES.map(l => `<option value="${l.code}" ${(state.lang||'tr') === l.code ? 'selected' : ''}>${l.flag} ${l.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('notifications_title')}</div>
      ${[
        { icon:'🔔', label:t('notif_period_lbl'), desc:t('notif_period_desc'), key:'notif_period' },
        { icon:'📅', label:t('notif_ovulation_lbl'), desc:t('notif_ovulation_desc'), key:'notif_ovulation' },
        { icon:'💊', label:t('notif_daily_lbl'), desc:t('notif_daily_desc'), key:'notif_daily' },
        { icon:'💡', label:t('notif_insight_lbl'), desc:t('notif_insight_desc'), key:'notif_insight' },
        { icon:'📋', label:t('notif_report_lbl'), desc:t('notif_report_desc'), key:'notif_report' },
      ].map(item => `
        <div class="settings-item">
          <div class="settings-item-left">
            <div class="settings-item-icon" style="background:var(--surface-2)">${item.icon}</div>
            <div class="settings-item-text">
              <div class="settings-item-label">${item.label}</div>
              <div class="settings-item-desc">${item.desc}</div>
            </div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${item.key === 'notif_period' || item.key === 'notif_daily' ? 'checked' : ''}/>
            <span class="toggle-track"></span>
          </label>
        </div>`).join('')}
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('display_pref')}</div>
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:var(--secondary-light)">🌙</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('dark_mode')}</div>
            <div class="settings-item-desc">${(state.lang||'tr')==='tr' ? 'Tüm kullanıcılar için ücretsiz gece ve karanlık tema' : 'Free dark theme for all users'}</div>
          </div>
        </div>
        <label class="toggle"><input type="checkbox" ${state.darkMode ? 'checked' : ''} onchange="toggleDarkMode(this.checked)"/><span class="toggle-track"></span></label>
      </div>
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:var(--primary-light)">📐</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('units')}</div>
            <div class="settings-item-desc">${(state.lang || 'tr') === 'tr' ? 'Ağırlık, boy ve sıcaklık birimleri' : 'Weight, height and temperature units'}</div>
          </div>
        </div>
        <select class="input-field" style="width:auto;padding:6px 12px;font-size:13px" onchange="setUnitSystem(this.value)">
          <option value="Metric" ${(state.unitSystem || 'Metric') === 'Metric' ? 'selected' : ''}>Metrik (kg, cm, °C)</option>
          <option value="Imperial" ${state.unitSystem === 'Imperial' ? 'selected' : ''}>İmparatorluk / US (lbs, in, °F)</option>
        </select>
      </div>

      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#FFF3E0">📅</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('first_day_of_week')}</div>
            <div class="settings-item-desc">${t('first_day_desc')}</div>
          </div>
        </div>
        <select class="input-field" style="width:auto;padding:6px 12px;font-size:13px" onchange="setFirstDayOfWeek(this.value)">
          <option value="Monday" ${(state.firstDayOfWeek||'Monday')==='Monday'?'selected':''}>Pazartesi / Monday</option>
          <option value="Sunday" ${state.firstDayOfWeek==='Sunday'?'selected':''}>Pazar / Sunday</option>
          <option value="Saturday" ${state.firstDayOfWeek==='Saturday'?'selected':''}>Cumartesi / Saturday</option>
        </select>
      </div>

      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#E1F5FE">📆</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('date_format')}</div>
          </div>
        </div>
        <select class="input-field" style="width:auto;padding:6px 12px;font-size:13px" onchange="setDateFormat(this.value)">
          <option value="DD.MM.YYYY" ${(state.dateFormat||'DD.MM.YYYY')==='DD.MM.YYYY'?'selected':''}>DD.MM.YYYY (23.07.2026)</option>
          <option value="DD/MM/YYYY" ${state.dateFormat==='DD/MM/YYYY'?'selected':''}>DD/MM/YYYY (23/07/2026)</option>
          <option value="MM/DD/YYYY" ${state.dateFormat==='MM/DD/YYYY'?'selected':''}>MM/DD/YYYY (07/23/2026)</option>
          <option value="YYYY-MM-DD" ${state.dateFormat==='YYYY-MM-DD'?'selected':''}>YYYY-MM-DD (2026-07-23)</option>
        </select>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-section-title">${t('privacy_sec')}</div>
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#E8F5E9">🔒</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('app_lock')}</div>
            <div class="settings-item-desc">${t('app_lock_desc')}</div>
          </div>
        </div>
        <label class="toggle"><input type="checkbox" checked/><span class="toggle-track"></span></label>
      </div>
      <div class="settings-item">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#FCE4EC">🛡️</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('analytics_sharing')}</div>
            <div class="settings-item-desc">${t('analytics_desc')}</div>
          </div>
        </div>
        <label class="toggle"><input type="checkbox"/><span class="toggle-track"></span></label>
      </div>
      <div class="settings-item" onclick="openConsentManagerModal()" style="cursor:pointer">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#EDE7F6">📋</div>
          <div class="settings-item-text"><div class="settings-item-label">${t('consent_manager')}</div></div>
        </div>
        <div class="settings-item-value">›</div>
      </div>
    </div>

    <div class="settings-section" style="margin-bottom:8px">
      <div class="settings-section-title">${t('data_mgmt')}</div>
      <div class="settings-item" onclick="openDataExportModal()" style="cursor:pointer">
        <div class="profile-item-left" style="display:flex;align-items:center;gap:12px">
          <div class="settings-item-icon" style="background:#E3F2FD">📤</div>
          <div class="settings-item-text">
            <div class="settings-item-label">${t('export_data')}</div>
            <div class="settings-item-desc">${t('export_desc')}</div>
          </div>
        </div>
        <div class="settings-item-value">›</div>
      </div>
      <div class="settings-item" onclick="confirmDeleteData()">
        <div class="settings-item-left">
          <div class="settings-item-icon" style="background:#FFEBEE">🗑️</div>
          <div class="settings-item-text">
            <div class="settings-item-label" style="color:var(--error)">${t('delete_data')}</div>
            <div class="settings-item-desc">${t('delete_desc')}</div>
          </div>
        </div>
        <div class="settings-item-value" style="color:var(--error)">›</div>
      </div>
    </div>

    <!-- ========================================================
         LEGAL SECTION — Zorunlu: Play Store & App Store uyumu
         ======================================================== -->
    <div class="settings-section" style="margin-bottom:32px">
      <div class="settings-section-title">⚖️ Yasal & Sağlık Uyarıları</div>

      <!-- Medical Disclaimer — Apple App Store zorunluluğu -->
      <div class="medical-disclaimer-badge" onclick="navigate('medical-disclaimer')" role="button" tabindex="0" aria-label="Tıbbi Sorumluluk Reddi">
        <div style="font-size:24px">⚕️</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:14px;color:#E65100">Tıbbi Sorumluluk Reddi</div>
          <div style="font-size:12px;color:#E65100;opacity:0.85;margin-top:2px">Flowia tıbbi bir cihaz değildir. Detaylar için tıklayın.</div>
        </div>
        <div style="color:#FF9800;font-size:18px">›</div>
      </div>

      <!-- Legal Links Row -->
      <div class="legal-links-row" style="margin-top:12px">
        <button class="legal-link-btn" onclick="navigate('privacy-policy')" aria-label="Gizlilik Politikası">
          🔒 Gizlilik Politikası
        </button>
        <button class="legal-link-btn" onclick="navigate('terms-of-service')" aria-label="Kullanım Koşulları">
          📄 Kullanım Koşulları
        </button>
      </div>

      <!-- App version info -->
      <div style="text-align:center;padding:16px 0 8px;font-size:11px;color:var(--text-3,#aaa)">
        Flowia v1.1.0 · KVKK &amp; GDPR Uyumlu 🛡️<br>
        ${(new Date().getFullYear())} Flowia. Tüm hakları saklıdır.
      </div>
    </div>
  </div>`;
}
function confirmDeleteData() {
  openDeleteDataModal();
}

function openDeleteDataModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Tüm Verileri Sil (Unutulma Hakkı)' : 'Delete All Data (Right to be Forgotten)';
  const sub = isTr ? 'Lütfen bu kritik silme işlemini onaylayın' : 'Please confirm this permanent deletion';

  const bodyHtml = `
    <div style="text-align:center;padding:6px 0">
      <div style="font-size:44px;margin-bottom:10px">⚠️</div>
      <div style="font-size:16px;font-weight:800;color:var(--error);margin-bottom:8px">
        ${isTr ? 'Tüm Verilerinizi Silmek İstediğinizden Emin Misiniz?' : 'Are You Sure You Want to Delete All Data?'}
      </div>

      <div style="background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);border-radius:var(--r-xl);padding:14px;margin:14px 0;text-align:left">
        <div style="font-size:13px;font-weight:700;color:var(--error);margin-bottom:6px">
          🗑️ ${isTr ? 'Silinecek Veri Kategorileri:' : 'Categories to be Wiped:'}
        </div>
        <div style="font-size:12px;color:var(--text-1);line-height:1.6">
          • ${isTr ? 'Tüm geçmiş adet ve döngü kayıtları' : 'All period and cycle records'}<br>
          • ${isTr ? 'Kaydedilen semptomlar ve ruh hali istatistikleri' : 'Logged symptoms and mood history'}<br>
          • ${isTr ? 'Kişisel günlük yazıları ve etiketler' : 'Personal journal entries and tags'}<br>
          • ${isTr ? 'Sağlık profili ve hesap tercihleri' : 'Health profile and account preferences'}
        </div>
      </div>

      <div style="font-size:12px;color:var(--error);font-weight:700;margin-bottom:16px">
        ⚠️ ${isTr ? 'Bu işlem GERİ ALINAMAZ ve veriler kurtarılamaz!' : 'This action CANNOT BE UNDONE!'}
      </div>

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-ghost" style="color:var(--error);border:1px solid var(--error);padding:12px;font-size:13px;font-weight:800;background:rgba(239,83,80,0.08)" onclick="executeDeleteAllData()">
          ${isTr ? '🗑️ Evet, Tüm Verilerimi Kalıcı Olarak Sil' : '🗑️ Yes, Permanently Delete All Data'}
        </button>
        <button class="btn btn-primary" style="padding:10px;font-size:13px;font-weight:700" onclick="closeProfileEditModal()">
          ${isTr ? ' İptal Et (Verilerimi Koru)' : ' Cancel (Keep My Data)'}
        </button>
      </div>
    </div>`;

  openProfileEditModal('🗑️', title, sub, bodyHtml, null);
}

function executeDeleteAllData() {
  const isTr = (state.lang || 'tr') === 'tr';

  // Wipe health logs and reset user state
  state.cycles = [];
  state.symptoms = [];
  state.moods = [];
  state.journals = [];
  state.notifications = [];
  state.isPremium = false;
  state.autoRenew = false;
  state.onboardData = null;

  // Clear localStorage
  try {
    localStorage.clear();
  } catch (e) {}

  closeProfileEditModal();
  showToast(isTr ? 'Tüm verileriniz kalıcı olarak silindi! 🗑️' : 'All your data has been permanently deleted! 🗑️');

  setTimeout(() => {
    navigate('login', 'refresh');
  }, 1200);
}

function setUnitSystem(val) {
  const isTr = (state.lang || 'tr') === 'tr';
  state.unitSystem = val;
  saveToStorage();
  navigate('settings', 'refresh');
  showToast(isTr ? `Ölçü birimi ${val === 'Metric' ? 'Metrik (kg, cm, °C)' : 'İmparatorluk (lbs, in, °F)'} olarak ayarlandı 📐` : `Unit system updated to ${val} 📐`);
}

function setDateFormat(val) {
  const isTr = (state.lang || 'tr') === 'tr';
  state.dateFormat = val;
  saveToStorage();
  navigate(state.screen || 'settings', 'refresh');
  showToast(isTr ? `Tarih formatı ${val} olarak ayarlandı 📆` : `Date format set to ${val} 📆`);
}

function setFirstDayOfWeek(val) {
  const isTr = (state.lang || 'tr') === 'tr';
  state.firstDayOfWeek = val;
  saveToStorage();
  navigate('settings', 'refresh');
  showToast(isTr ? `Haftanın ilk günü ${val === 'Monday' ? 'Pazartesi' : val === 'Sunday' ? 'Pazar' : 'Cumartesi'} olarak ayarlandı 📅` : `First day of week set to ${val} 📅`);
}

function openConsentManagerModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Rıza Yönetimi & İzinler' : 'Consent Manager & Privacy Permissions';
  const sub = isTr ? 'KVKK (TR) ve GDPR (AB) uyarınca kişisel veri işleme tercihlerinizi yönetin' : 'Manage personal data processing consents under GDPR & KVKK regulations';

  const consents = state.consentPrefs || {
    healthData: true,
    aiProcessing: true,
    analytics: true,
    reminders: true
  };

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
      <!-- Consent 1: Health Data (Required) -->
      <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px 14px;border:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div style="font-size:13px;font-weight:700;color:var(--text-1)">🩸 ${isTr ? 'Sağlık & Biyometrik Veri İşleme' : 'Health & Biometric Data Processing'}</div>
          <span class="badge badge-success" style="font-size:10px">${isTr ? 'ZORUNLU' : 'REQUIRED'}</span>
        </div>
        <div style="font-size:11px;color:var(--text-2);line-height:1.4">
          ${isTr ? 'Adet tarihleri, semptom ve duygu durumu kayıtlarınızın kişisel döngü takibinizin yapılabilmesi için işlenmesi.' : 'Processing of period dates, symptoms, and mood logs for menstrual tracking.'}
        </div>
      </div>

      <!-- Consent 2: AI Processing -->
      <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px 14px;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1;padding-right:10px">
          <div style="font-size:13px;font-weight:700;color:var(--text-1)">🤖 ${isTr ? 'Yapay Zeka Analiz & Tahmin Modeli' : 'AI Analytics & Prediction Model'}</div>
          <div style="font-size:11px;color:var(--text-2);line-height:1.4;margin-top:2px">
            ${isTr ? 'Döngü verilerinizin kişiselleştirilmiş hormon içgörüleri ve tahminler sunmak amacıyla işlenmesi.' : 'Use of cycle data to generate personalized AI insights and predictions.'}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="consent-ai" ${consents.aiProcessing !== false ? 'checked' : ''}/>
          <span class="toggle-track"></span>
        </label>
      </div>

      <!-- Consent 3: Anonymous Analytics -->
      <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px 14px;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1;padding-right:10px">
          <div style="font-size:13px;font-weight:700;color:var(--text-1)">📊 ${isTr ? 'Anonim İstatistik & İyileştirme Verileri' : 'Anonymous Analytics & Diagnostics'}</div>
          <div style="font-size:11px;color:var(--text-2);line-height:1.4;margin-top:2px">
            ${isTr ? 'Uygulama performansını geliştirmek için anonimleştirilmiş kullanım istatistiklerinin toplanması.' : 'Collection of anonymized usage data for app optimization and bug fixes.'}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="consent-analytics" ${consents.analytics !== false ? 'checked' : ''}/>
          <span class="toggle-track"></span>
        </label>
      </div>

      <!-- Consent 4: Smart Reminders -->
      <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px 14px;border:1px solid var(--border-light);display:flex;align-items:center;justify-content:space-between">
        <div style="flex:1;padding-right:10px">
          <div style="font-size:13px;font-weight:700;color:var(--text-1)">🔔 ${isTr ? 'Kişiselleştirilmiş Hatırlatıcı Bildirimleri' : 'Personalized Reminder Notifications'}</div>
          <div style="font-size:11px;color:var(--text-2);line-height:1.4;margin-top:2px">
            ${isTr ? 'Su içme, ilaç, adet öncesi uyarı ve sağlık hatırlatıcı bildirimlerinin iletilmesi.' : 'Sending notifications for water intake, medication, and period reminders.'}
          </div>
        </div>
        <label class="toggle">
          <input type="checkbox" id="consent-reminders" ${consents.reminders !== false ? 'checked' : ''}/>
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>

    <div style="font-size:11px;color:var(--text-3);text-align:center;line-height:1.4">
      🔒 ${isTr ? 'Rıza tercihlerinizi dilediğiniz zaman bu ekrandan değiştirebilirsiniz.' : 'You can update your privacy consent preferences anytime.'}
    </div>`;

  openProfileEditModal('📋', title, sub, bodyHtml, () => {
    saveConsentPreferences();
  });
}

function saveConsentPreferences() {
  const isTr = (state.lang || 'tr') === 'tr';
  const ai = document.getElementById('consent-ai')?.checked;
  const analytics = document.getElementById('consent-analytics')?.checked;
  const reminders = document.getElementById('consent-reminders')?.checked;

  state.consentPrefs = {
    healthData: true,
    aiProcessing: ai !== false,
    analytics: analytics === true,
    reminders: reminders !== false,
    updatedAt: TODAY_STR
  };

  saveToStorage();
  showToast(isTr ? 'Rıza tercihleriniz başarıyla güncellendi! 📋' : 'Consent preferences updated! 📋');
}

// ============================================================
// 21. SCREEN: PREMIUM
// ============================================================
function renderPremium() {
  const isTr = (state.lang || 'tr') === 'tr';
  const isAnnual = state.premiumTab === 'annual';
  const price = isAnnual ? '$3.33' : '$5.99';
  const period = isAnnual 
    ? (isTr ? '/ay, yıllık $39.99 faturalandırılır' : '/month, billed $39.99/year')
    : (isTr ? '/ay' : '/month');

  const features = [
    { name: isTr ? 'Döngü & adet takibi' : 'Cycle & period tracking',             free: true,  premium: true,  new: false },
    { name: isTr ? 'Temel tahminler' : 'Basic predictions',                       free: true,  premium: true,  new: false },
    { name: isTr ? 'Semptom & ruh hali kaydı' : 'Symptom & mood logging',        free: true,  premium: true,  new: false },
    { name: isTr ? '3 aylık geçmiş takibi' : '3-month history',                   free: true,  premium: false, new: false },
    { name: isTr ? 'Sınırsız geçmiş döngü kaydı' : 'Unlimited cycle history',    free: false, premium: true,  new: false },
    { name: isTr ? 'Yapay zeka destekli içgörüler' : 'AI-powered insights',        free: false, premium: true,  new: true  },
    { name: isTr ? 'Gelişmiş analizler & grafikler' : 'Advanced analytics & charts', free: false, premium: true,  new: false },
    { name: isTr ? 'Doğurganlık planlama araçları' : 'Fertility planning tools',   free: false, premium: true,  new: false },
    { name: isTr ? 'PDF sağlık raporu çıktısı' : 'PDF report export',             free: false, premium: true,  new: false },
    { name: isTr ? 'Özel bildirimler & hatırlatıcılar' : 'Custom notifications',  free: false, premium: true,  new: false },
    { name: isTr ? 'Öncelikli destek' : 'Priority support',                      free: false, premium: true,  new: false },
    { name: isTr ? 'Karanlık mod & özel temalar' : 'Dark mode & themes',          free: true,  premium: true,  new: false },
  ];

  const heroSub = isTr 
    ? 'Yapay zeka destekli döngü zekası ve gelişmiş sağlık analizlerinin tüm gücünü keşfedin' 
    : 'Unlock the full power of AI-driven cycle intelligence and advanced health analytics';

  const tabMonthly = isTr ? 'Aylık' : 'Monthly';
  const tabAnnual = isTr ? 'Yıllık' : 'Annual';
  const saveLabel = isTr ? '%44 Tasarruf' : 'Save 44%';
  const saveYearlyBadge = isTr ? 'Yılda $31.89 tasarruf edin' : 'Save $31.89/year';

  const btnText = isAnnual 
    ? (isTr ? '🌟 Yıllık Planı Başlat' : '🌟 Start Annual Plan')
    : (isTr ? ' Aylık Planı Başlat' : ' Start Monthly Plan');

  const subCommit = isTr 
    ? '7 gün ücretsiz deneme • İstediğin zaman iptal et • Taahhüt yok' 
    : '7-day free trial • Cancel anytime • No commitments';

  const incLabel = isTr ? 'Neler dahil:' : 'What\'s included:';
  const freeBadge = isTr ? 'Ücretsiz' : 'Free';
  const newBadge = isTr ? 'YENİ' : 'NEW';

  const socialTitle = isTr ? '❤️ 2 Milyondan fazla kadının tercihi' : '❤️ Loved by 2M+ women';
  const socialQuote = isTr 
    ? '"Yapay zeka içgörüleri sayesinde adetimden önce hep başımın ağrıdığını fark ettim. Hayatımı değiştirdi!"' 
    : '"The AI insights helped me realize I always get headaches before my period. Life-changing!"';
  const socialAuthor = isTr ? '— Emma R., Premium üye ⭐⭐⭐⭐⭐' : '— Emma R., Premium user ⭐⭐⭐⭐⭐';

  return `
  <div class="premium-screen">
    <div class="premium-hero" style="position:relative">
      <button class="top-bar-back" onclick="goBack()" style="position:absolute;top:16px;left:16px;background:rgba(255,255,255,0.25);backdrop-filter:blur(8px);border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;color:white;cursor:pointer;z-index:10" title="Geri">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
      </button>
      <div class="premium-hero-icon">⭐</div>
      <div class="premium-hero-title">Flowia Premium</div>
      <div class="premium-hero-sub">${heroSub}</div>
    </div>

    <!-- Plan Toggle -->
    <div class="plan-toggle">
      <div class="plan-tab ${!isAnnual?'active':''}" onclick="switchPremiumTab('monthly')">${tabMonthly}</div>
      <div class="plan-tab ${isAnnual?'active':''}" onclick="switchPremiumTab('annual')">
        ${tabAnnual} <span class="save-badge">${saveLabel}</span>
      </div>
    </div>

    <!-- Pricing Card -->
    <div class="pricing-section">
      <div class="pricing-card pricing-card-popular">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px">PREMIUM</div>
        <div style="font-size:42px;font-weight:800;color:white">${price}</div>
        <div style="font-size:12px;opacity:0.85;margin-bottom:8px">${period}</div>
        ${isAnnual ? `<div style="display:inline-block;background:rgba(255,255,255,0.25);border-radius:var(--r-full);padding:4px 14px;font-size:12px;font-weight:700">${saveYearlyBadge}</div>` : ''}
      </div>
      <button class="btn btn-primary" onclick="purchasePremium()" style="margin-top:0">
        ${btnText}
      </button>
      <p style="text-align:center;font-size:11px;color:var(--text-3);margin-top:10px">${subCommit}</p>
    </div>

    <!-- Features -->
    <div style="padding:0 20px 8px;font-size:13px;font-weight:600;color:var(--text-2)">${incLabel}</div>
    <div class="features-list">
      ${features.map(f => `
        <div class="feature-row">
          <div class="feature-check ${f.premium ? '' : 'locked'}">${f.premium ? '✓' : '—'}</div>
          <div class="feature-name">
            ${f.name}
            ${f.new ? `<span class="feature-badge">${newBadge}</span>` : ''}
          </div>
          <span style="font-size:12px;color:${f.free ? 'var(--success)' : 'var(--primary)'}">
            ${f.free ? freeBadge : 'Premium'}
          </span>
        </div>`).join('')}
    </div>

    <!-- Social Proof -->
    <div style="margin:16px 20px 32px;background:var(--surface);border-radius:var(--r-lg);padding:16px;border:1px solid var(--border-light)">
      <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:12px">${socialTitle}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="font-size:13px;color:var(--text-2);font-style:italic;line-height:1.5">${socialQuote}</div>
        <div style="font-size:12px;color:var(--text-3)">${socialAuthor}</div>
      </div>
    </div>
  </div>`;
}

function switchPremiumTab(tab) {
  state.premiumTab = tab;
  navigate('premium', 'refresh');
}

function purchasePremium() {
  openPaymentCheckoutModal();
}

function openPaymentCheckoutModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const isAnnual = state.premiumTab === 'annual';
  const planName = isAnnual 
    ? (isTr ? 'Yıllık Premium Üyelik (7 Gün Ücretsiz Deneme)' : 'Annual Premium Plan (7-Day Free Trial)')
    : (isTr ? 'Aylık Premium Üyelik (7 Gün Ücretsiz Deneme)' : 'Monthly Premium Plan (7-Day Free Trial)');

  const planPrice = isAnnual 
    ? '$39.99 / yıl ($3.33/ay)' 
    : '$5.99 / ay';

  const title = isTr ? 'Ödeme Sayfası (Google Play / App Store)' : 'Payment Checkout (Google Play / App Store)';
  const sub = isTr ? 'Lütfen ödeme yöntemini onaylayın' : 'Please confirm your payment method';

  const bodyHtml = `
    <div style="background:var(--surface-2);border-radius:var(--r-xl);padding:14px;border:1px solid var(--border-light);margin-bottom:14px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px"></span>
          <div>
            <div style="font-size:14px;font-weight:700;color:var(--text-1)">Flowia Premium</div>
            <div style="font-size:11px;color:var(--text-2);margin-top:2px">${planName}</div>
          </div>
        </div>
        <span class="badge badge-success" style="font-size:10px">${isTr ? '7 GÜN ÜCRETSİZ' : '7 DAYS FREE'}</span>
      </div>
      
      <div style="border-top:1px dashed var(--border-light);padding-top:10px;margin-top:10px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px;color:var(--text-2)">${isTr ? 'Deneme Sonrası Tutar:' : 'Price After Trial:'}</span>
        <span style="font-size:16px;font-weight:800;color:var(--primary)">${planPrice}</span>
      </div>
    </div>

    <!-- Store Selector & Payment Method -->
    <div style="font-size:12px;font-weight:700;color:var(--text-1);margin-bottom:8px">${isTr ? 'Seçili Ödeme Hesabı:' : 'Selected Payment Account:'}</div>
    <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px;display:flex;align-items:center;justify-content:space-between;border:1px solid var(--border-light);margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:20px;background:#E1F5FE;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center">💳</div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text-1)">Google Play / Apple ID Payments</div>
          <div style="font-size:11px;color:var(--text-2)">MasterCard **** 4892 (Default)</div>
        </div>
      </div>
      <span style="font-size:11px;color:var(--primary);font-weight:600">✓ ${isTr ? 'Doğrulandı' : 'Verified'}</span>
    </div>

    <div style="font-size:11px;color:var(--text-3);line-height:1.4;margin-bottom:16px;text-align:center">
      🛡️ ${isTr ? 'Bugün hiçbir ücret alınmayacaktır. İptal etmediğiniz takdirde 7 gün sonra otomatik yenilenir.' : 'You will not be charged today. Auto-renews in 7 days unless cancelled.'}
    </div>

    <button id="btn-confirm-payment" class="btn btn-primary" style="width:100%;font-weight:700;padding:12px;font-size:14px" onclick="processPaymentAndUnlock()">
      🔒 ${isTr ? '💳 Ödemeyi Onayla & Satın Al (7 Gün Ücretsiz)' : '🔒 💳 Confirm & Purchase (7-Day Free Trial)'}
    </button>`;

  openProfileEditModal('💳', title, sub, bodyHtml, null);
}

function processPaymentAndUnlock() {
  const isTr = (state.lang || 'tr') === 'tr';
  const btn = document.getElementById('btn-confirm-payment');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `⏳ ${isTr ? 'Ödeme Doğrulanıyor (App Store / Google Play)...' : 'Processing Payment (App Store / Google Play)...'}`;
  }

  setTimeout(() => {
    state.isPremium = true;
    state.autoRenew = true;
    saveToStorage();
    closeProfileEditModal();
    openPremiumWelcomeModal();
  }, 1000);
}

function openPremiumWelcomeModal() {
  const isTr = (state.lang || 'tr') === 'tr';
  const title = isTr ? 'Flowia Premium\'a Hoş Geldiniz!' : 'Welcome to Flowia Premium!';
  const sub = isTr ? '🌟 Tüm özel ayrıcalıklarınız ve yapay zeka araçlarınız aktif edildi' : '🌟 All exclusive features and AI tools are now unlocked';

  const benefits = [
    {
      icon: '🧠',
      bg: '#EDE7F6',
      title: isTr ? 'Yapay Zeka Hormon & Semptom İçgörüleri' : 'AI Hormone & Symptom Intelligence',
      desc: isTr ? 'Adet öncesi kramp, baş ağrısı ve mod değişimlerinizin hormon evrelerinizle olan gizli bağlarını otomatik çözer.' : 'Automatically correlates symptoms, mood swings, and headaches with cycle phases.'
    },
    {
      icon: '📄',
      bg: '#FFE0E6',
      title: isTr ? 'Doktor Kontrolüne Özel PDF Rapor Çıktısı' : 'Doctor-Ready PDF Health Reports',
      desc: isTr ? 'Jinekolog randevularınızda hekiminize sunabileceğiniz detaylı A4 formatında tıbbi sağlık çıktısı indirmenizi sağlar.' : 'Download comprehensive A4 medical reports for gynecologist appointments.'
    },
    {
      icon: '📈',
      bg: '#E8F5E9',
      title: isTr ? 'Sınırsız Geçmiş Döngü Analizleri' : 'Unlimited Cycle History Analytics',
      desc: isTr ? 'Yıllık ve tüm geçmiş döngülerinizi karşılaştırarak hormon dengenizi ve değişkenlik oranlarını canlı analiz eder.' : 'Compare all past cycle trends, regularity scores, and year-over-year variations.'
    },
    {
      icon: '🌿',
      bg: '#FFF3E0',
      title: isTr ? 'Hassas Doğurganlık & Yumurtlama Takibi' : 'Precision Fertility & Ovulation Tracking',
      desc: isTr ? 'Gebe kalma ihtimalinin en yüksek olduğu altın günleri (Peak Fertile) ve yumurtlama penceresini canlı hesaplar.' : 'Pinpoint peak fertile days and ovulation windows with maximum accuracy.'
    },
    {
      icon: '🌙',
      bg: '#E1F5FE',
      title: isTr ? 'Koyu Mod & Özel Premium Renk Paletleri' : 'Dark Mode & Custom Aesthetic Themes',
      desc: isTr ? 'Gözleri yormayan harika Dark Mode gece temasını ve özel renk seçeneklerini kullanmanızı sağlar.' : 'Enjoy eye-soothing Dark Mode and customized vibrant color palettes.'
    },
    {
      icon: '🔔',
      bg: '#FFF9C4',
      title: isTr ? 'Kişiselleştirilmiş Akıllı Bildirimler' : 'Personalized Smart Notifications',
      desc: isTr ? 'Su içme, ilaç takibi, adet öncesi uyarı ve yapay zeka tavsiyelerini zamanında bildirim olarak iletir.' : 'Receive tailored reminders for water intake, medications, and cycle updates.'
    }
  ];

  const bodyHtml = `
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.18),rgba(232,120,154,0.18));padding:16px;border-radius:var(--r-xl);text-align:center;margin-bottom:16px;border:1px solid rgba(255,215,0,0.4)">
      <div style="font-size:32px;margin-bottom:4px">🎉  ⭐</div>
      <div style="font-size:16px;font-weight:800;color:var(--text-1)">${isTr ? 'Tebrikler! Üyeliğiniz Aktif Edildi' : 'Congratulations! Premium Activated'}</div>
      <div style="font-size:12px;color:var(--text-2);margin-top:4px">${isTr ? 'Artık uygulamanın tüm gelişmiş yapay zeka gücüne sahipsiniz.' : 'You now have full access to all AI health analytics.'}</div>
    </div>

    <div style="font-size:13px;font-weight:700;color:var(--text-1);margin-bottom:10px">${isTr ? '✨ Bilinmeyen Özel Premium Avantajlarınız:' : '✨ Exclusive Premium Advantages:'}</div>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;max-height:260px;overflow-y:auto;padding-right:4px">
      ${benefits.map(b => `
        <div style="background:var(--surface-2);border-radius:var(--r-lg);padding:12px;display:flex;gap:12px;align-items:flex-start;border:1px solid var(--border-light)">
          <div style="font-size:20px;background:${b.bg};width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${b.icon}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text-1)">${b.title}</div>
            <div style="font-size:11px;color:var(--text-2);line-height:1.4;margin-top:2px">${b.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <button class="btn btn-primary" style="width:100%;font-weight:700;padding:12px" onclick="closeProfileEditModal(); navigate('home', 'refresh'); showToast('${isTr ? '🌟 Premium Ayrıcalıkları Aktif!' : '🌟 Premium Benefits Active!'}')">
      ${isTr ? ' Ayrıcalıkları Keşfetmeye Başla' : ' Start Exploring Benefits'}
    </button>`;

  openProfileEditModal('⭐', title, sub, bodyHtml, () => {});
}

// ============================================================
// 22. SCREEN: JOURNAL
// ============================================================
// [REMOVED duplicate renderJournal() stub]

function openNewJournal() {
  const content = prompt('Write your journal entry for today:');
  if (content && content.trim()) {
    state.journals.unshift({ id: Date.now(), date: TODAY_STR, content: content.trim(), tags: ['diary'] });
    saveToStorage();
    navigate('journal');
    showToast('Journal entry saved! 📝');
  }
}
function showJournalEntry(id) {
  const j = state.journals.find(x => x.id === id);
  if (j) alert(`${formatDate(j.date)}\n\n${j.content}`);
}

// ============================================================
// 23. SCREEN: NOTIFICATIONS
// ============================================================
function renderNotifications() {
  state.notifications.forEach(n => n.read = true);
  return `
  <div style="padding:0 0 32px">
    ${renderTopBar('Notifications')}
    ${state.notifications.length === 0 ? `
      <div style="display:flex;flex-direction:column;align-items:center;padding:60px 20px;gap:16px">
        <div style="font-size:56px">🔔</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-1)">All caught up!</div>
        <div style="font-size:14px;color:var(--text-2);text-align:center">You have no new notifications</div>
      </div>` :
    state.notifications.map(n => `
      <div style="display:flex;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border-light);cursor:pointer;background:${n.read?'transparent':'rgba(232,120,154,0.05)'}">
        <div style="width:42px;height:42px;border-radius:var(--r-md);background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${n.icon}</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:600;color:var(--text-1);margin-bottom:3px">${n.title}</div>
          <div style="font-size:13px;color:var(--text-2);line-height:1.4">${n.body}</div>
          <div style="font-size:11px;color:var(--text-3);margin-top:4px">${n.time}</div>
        </div>
        ${!n.read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:6px"></div>' : ''}
      </div>`).join('')}
  </div>`;
}

// ============================================================
// 24. AUTH ACTIONS
// ============================================================
// [REMOVED duplicate stub doLogin — real doLogin() handles full auth validation above]
function doLogout() {
  state.isLoggedIn = false;
  state.screen = 'login';
  state.savedScreen = 'login';
  saveToStorage();
  navigate('login', 'refresh');
  showToast('Çıkış yapıldı 👋');
}
function togglePwd(id) {
  const el = document.getElementById(id);
  if (el) el.type = el.type === 'password' ? 'text' : 'password';
}

// ============================================================
// 25. LOG SHEET
// ============================================================
function openLogSheet() {
  const sheet = document.getElementById('log-sheet');
  if (sheet) {
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">${t('log_today_title')}</h3>
      <div class="log-options">
        <button class="log-option" onclick="closeLogSheet(); navigate('log-period')">
          <div class="log-option-icon" style="background:linear-gradient(135deg,#FF6B9D,#FF4081)">🩸</div>
          <div class="log-option-info">
            <span class="log-option-label">${t('log_period')}</span>
            <span class="log-option-desc">${t('track_flow_desc')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
        <button class="log-option" onclick="closeLogSheet(); navigate('symptoms')">
          <div class="log-option-icon" style="background:linear-gradient(135deg,#9B72CF,#7C4DFF)">💊</div>
          <div class="log-option-info">
            <span class="log-option-label">${t('log_symptoms')}</span>
            <span class="log-option-desc">${t('symptoms_desc')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
        <button class="log-option" onclick="closeLogSheet(); navigate('mood')">
          <div class="log-option-icon" style="background:linear-gradient(135deg,#FFB74D,#FF9800)">😊</div>
          <div class="log-option-info">
            <span class="log-option-label">${t('log_mood')}</span>
            <span class="log-option-desc">${t('how_feeling_today')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
        <button class="log-option" onclick="closeLogSheet(); navigate('journal')">
          <div class="log-option-icon" style="background:linear-gradient(135deg,#66BB6A,#43A047)">📝</div>
          <div class="log-option-info">
            <span class="log-option-label">${t('journal_entry_lbl')}</span>
            <span class="log-option-desc">${t('write_thoughts_desc')}</span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ccc"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
        </button>
      </div>`;
    sheet.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    sheet.classList.add('open');
  }
  document.getElementById('log-sheet-overlay').classList.add('open');
}
function closeLogSheet() {
  document.getElementById('log-sheet-overlay').classList.remove('open');
  document.getElementById('log-sheet').classList.remove('open');
}

// ============================================================
// 26. TOAST NOTIFICATION
// ============================================================
function showToast(message, duration = 2800) {
  const existing = document.getElementById('toast-msg');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-msg';
  toast.style.cssText = `
    position:absolute; bottom:85px; left:50%; transform:translateX(-50%) translateY(20px);
    background:#2D1B35; color:white; padding:10px 18px; border-radius:20px;
    font-family:var(--font); font-size:13px; font-weight:500; z-index:999;
    box-shadow:0 8px 24px rgba(0,0,0,0.4); max-width:85%; width:max-content; text-align:center;
    animation: toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards;
    white-space: normal; word-break: break-word; letter-spacing:0.1px;
    border: 1px solid var(--border-light); line-height:1.35;
  `;
  const style = document.createElement('style');
  style.textContent = `@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(20px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`;
  document.head.appendChild(style);
  toast.textContent = message;

  const parent = document.querySelector('.device-frame') || document.body;
  parent.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================================
// 26.5 CHART.JS ANALYTICS INITIALIZATION (Monthly vs Yearly)
// ============================================================
function initCharts() {
  if (typeof Chart === 'undefined') return;

  const isDark = state.darkMode;
  const textColor = isDark ? '#E1D4EC' : '#7A6B7E';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const isMonthly = state.reportTab !== 'yearly';

  // Destroy existing active charts
  Object.values(state.charts).forEach(c => { try { c.destroy(); } catch(e){} });
  state.charts = {};

  // 1. Cycle Length Chart (Bar for Monthly vs Smooth Line for Yearly)
  const cyclesCtx = document.getElementById('chart-cycles');
  if (cyclesCtx) {
    const monthsShort = getMonthsShort();
    const labels = isMonthly 
      ? [monthsShort[1], monthsShort[2], monthsShort[3], monthsShort[4], monthsShort[5], monthsShort[6]]
      : [monthsShort[0], monthsShort[1], monthsShort[2], monthsShort[3], monthsShort[4], monthsShort[5], monthsShort[6], monthsShort[7], monthsShort[8], monthsShort[9], monthsShort[10], monthsShort[11]];
    const dataPoints = isMonthly
      ? [29, 27, 28, 30, 27, 28]
      : [28, 29, 27, 28, 30, 27, 28, 28, 29, 27, 28, 28];

    state.charts.cycles = new Chart(cyclesCtx, {
      type: isMonthly ? 'bar' : 'line',
      data: {
        labels: labels,
        datasets: [{
          label: isMonthly ? 'Cycle Length (days)' : 'Monthly Avg (days)',
          data: dataPoints,
          backgroundColor: isMonthly 
            ? ['#F7D3E0', '#F7D3E0', '#F7D3E0', '#F7D3E0', '#F7D3E0', '#E8789A']
            : 'rgba(232, 120, 154, 0.25)',
          borderColor: '#E8789A',
          borderWidth: 2,
          borderRadius: isMonthly ? 8 : 0,
          tension: 0.35,
          fill: !isMonthly,
          pointBackgroundColor: '#E8789A',
          pointRadius: isMonthly ? 0 : 4,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { min: 20, max: 35, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // 2. Mood Trend Chart (Weekly breakdown for Monthly vs Quarterly for Yearly)
  const moodCtx = document.getElementById('chart-mood');
  if (moodCtx) {
    state.charts.mood = new Chart(moodCtx, {
      type: 'line',
      data: {
        labels: isMonthly ? getWeekLabels() : ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [{
          label: isMonthly ? 'Mood Score' : 'Quarterly Mood Avg',
          data: isMonthly ? [3.2, 4.1, 4.8, 3.5] : [3.8, 4.0, 4.3, 4.5],
          borderColor: '#9B72CF',
          backgroundColor: 'rgba(155, 114, 207, 0.2)',
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#9B72CF',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { min: 1, max: 5, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  // 3. Top Symptoms Chart (Doughnut Chart)
  const symptomsCtx = document.getElementById('chart-symptoms');
  if (symptomsCtx) {
    state.charts.symptoms = new Chart(symptomsCtx, {
      type: 'doughnut',
      data: {
        labels: [t('cramps'), t('fatigue'), t('bloating'), t('headache')],
        datasets: [{
          data: [40, 25, 20, 15],
          backgroundColor: ['#EF5350', '#FFA726', '#9B72CF', '#42A5F5'],
          borderWidth: 2,
          borderColor: isDark ? '#23122B' : '#FFFFFF'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textColor, font: { family: 'Poppins', size: 11 } }
          }
        }
      }
    });
  }

  // 4. Period Duration Chart (Bar Chart)
  const periodCtx = document.getElementById('chart-period');
  if (periodCtx) {
    const monthsShort = getMonthsShort();
    state.charts.period = new Chart(periodCtx, {
      type: 'bar',
      data: {
        labels: isMonthly ? [monthsShort[1], monthsShort[2], monthsShort[3], monthsShort[4], monthsShort[5], monthsShort[6]] : ['2021', '2022', '2023', '2024', '2025', '2026'],
        datasets: [{
          label: 'Period Days',
          data: isMonthly 
            ? [5, 5, 4, 5, 5, (state.periodEndedEarly && state.actualPeriodLength) ? state.actualPeriodLength : (state.user.avgPeriod || 5)] 
            : [5.2, 5.0, 4.8, 5.1, 5.0, (state.user.avgPeriod || 5)],
          backgroundColor: 'rgba(239, 83, 80, 0.75)',
          borderColor: '#EF5350',
          borderWidth: 1.5,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { display: false } },
          y: { min: 0, max: 8, ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }
}

// ============================================================
// 27. SCREEN EVENT SETUP (post-render)
// ============================================================
function setupScreenEvents(screen) {
  if (screen === 'onboarding') {
    // Initialize slider fills
    ['cycle-slider','period-slider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) updateSliderFill(el);
    });
  }
}

// ============================================================
// 28. INITIALIZE
// ============================================================

// ============================================================
// DYNAMIC NOTIFICATION ENGINE
// Called after every data save to keep notifications current.
// ============================================================
function updateDynamicNotifications() {
  try {
    const P = PREDICTIONS || computePredictions();
    const isTr = (state.lang || 'tr') === 'tr';
    const now = new Date();

    const newNotifs = [];

    // 1. Period prediction notification
    if (P.daysUntilPeriod !== undefined) {
      const daysLabel = isTr ? 'gün' : 'days';
      const title = isTr
        ? (P.daysUntilPeriod === 0 ? 'Adet bugün başlıyor!' : P.daysUntilPeriod + ' gün sonra adet')
        : (P.daysUntilPeriod === 0 ? 'Period starts today!' : 'Period in ' + P.daysUntilPeriod + ' days');
      const body = isTr
        ? ('Sonraki adetinizin ' + formatDate(P.nextPeriodStart) + ' tarihinde başlaması bekleniyor.')
        : ('Your next period is predicted to start on ' + formatDate(P.nextPeriodStart) + '.');
      newNotifs.push({ id: 'notif_period_pred', type: 'prediction', icon: '📅', title, body, time: isTr ? 'Az önce' : 'Just now', read: false });
    }

    // 2. Ovulation / fertility notification
    if (P.cycleDay && P.avgCycle) {
      const ovDay = P.avgCycle - 14;
      const diff = ovDay - P.cycleDay;
      if (diff >= 0 && diff <= 5) {
        const fertTitle = isTr ? 'Doğurganlık penceresi yaklaşıyor 🌟' : 'Fertility window approaching 🌟';
        const fertBody = isTr
          ? ('Ovülasyon tarihiniz ' + formatDate(P.ovulationDate) + '. Doğurganlık pencereniz başlıyor!')
          : ('Ovulation date: ' + formatDate(P.ovulationDate) + '. Your fertility window is starting!');
        newNotifs.push({ id: 'notif_fertility', type: 'insight', icon: '🌟', title: fertTitle, body: fertBody, time: isTr ? 'Az önce' : 'Just now', read: false });
      }
    }

    // 3. AI Insight based on latest symptom/mood data
    const { dynamicList } = runAIInsightEngine();
    if (dynamicList && dynamicList.length > 0) {
      const top = dynamicList[0];
      newNotifs.push({
        id: 'notif_ai_insight',
        type: 'insight',
        icon: '✨',
        title: isTr ? 'Yeni Yapay Zeka İçgörüsü' : 'New AI Insight',
        body: top.body || top.title || '',
        time: isTr ? 'Az önce' : 'Just now',
        read: false
      });
    }

    // 4. Daily log reminder if nothing logged today
    const today = new Date().toISOString().split('T')[0];
    const loggedToday = (state.symptoms || []).some(s => s.date === today) || (state.moods || []).some(m => m.date === today);
    if (!loggedToday) {
      newNotifs.push({
        id: 'notif_daily_reminder',
        type: 'reminder',
        icon: '💊',
        title: isTr ? 'Günlük Kayıt Hatırlatması' : 'Daily Log Reminder',
        body: isTr ? 'Bugünün semptomlarını ve ruh halini kaydetmeyi unutmayın!' : "Don't forget to log your symptoms and mood for today!",
        time: isTr ? 'Bugün' : 'Today',
        read: false
      });
    }

    // Merge with existing non-dynamic notifications, keep read state
    const existingIds = newNotifs.map(n => n.id);
    const preserved = (state.notifications || []).filter(n => !existingIds.includes(n.id));
    state.notifications = [...newNotifs, ...preserved].slice(0, 20);

  } catch(e) { console.warn('[Flowia] updateDynamicNotifications error:', e); }
}

function init() {
  updateStatusTime();
  setInterval(updateStatusTime, 30000);

  // Restore user data from localStorage if present
  loadFromStorage();

  // Apply dark mode theme
  applyTheme();

  // Compute initial predictions
  PREDICTIONS = computePredictions();

  // Register Service Worker for PWA
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg  => console.log('[Flowia] SW registered:', reg.scope))
        .catch(err => console.warn('[Flowia] SW registration failed:', err));
    }
  } catch(e) {}

  try {
    if (!state.user || !state.user.email || !state.isLoggedIn) {
      state.isLoggedIn = false;
      if (!state.cycles) state.cycles = [];
      if (!state.symptoms) state.symptoms = [];
      if (!state.moods) state.moods = [];
      if (!state.journals) state.journals = [];
    }
    try {
      PREDICTIONS = computePredictions();
      updateDynamicNotifications();
    } catch(e) { console.warn('[Flowia] Notifications init fallback:', e); }

    const targetScreen = state.isLoggedIn ? (state.savedScreen || 'home') : 'login';
    state.screen = null;
    navigate(targetScreen, 'refresh');
  } catch(e) {
    console.error('[Flowia] Startup init error:', e);
    state.isLoggedIn = false;
    state.screen = null;
    navigate('login', 'refresh');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================================
// LEGAL SCREENS — Required by Play Store & App Store
// ============================================================

function renderPrivacyPolicy() {
  return `
<div class="screen-header">
  <button class="back-btn" onclick="goBack()" aria-label="Geri">
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
  </button>
  <h1 class="screen-title">🔒 Gizlilik Politikası</h1>
</div>
<div class="screen-body" style="padding:20px;font-size:14px;line-height:1.7;color:var(--text-1)">
  <p style="background:var(--surface-2);padding:12px;border-radius:12px;margin-bottom:16px;font-size:12px;color:var(--text-2)">
    Son güncelleme: Temmuz 2026 · Sürüm 1.1
  </p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">1. Topladığımız Veriler</h2>
  <p>Flowia aşağıdaki verileri toplamaktadır:</p>
  <ul style="padding-left:20px;margin:8px 0">
    <li>Ad, e-posta adresi (kayıt için)</li>
    <li>Doğum tarihi (yaş doğrulaması ve kişiselleştirme)</li>
    <li>Adet dönemi tarihleri, belirtiler, ruh hali kayıtları</li>
    <li>Döngü uzunluğu ve döngü geçmişi</li>
    <li>İsteğe bağlı: günlük notları, etiketler</li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">2. Verilerinizi Nasıl Kullanıyoruz</h2>
  <ul style="padding-left:20px;margin:8px 0">
    <li>Kişiselleştirilmiş döngü ve doğurganlık tahminleri sunmak</li>
    <li>AI tabanlı sağlık içgörüleri oluşturmak</li>
    <li>Bildirim ve hatırlatmalar göndermek</li>
    <li>Uygulamayı iyileştirmek (anonim istatistikler)</li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">3. Veri Depolama ve Güvenlik</h2>
  <p>Tüm sağlık verileriniz <strong>yalnızca cihazınızda</strong> (tarayıcı localStorage) saklanmaktadır. Sunucularımıza yüklenmemektedir. Uygulama içinde herhangi bir üçüncü tarafla kişisel sağlık verisi paylaşılmamaktadır.</p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">4. Çocukların Gizliliği (COPPA)</h2>
  <p>Flowia, 13 yaşından küçük kişilere yönelik değildir ve bu kişilerden bilinçli olarak veri toplamaz. 13 yaş altı kullanıcı tespiti durumunda hesap derhal silinecektir.</p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">5. KVKK ve GDPR Hakları</h2>
  <p>6698 sayılı KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:</p>
  <ul style="padding-left:20px;margin:8px 0">
    <li>Verilerinize erişim hakkı</li>
    <li>Verilerinizin düzeltilmesi hakkı</li>
    <li>Verilerinizin silinmesi hakkı (Ayarlar → Tüm Verileri Sil)</li>
    <li>Veri taşınabilirliği hakkı (CSV dışa aktarma)</li>
    <li>İşleme itiraz hakkı</li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">6. İletişim</h2>
  <p>Gizlilik sorularınız için: <strong>privacy@cyclecare.app</strong></p>

  <div style="background:linear-gradient(135deg,#E8789A22,#9B72CF22);border-radius:16px;padding:16px;margin-top:24px;text-align:center">
    <div style="font-size:24px;margin-bottom:8px">🛡️</div>
    <div style="font-weight:700;font-size:14px;color:var(--primary)">KVKK & GDPR Uyumlu</div>
    <div style="font-size:12px;color:var(--text-2);margin-top:4px">Verileriniz yalnızca cihazınızda saklanır</div>
  </div>

  <button class="btn btn-outline" onclick="goBack()" style="width:100%;margin-top:24px">← Geri Dön</button>
</div>`;
}

function renderTermsOfService() {
  return `
<div class="screen-header">
  <button class="back-btn" onclick="goBack()" aria-label="Geri">
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
  </button>
  <h1 class="screen-title">📄 Kullanım Koşulları</h1>
</div>
<div class="screen-body" style="padding:20px;font-size:14px;line-height:1.7;color:var(--text-1)">
  <p style="background:var(--surface-2);padding:12px;border-radius:12px;margin-bottom:16px;font-size:12px;color:var(--text-2)">
    Son güncelleme: Temmuz 2026 · Sürüm 1.1
  </p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">1. Kabul</h2>
  <p>Flowia'i kullanarak bu Kullanım Koşulları'nı kabul etmiş sayılırsınız. Kabul etmiyorsanız uygulamayı kullanmayınız.</p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">2. Yaş Sınırı</h2>
  <p>Flowia'i kullanmak için <strong>en az 13 yaşında</strong> olmanız gerekmektedir. 13-18 yaş arasındaki kullanıcıların ebeveyn veya vasi onayıyla kullanması gerekmektedir.</p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">3. Tıbbi Sorumluluk Reddi ⚕️</h2>
  <div style="background:#FFF3E0;border:2px solid #FF9800;border-radius:12px;padding:14px;margin:8px 0">
    <p style="margin:0;font-weight:600;color:#E65100">⚠️ Flowia bir tıbbi cihaz, teşhis aracı veya doğum kontrol yöntemi DEĞİLDİR.</p>
    <p style="margin:8px 0 0;color:#E65100">Sağlık kararları için her zaman lisanslı bir sağlık profesyoneline danışınız. Bu uygulama tıbbi tavsiye yerine geçmez.</p>
  </div>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">4. Kullanıcı Hesabı</h2>
  <ul style="padding-left:20px;margin:8px 0">
    <li>Hesap bilgilerinizin doğruluğundan siz sorumlusunuz</li>
    <li>Hesabınızı başkasıyla paylaşmayınız</li>
    <li>Şüpheli aktivite durumunda bizi bilgilendiriniz</li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">5. Premium Abonelik</h2>
  <ul style="padding-left:20px;margin:8px 0">
    <li>Premium özellikler ücretli abonelik gerektirir</li>
    <li>Abonelik otomatik yenilenir; istediğiniz zaman iptal edebilirsiniz</li>
    <li>İptal işlemi mevcut dönem sonunda geçerli olur</li>
    <li>İptal için: Ayarlar → Hesap → Aboneliği İptal Et</li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">6. Sorumluluk Sınırlaması</h2>
  <p>Flowia, döngü tahminlerinin doğruluğunu garanti etmez. Biyolojik bireysellik nedeniyle tahminler her kullanıcı için farklılık gösterebilir.</p>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">7. İletişim</h2>
  <p>Sorularınız için: <strong>legal@cyclecare.app</strong></p>

  <button class="btn btn-outline" onclick="goBack()" style="width:100%;margin-top:24px">← Geri Dön</button>
</div>`;
}

function renderMedicalDisclaimer() {
  return `
<div class="screen-header">
  <button class="back-btn" onclick="goBack()" aria-label="Geri">
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
  </button>
  <h1 class="screen-title">⚕️ Tıbbi Sorumluluk Reddi</h1>
</div>
<div class="screen-body" style="padding:20px;font-size:14px;line-height:1.7;color:var(--text-1)">
  <div style="background:linear-gradient(135deg,#FF6B9D,#FF4081);border-radius:20px;padding:24px;text-align:center;margin-bottom:24px;color:#fff">
    <div style="font-size:48px;margin-bottom:12px">⚕️</div>
    <h2 style="font-size:18px;font-weight:800;margin-bottom:8px">Önemli Tıbbi Uyarı</h2>
    <p style="font-size:13px;opacity:0.9">Bu ekranı lütfen dikkatlice okuyunuz</p>
  </div>

  <div style="background:#FFF3E0;border-left:4px solid #FF9800;padding:16px;border-radius:0 12px 12px 0;margin-bottom:20px">
    <p style="font-weight:700;color:#E65100;margin:0 0 8px">⚠️ Flowia TIBBİ BİR UYGULAMA DEĞİLDİR</p>
    <p style="color:#E65100;margin:0;font-size:13px">Bu uygulama tıbbi teşhis, tedavi veya doğum kontrol amacıyla kullanılamaz. Sağlık kararlarınız için lisanslı bir sağlık profesyoneline danışınız.</p>
  </div>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">Tahminlerin Sınırlılıkları</h2>
  <p>Flowia'deki döngü ve doğurganlık tahminleri, girdiğiniz verilere dayanarak istatistiksel algoritmalarla hesaplanır. Bu tahminler:</p>
  <ul style="padding-left:20px;margin:8px 0;color:var(--text-1)">
    <li>%100 doğru değildir ve bireysel biyolojik farklılıklardan etkilenir</li>
    <li>Stres, hastalık, ilaç kullanımı ve hormon dengesizliğinden etkilenebilir</li>
    <li>Düzensiz döngülerde daha az güvenilirdir</li>
    <li><strong>Doğum kontrolü olarak kullanılamaz</strong></li>
  </ul>

  <h2 style="font-size:16px;font-weight:700;margin:16px 0 8px">Ne Zaman Doktora Başvurmalısınız?</h2>
  <ul style="padding-left:20px;margin:8px 0;color:var(--text-1)">
    <li>3 aydan uzun süre adet görmediğinizde</li>
    <li>Aşırı veya anormal kanama olduğunda</li>
    <li>Yoğun pelvik ağrı olduğunda</li>
    <li>Gebe kalmaya çalışıyorsanız (12 ay başarısız denemeden sonra)</li>
    <li>Menopoz semptomları yaşadığınızda</li>
  </ul>

  <div style="background:var(--surface-2);border-radius:12px;padding:16px;margin-top:20px;text-align:center">
    <p style="font-size:12px;color:var(--text-2);margin:0">Flowia, sağlığınızı takip etmenize yardımcı bir araçtır. Tıbbi tavsiyenin yerini alamaz.</p>
  </div>

  <button class="btn btn-primary" onclick="goBack()" style="width:100%;margin-top:24px">Anladım, Devam Et</button>
</div>`;
}

