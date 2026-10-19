'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, Gauge, Search, Users } from 'lucide-react';

const modules = [
  { href: '/dashboard/leads/workspace', title: 'Search & manage leads', description: 'Find businesses, review saved leads, edit records, and export your list.', icon: Search, action: 'Open lead workspace' },
  { href: '/dashboard/leads/research', title: 'AI research', description: 'Review research jobs, evidence links, and draft-generation readiness.', icon: BrainCircuit, action: 'Open AI research' },
  { href: '/dashboard/leads/settings', title: 'Usage & billing settings', description: 'Set Google Places request limits, estimated budget, and cloud billing connections.', icon: Gauge, action: 'Manage limits' },
  { href: '/dashboard/outreach', title: 'Outreach', description: 'Create drafts, review replies, and control email delivery separately.', icon: Users, action: 'Open outreach center' },
];

export default function LeadCenterPage() {
  return <main className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">Sales workspace</p>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Lead Center</h1>
      <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Choose one task at a time. Search, research, billing controls, and outreach are separated so the workspace stays easy to understand.</p>
    </header>
    <section className="grid gap-4 sm:grid-cols-2">
      {modules.map(({ href, title, description, icon: Icon, action }) => <Link key={href} href={href} className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-sky-800 sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700 dark:text-sky-300"><Icon className="h-5 w-5" /></div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">{title}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">{action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </Link>)}
    </section>
  </main>;
}
