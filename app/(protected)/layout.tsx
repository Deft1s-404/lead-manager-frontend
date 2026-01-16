'use client';

import { Navbar } from '../../components/Navbar';
import { Loading } from '../../components/Loading';
import { useProtectedRoute } from '../../hooks/useProtectedRoute';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const isReady = useProtectedRoute();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="md:flex md:h-screen">
        <Navbar />
        <main className="px-4 py-6 md:flex-1 md:overflow-y-auto md:px-6 md:py-8">
          <div className="mx-auto max-w-screen-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
