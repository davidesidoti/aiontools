// src/app/[locale]/page.tsx  (placeholder; replaced in Task 11)
import { setRequestLocale } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return null;
}
