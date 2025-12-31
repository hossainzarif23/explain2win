import { redirect } from 'next/navigation';

import { auth } from '@/server/auth/auth.config';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950/50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar className="w-full h-full" />
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen transition-all duration-300">
        <Header user={session.user} />
        <main className="flex-1 p-6 md:p-8 animate-in fade-in-50 duration-500">
           {children}
        </main>
      </div>
    </div>
  );
}
