'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardList, MailCheck, MessageSquareText, ShieldCheck } from 'lucide-react';

const modules = [
  { href: '/dashboard/outreach/workspace', title: 'Drafts & sequences', description: 'Create personalized drafts, review evidence, approve messages, and track sequence status.', icon: ClipboardList, action: 'Open outreach workspace' },
  { href: '/dashboard/outreach/settings', title: 'Email delivery controls', description: 'Review readiness, pause sending, set daily limits, and inspect delivery attempts.', icon: ShieldCheck, action: 'Open email controls' },
  { href: '/dashboard/outreach/replies', title: 'Reply inbox', description: 'Review inbound replies, classifications, and whether follow-ups were stopped.', icon: MessageSquareText, action: 'Review replies' },
];

export default function OutreachCenterPage() {
  return <main className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
    <header className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">Contact workflow</p>
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">Outreach Center</h1>
      <p className="max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">Drafting, sending controls, and replies have separate workspaces. Sending stays disabled unless all server-side safety gates allow it.</p>
    </header>
    <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-sm font-semibold">Safety first</p><p className="mt-1 text-sm leading-6">Review every message and its evidence. Do not enable live sending until staging checks, recipient consent/compliance checks, unsubscribe handling, and reply-stop behavior are verified.</p></div></div>
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map(({ href, title, description, icon: Icon, action }) => <Link key={href} href={href} className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-800 sm:p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300"><Icon className="h-5 w-5" /></div>
        <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">{title}</h2>
        <p className="mt-2 min-h-16 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{description}</p>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">{action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
      </Link>)}
    </section>
    <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400"><MailCheck className="h-4 w-4"/> Every delivery attempt and reply should be reviewed from its dedicated screen.</p>
  </main>;
}
