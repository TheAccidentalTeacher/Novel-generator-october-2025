import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Card, CardContent, CardFooter, CardHeader } from './card';

describe('Card', () => {
	it('renders children within article element', () => {
		render(
			<Card data-testid="card">
				<span>Body</span>
			</Card>
		);

		const card = screen.getByTestId('card');
		expect(card).toHaveClass('rounded-2xl');
		expect(card).toHaveTextContent('Body');
		expect(card.tagName).toBe('ARTICLE');
	});

	it('CardHeader hides when nothing is provided', () => {
		render(
			<Card>
				<CardHeader />
				<CardContent>Content</CardContent>
			</Card>
		);

		expect(screen.getByText('Content')).toBeInTheDocument();
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
	});

	it('CardHeader renders title, description, and actions', () => {
		render(
			<Card>
				<CardHeader title="Summary" description="Latest status" actions={<button>Action</button>} />
			</Card>
		);

		expect(screen.getByRole('heading', { name: 'Summary' })).toBeInTheDocument();
		expect(screen.getByText('Latest status')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
	});

	it('CardContent renders text blocks', () => {
		render(
			<Card>
				<CardContent>
					<p>Line 1</p>
					<p>Line 2</p>
				</CardContent>
			</Card>
		);

		expect(screen.getByText('Line 1')).toBeInTheDocument();
		expect(screen.getByText('Line 2')).toBeInTheDocument();
	});

	it('CardFooter aligns actions to the end', () => {
		render(
			<Card>
				<CardFooter>
					<button>Save</button>
				</CardFooter>
			</Card>
		);

		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
	});
});
