import 'server-only';
import { cookies } from 'next/headers';
import type { SupportedLang } from './t';

const supportedLanguages: SupportedLang[] = ['en', 'hi', 'mr'];

export async function getServerLang(fallback: SupportedLang = 'en'): Promise<SupportedLang> {
  const savedLanguage = (await cookies()).get('kavach-lang')?.value as SupportedLang | undefined;
  return savedLanguage && supportedLanguages.includes(savedLanguage) ? savedLanguage : fallback;
}
