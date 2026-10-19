'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import OutreachEmailControls from '../OutreachEmailControls';

export default function OutreachSettingsPage() {
  return <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
    <Link href="/dashboard/outreach" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 underline dark:text-violet-300"><ArrowLeft className="h-4 w-4"/> Back to Outreach Center</Link>
    <header><h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Email delivery controls</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Review sending readiness, global pause, configured limits, and delivery history here. This page does not enable the environment-level sending gate.</p></header>
    <OutreachEmailControls />
  </main>;
}
