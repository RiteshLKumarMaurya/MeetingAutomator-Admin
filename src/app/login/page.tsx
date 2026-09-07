import { Suspense } from 'react';
import { AdminLoginClient } from './AdminLoginClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <AdminLoginClient />
    </Suspense>
  );
}
