import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

type CardHeaderProps = {
	title?: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
};

type CardSectionProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, children, ...props }: CardProps): JSX.Element => (
	<article
		{...props}
		className={cn(
			'flex flex-col gap-4 rounded-2xl border border-[var(--card-border)] bg-[var(--card-background)] p-6 shadow-card backdrop-blur',
			className
		)}
	>
		{children}
	</article>
);

export const CardHeader = ({ title, description, actions, className }: CardHeaderProps): JSX.Element | null => {
	if (!title && !description && !actions) {
		return null;
	}

	return (
		<header className={cn('flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between', className)}>
			<div className="flex flex-col gap-1">
				{title ? <h3 className="m-0 text-lg font-semibold text-slate-900">{title}</h3> : null}
				{description ? <p className="m-0 text-sm text-slate-600">{description}</p> : null}
			</div>
			{actions ? <div className="flex items-center gap-2">{actions}</div> : null}
		</header>
	);
};

export const CardContent = ({ className, children, ...props }: CardSectionProps): JSX.Element => (
	<div {...props} className={cn('flex flex-col gap-3 text-sm text-slate-700', className)}>
		{children}
	</div>
);

export const CardFooter = ({ className, children, ...props }: CardSectionProps): JSX.Element => (
	<footer {...props} className={cn('flex items-center justify-end gap-3', className)}>
		{children}
	</footer>
);
