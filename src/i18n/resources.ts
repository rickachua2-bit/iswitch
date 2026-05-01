// 25 most-spoken / most-relevant languages for global travel.
// Native names so the dropdown is recognisable to native speakers.
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "nl", label: "Dutch", native: "Nederlands" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "zh", label: "Chinese (Simplified)", native: "中文" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "ar", label: "Arabic", native: "العربية", rtl: true },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "ur", label: "Urdu", native: "اردو", rtl: true },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "ms", label: "Malay", native: "Bahasa Melayu" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", label: "Thai", native: "ภาษาไทย" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
  { code: "ha", label: "Hausa", native: "Hausa" },
  { code: "yo", label: "Yoruba", native: "Yorùbá" },
  { code: "am", label: "Amharic", native: "አማርኛ" },
  { code: "fa", label: "Persian", native: "فارسی", rtl: true },
] as const;

// Translation strings — header/nav/CTA copy. Other strings will be added as the app grows.
const en = {
  nav: {
    flights: "Flights",
    hotels: "Hotels",
    visas: "Visas",
    insurance: "Insurance",
    tours: "Tours",
    transfers: "Car Transfers",
    carRentals: "Car Rentals",
    consultations: "Consultations",
  },
  cta: {
    signIn: "Sign in",
    partner: "Partner with us",
    bookConsult: "Book a Consult",
  },
  common: { language: "Language", currency: "Currency" },
};

const es: typeof en = {
  nav: { flights: "Vuelos", hotels: "Hoteles", visas: "Visas", insurance: "Seguros", tours: "Tours", transfers: "Traslados", carRentals: "Alquiler de Coches", consultations: "Consultorías" },
  cta: { signIn: "Iniciar sesión", partner: "Sé nuestro socio", bookConsult: "Reservar consulta" },
  common: { language: "Idioma", currency: "Moneda" },
};
const fr: typeof en = {
  nav: { flights: "Vols", hotels: "Hôtels", visas: "Visas", insurance: "Assurance", tours: "Excursions", transfers: "Transferts", carRentals: "Location de Voitures", consultations: "Consultations" },
  cta: { signIn: "Se connecter", partner: "Devenir partenaire", bookConsult: "Réserver" },
  common: { language: "Langue", currency: "Devise" },
};
const de: typeof en = {
  nav: { flights: "Flüge", hotels: "Hotels", visas: "Visa", insurance: "Versicherung", tours: "Touren", transfers: "Transfers", carRentals: "Mietwagen", consultations: "Beratung" },
  cta: { signIn: "Anmelden", partner: "Partner werden", bookConsult: "Beratung buchen" },
  common: { language: "Sprache", currency: "Währung" },
};
const pt: typeof en = {
  nav: { flights: "Voos", hotels: "Hotéis", visas: "Vistos", insurance: "Seguros", tours: "Passeios", transfers: "Transfers", carRentals: "Aluguel de Carros", consultations: "Consultorias" },
  cta: { signIn: "Entrar", partner: "Seja parceiro", bookConsult: "Agendar consulta" },
  common: { language: "Idioma", currency: "Moeda" },
};
const ar: typeof en = {
  nav: { flights: "رحلات", hotels: "فنادق", visas: "تأشيرات", insurance: "تأمين", tours: "جولات", transfers: "نقل", carRentals: "تأجير السيارات", consultations: "استشارات" },
  cta: { signIn: "تسجيل الدخول", partner: "كن شريكاً", bookConsult: "حجز استشارة" },
  common: { language: "اللغة", currency: "العملة" },
};
const zh: typeof en = {
  nav: { flights: "机票", hotels: "酒店", visas: "签证", insurance: "保险", tours: "旅游", transfers: "接送", carRentals: "租车", consultations: "咨询" },
  cta: { signIn: "登录", partner: "成为合作伙伴", bookConsult: "预约咨询" },
  common: { language: "语言", currency: "货币" },
};
const hi: typeof en = {
  nav: { flights: "उड़ानें", hotels: "होटल", visas: "वीज़ा", insurance: "बीमा", tours: "टूर", transfers: "कार ट्रांसफर", carRentals: "कार किराये पर", consultations: "परामर्श" },
  cta: { signIn: "साइन इन", partner: "हमारे साथ जुड़ें", bookConsult: "परामर्श बुक करें" },
  common: { language: "भाषा", currency: "मुद्रा" },
};
const ru: typeof en = {
  nav: { flights: "Авиабилеты", hotels: "Отели", visas: "Визы", insurance: "Страховка", tours: "Туры", transfers: "Трансферы", carRentals: "Аренда авто", consultations: "Консультации" },
  cta: { signIn: "Войти", partner: "Стать партнёром", bookConsult: "Записаться" },
  common: { language: "Язык", currency: "Валюта" },
};
const ja: typeof en = {
  nav: { flights: "航空券", hotels: "ホテル", visas: "ビザ", insurance: "保険", tours: "ツアー", transfers: "送迎", carRentals: "レンタカー", consultations: "相談" },
  cta: { signIn: "ログイン", partner: "提携する", bookConsult: "相談を予約" },
  common: { language: "言語", currency: "通貨" },
};

// Languages without dedicated translation files fall back to English via i18next fallbackLng.
export const resources = {
  en: { translation: en },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  ar: { translation: ar },
  zh: { translation: zh },
  hi: { translation: hi },
  ru: { translation: ru },
  ja: { translation: ja },
} as const;
