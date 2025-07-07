import { useLanguage } from './LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  return (
    <div
      className="inline-flex items-center rounded-lg px-4 py-1 shadow-sm border bg-white/85 text-gray-800 text-sm font-medium
                 dark:bg-gray-800/95 dark:text-gray-100 dark:border-gray-700"
      style={{ position: 'absolute', top: 16, right: 24, zIndex: 50 }}
    >
      <span role="img" aria-label="language" className="mr-2">🌐</span>
      <select
        value={lang}
        onChange={e => setLang(e.target.value as "한국어" | "English")}
        className="bg-transparent border-none outline-none cursor-pointer text-inherit dark:bg-transparent"
      >
        <option value="한국어">한국어</option>
        <option value="English">English</option>
      </select>
    </div>
  );
} 