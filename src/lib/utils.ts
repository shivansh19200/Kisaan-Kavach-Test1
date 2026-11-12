import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(minor: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatDate(dateStr: string | Date, lang: 'en' | 'hi' | 'mr' = 'en'): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const localeMap = { en: 'en-US', hi: 'hi-IN', mr: 'mr-IN' };
  return new Intl.DateTimeFormat(localeMap[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateStr: string | Date, lang: 'en' | 'hi' | 'mr' = 'en'): string {
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const localeMap = { en: 'en-US', hi: 'hi-IN', mr: 'mr-IN' };
  return new Intl.DateTimeFormat(localeMap[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}