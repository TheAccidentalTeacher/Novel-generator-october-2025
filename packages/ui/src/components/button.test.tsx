import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
	it('renders children and supports variants', () => {
		render(<Button variant="secondary">Click me</Button>);

		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
	});

	it('defaults type to button and allows override', () => {
		render(
			<>
				<Button>Action</Button>
				<Button type="submit">Submit</Button>
			</>
		);
		const button = screen.getByRole('button', { name: 'Action' });
		const submit = screen.getByRole('button', { name: 'Submit' });

		expect(button).toHaveAttribute('type', 'button');
		expect(submit).toHaveAttribute('type', 'submit');
	});

	it('disables interaction while loading and sets aria-busy', () => {
		render(
			<Button isLoading icon="✓">
				Submitting
			</Button>
		);

		const button = screen.getByRole('button', { name: 'Submitting' });

		expect(button).toBeDisabled();
		expect(button).toHaveAttribute('aria-busy', 'true');
		expect(button.querySelector('.loading-spinner')).not.toBeNull();
		expect(screen.queryByText('✓')).not.toBeInTheDocument();
		expect(button).toHaveTextContent('Submitting');
	});

	it('honours explicit disabled prop when not loading', () => {
		render(
			<Button disabled icon="→">
				Next
			</Button>
		);

		const button = screen.getByRole('button', { name: 'Next' });

		expect(button).toBeDisabled();
		expect(button).not.toHaveAttribute('aria-busy');
		expect(screen.getByText('→')).toBeInTheDocument();
	});

	it('does not leak isLoading prop to the DOM', () => {
		render(<Button isLoading={false}>Ready</Button>);

		const button = screen.getByRole('button', { name: 'Ready' });

		expect(button).not.toHaveAttribute('isloading');
		expect(button).not.toHaveAttribute('isLoading');
	});
});
