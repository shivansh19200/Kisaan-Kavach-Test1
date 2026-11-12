export type USDINRReferenceRate = {
  rate: number;
  date: string;
};

export async function getUsdInrReferenceRate(): Promise<USDINRReferenceRate | null> {
  try {
    const response = await fetch('https://api.frankfurter.dev/v2/rate/usd/inr', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const data = await response.json() as { rate?: number; date?: string };
    if (!Number.isFinite(data.rate) || !data.date) return null;
    return { rate: data.rate as number, date: data.date };
  } catch {
    return null;
  }
}
