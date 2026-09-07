import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ eyebrow, title, subtitle, centered, className }: SectionHeaderProps) {
  return (
    <div className={cn('max-w-2xl', centered && 'mx-auto text-center', className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-zinc-100 text-balance mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}
