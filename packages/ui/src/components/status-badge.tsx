import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneClasses: Record<Tone, string> = {
	neutral: 'bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
	info: 'bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]',
	success: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]',
	warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-fg)]',
	danger: 'bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]'
};

type StatusBadgeProps = {
	icon?: ReactNode;
	tone?: Tone;
} & HTMLAttributes<HTMLSpanElement>;

export const StatusBadge = ({
	icon,
	tone = 'neutral',
	className,
	children,
	...props
}: StatusBadgeProps): JSX.Element => (
	<span
		{...props}
		className={cn(
			'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide',
			toneClasses[tone],
			className
		)}
	>
		{icon ? <span aria-hidden>{icon}</span> : null}
		<span>{children}</span>
	</span>
);
