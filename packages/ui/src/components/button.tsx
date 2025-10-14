import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ForwardedRef, ReactNode } from 'react';
import { cn } from '../lib/cn';

const variantClasses = {
	primary:
		'bg-[var(--color-primary,theme(colors.blue.600))] text-white shadow-lg shadow-blue-600/30 hover:bg-blue-600/90 focus-visible:outline-blue-500',
	secondary: 'bg-slate-900/5 text-slate-900 hover:bg-slate-900/10 focus-visible:outline-slate-500',
	ghost: 'bg-transparent text-slate-800 hover:bg-slate-900/10 focus-visible:outline-slate-400'
} as const;

type Variant = keyof typeof variantClasses;

type ButtonProps = {
	variant?: Variant;
	icon?: ReactNode;
	isLoading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
	const {
		variant = 'primary',
		icon,
		isLoading = false,
		className,
		children,
		disabled,
		type,
		...rest
	} = props;
	const resolvedVariant: Variant = variant ?? 'primary';
	const isDisabled = disabled ?? isLoading;
	const resolvedType = type ?? 'button';

	return (
		<button
			ref={ref}
			type={resolvedType}
			disabled={isDisabled}
			{...rest}
			className={cn(
				'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
				variantClasses[resolvedVariant],
				className
			)}
			aria-busy={isLoading || undefined}
		>
			{isLoading ? (
				<span className="loading loading-spinner loading-sm" aria-hidden />
			) : null}
			{!isLoading && icon ? <span aria-hidden>{icon}</span> : null}
			<span>{children}</span>
		</button>
	);
});

Button.displayName = 'Button';
