import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
	it('renders children text', () => {
		render(<StatusBadge>Status</StatusBadge>);

		expect(screen.getByText('Status')).toBeInTheDocument();
	});

	it('supports icons', () => {
		render(
			<StatusBadge icon={<span role="img" aria-label="check">
					✓
				</span>}>
				Completed
			</StatusBadge>
		);

		expect(screen.getByText('Completed')).toBeInTheDocument();
		expect(screen.getByLabelText('check')).toBeInTheDocument();
	});

	it('applies tone classes', () => {
		const { rerender, container } = render(
			<StatusBadge tone="info">Info</StatusBadge>
		);
		const badge = container.firstElementChild as HTMLElement | null;
		expect(badge).not.toBeNull();
		expect(badge?.className).toContain('bg-[var(--badge-info-bg)]');
		expect(badge?.className).toContain('text-[var(--badge-info-fg)]');

		rerender(
			<StatusBadge tone="danger">
				Alert
			</StatusBadge>
		);

		const alert = container.firstElementChild as HTMLElement | null;
		expect(alert).not.toBeNull();
		expect(alert?.className).toContain('bg-[var(--badge-danger-bg)]');
		expect(alert?.className).toContain('text-[var(--badge-danger-fg)]');
	});
});
