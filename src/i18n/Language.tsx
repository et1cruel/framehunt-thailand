import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import english from "./en.json";

type Language = "th" | "en";
const normalizeKey = (text: string) => text.replace(/\\n/gu, " ").replace(/\s+/gu, " ").trim();
const englishByNormalizedKey = new Map(
  Object.entries(english as Record<string, string>).map(([key, value]) => [normalizeKey(key), value]),
);
const LanguageContext = createContext({ language: "th" as Language, setLanguage: (_language: Language) => {}, t: (text: string) => text });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem("framehunt:language") === "en" ? "en" : "th"; } catch { return "th"; }
  });
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem("framehunt:language", language); } catch { /* Storage may be unavailable. */ }
  }, [language]);
  const t = (text: string) => language === "en" ? englishByNormalizedKey.get(normalizeKey(text)) ?? text : text;
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
export function Localized({ text }: { text: string }) { const { t } = useLanguage(); return <>{t(text)}</>; }
