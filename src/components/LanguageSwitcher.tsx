"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import type { Locale } from "@/i18n/config";

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("lang");

  const otherLocale: Locale = locale === "cs" ? "en" : "cs";

  function switchLocale() {
    router.replace(pathname, { locale: otherLocale });
  }

  return (
    <button
      onClick={switchLocale}
      className="text-[10px] tracking-[0.2em] text-white/40 uppercase hover:text-white/60 transition-colors"
      aria-label={`Switch to ${t(otherLocale)}`}
    >
      {t(otherLocale)}
    </button>
  );
}
