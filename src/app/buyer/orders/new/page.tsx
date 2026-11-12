export const dynamic = 'force-dynamic';

import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import TopBar from '@/components/ui/TopBar';
import OrderBuilder from './OrderBuilder';

export default async function NewOrderPage() {
  const session = await getSession();
  if (!session || session.role !== 'BUYER') redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar role="BUYER" currentPath="/buyer/orders/new" />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <OrderBuilder />
      </main>
    </div>
  );
}
