"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { UI_TEXT, type AppLanguage } from "@/lib/constants";

type UITextType = typeof UI_TEXT.en;

const LanguageContext = createContext<{
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
  t: UITextType;
}>({
  lang: "zh",
  setLang: () => {},
  t: UI_TEXT.zh,
});

export function LanguageProvider({ children, initialLang = "zh" }: { children: ReactNode; initialLang?: AppLanguage }) {
  const [lang, setLang] = useState<AppLanguage>(initialLang);

  useEffect(() => {
    const stored = localStorage.getItem("knowtok-lang") as AppLanguage | null;
    if (stored && (stored === "en" || stored === "zh")) {
      setLang(stored);
    }
  }, []);

  const handleSetLang = (newLang: AppLanguage) => {
    setLang(newLang);
    localStorage.setItem("knowtok-lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: handleSetLang, t: UI_TEXT[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
