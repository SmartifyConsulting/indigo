import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { LANGUAGES, useI18n, type LanguageCode } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The classic "文A" translate glyph, drawn on the round language icon. Taken from Heita. */
function TranslateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden focusable="false">
      <path
        d="M3 5h9M7.5 3v2M9.5 5c-.6 3.2-2.4 5.8-5 7.5M5 9c1.3 1.7 3 3 5.5 3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9 11 21M15.5 9 20 21M12.6 17h5.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Round icon that opens a list of South African languages. */
export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div className={className}>
      <Select value={language} onValueChange={(v) => setLanguage(v as LanguageCode)}>
        <SelectTrigger
          aria-label={t("language.choose")}
          className={cn(
            "size-9 justify-center gap-0 rounded-full border-transparent bg-brand p-0 text-white hover:bg-brand/85",
            "[&>svg:last-child]:hidden",
          )}
        >
          <TranslateIcon className="size-[18px]" />
        </SelectTrigger>
        <SelectContent align="end">
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.native}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
