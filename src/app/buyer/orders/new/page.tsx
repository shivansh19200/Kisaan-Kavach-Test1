export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db/repo';
import TopBar from '@/components/ui/TopBar';
import OrderBuilder from './OrderBuilder';

type SellerOption = { id: number; email: string; language: 'hi' | 'mr' };

export default async function NewOrderPage() {
  const session = await getSession();
  if (!session || session.role !== 'BUYER') redirect('/login');
  const sellers = getDb()
    .prepare("SELECT id, email, language FROM users WHERE role = 'SELLER' ORDER BY language")
    .all() as SellerOption[];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role="BUYER" currentPath="/buyer/orders/new" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <OrderBuilder sellers={sellers} />
      </main>
    </div>
  );
}
