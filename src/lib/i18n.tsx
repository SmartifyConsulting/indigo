import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Language framework, adapted from the Heita project (wellspring-gems-jules).
 *
 * Every translatable string goes through `t()`. A language is added by adding a dictionary
 * below; missing keys fall back to English, so a partly translated language never breaks the
 * page. Only the strings Heita already had hand-written translations for are included; nothing
 * here has been translated for indigro.
 */

/** English plus the other official South African languages, each named in its own language. */
export const LANGUAGES = [
  { code: "en", english: "English", native: "English" },
  { code: "af", english: "Afrikaans", native: "Afrikaans" },
  { code: "zu", english: "isiZulu", native: "isiZulu" },
  { code: "xh", english: "isiXhosa", native: "isiXhosa" },
  { code: "nso", english: "Sepedi", native: "Sepedi" },
  { code: "st", english: "Sesotho", native: "Sesotho" },
  { code: "tn", english: "Setswana", native: "Setswana" },
  { code: "ss", english: "siSwati", native: "siSwati" },
  { code: "ve", english: "Tshivenda", native: "Tshivenḓa" },
  { code: "ts", english: "Xitsonga", native: "Xitsonga" },
  { code: "nr", english: "isiNdebele", native: "isiNdebele" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export const EN_STRINGS = {
  "auth.signin": "Sign in",
  "auth.signup": "Create account",
  "auth.email": "Work email",
  "auth.password": "Password",
  "auth.forgot": "Forgot password?",
  "auth.google": "Continue with Google",
  "auth.or": "or",
  "auth.showPassword": "Show password",
  "auth.hidePassword": "Hide password",
  "language.choose": "Choose your language",
} as const;

type Key = keyof typeof EN_STRINGS;
type Dict = Partial<Record<Key, string>>;

/** Hand-written by the Heita team. */
const af: Dict = {
  "auth.signin": "Teken in",
  "auth.signup": "Skep rekening",
  "auth.email": "E-pos",
  "auth.password": "Wagwoord",
  "auth.forgot": "Wagwoord vergeet?",
};

const zu: Dict = {
  "auth.signin": "Ngena",
  "auth.signup": "Dala i-akhawunti",
  "auth.email": "I-imeyili",
  "auth.password": "Iphasiwedi",
  "auth.forgot": "Ukhohlwe iphasiwedi?",
};

const DICTIONARIES: Record<string, Dict> = { af, zu };
const STORAGE_KEY = "indigro.language";

type I18nValue = {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: Key) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  // Read the saved choice after mount so server and browser render the same first paint.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null;
      if (stored && LANGUAGES.some((l) => l.code === stored)) {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      /* storage unavailable: stay on English */
    }
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    document.documentElement.lang = code;
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* the choice lasts for this visit only */
    }
  }, []);

  const t = useCallback((key: Key) => DICTIONARIES[language]?.[key] ?? EN_STRINGS[key], [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Used when a component renders outside the provider: English, no crash. */
const FALLBACK: I18nValue = {
  language: "en",
  setLanguage: () => {},
  t: (key) => EN_STRINGS[key],
};

export function useI18n() {
  return useContext(I18nContext) ?? FALLBACK;
}
