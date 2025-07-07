"use client";

import React, { createContext, useContext, useState } from 'react';

type Lang = "한국어" | "English";
const LanguageContext = createContext<{lang: Lang, setLang: (l: Lang) => void}>({ lang: "한국어", setLang: () => {} });

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Lang>("한국어");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}; 