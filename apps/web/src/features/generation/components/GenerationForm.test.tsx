import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GenerationFormValues } from '@/features/generation/validators/generation-schema';
import { defaultGenerationFormValues } from '@/features/generation/validators/generation-schema';

import { GenerationForm } from './GenerationForm';

describe('GenerationForm', () => {
	const createValidValues = (): GenerationFormValues => ({
		title: 'The Stars Between Us',
		premise:
			'A botanist aboard a generation ship uncovers a conspiracy to steer humanity away from its new home.',
		genre: 'science-fiction',
		subgenre: 'Space opera',
		targetWordCount: 100_000,
		targetChapters: 24,
		humanLikeWriting: true
	});

	it('submits parsed form values when validation succeeds', async () => {
		const onSubmit = vi.fn();
		const user = userEvent.setup();

		renderGenerationForm(onSubmit);

		await fillForm(user, {
			title: 'Echoes of Auriga',
			premise:
				'A reluctant diplomat must broker peace with an ancient AI colony before it reignites a galaxy-spanning war.',
			subgenre: 'Diplomatic sci-fi',
			targetWordCount: '85000',
			targetChapters: '18',
			humanLikeWriting: false,
			genre: 'science-fiction'
		});

		await user.click(screen.getByRole('button', { name: /queue generation job/i }));

		await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
		const submitted = onSubmit.mock.calls[0]?.[0] as GenerationFormValues | undefined;

		expect(submitted).toEqual({
			title: 'Echoes of Auriga',
			premise:
				'A reluctant diplomat must broker peace with an ancient AI colony before it reignites a galaxy-spanning war.',
			genre: 'science-fiction',
			subgenre: 'Diplomatic sci-fi',
			targetWordCount: 85_000,
			targetChapters: 18,
			humanLikeWriting: false
		});
	});

	it('prevents submission and shows validation messages when values are invalid', async () => {
		const onSubmit = vi.fn();
		const user = userEvent.setup();

		renderGenerationForm(onSubmit, {
			...defaultGenerationFormValues,
			title: '',
			premise: '',
			subgenre: '',
			targetWordCount: 0,
			targetChapters: 0
		});

		await user.click(screen.getByRole('button', { name: /queue generation job/i }));

		await screen.findByText('Title must be at least 3 characters long.');
		expect(screen.getByText('Premise must be at least 20 characters long.')).toBeInTheDocument();
		expect(screen.getByText('Target word count must be at least 1,000 words.')).toBeInTheDocument();
		expect(screen.getByText('Target chapters must be at least 1.')).toBeInTheDocument();
		expect(
			screen.getByText(/some fields need attention\. please review the highlighted inputs\./i)
		).toBeInTheDocument();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('clears field-specific validation errors when the user corrects the input', async () => {
		const user = userEvent.setup();
		const initialValues = { ...createValidValues(), title: 'ab' };

		renderGenerationForm(vi.fn(), initialValues);

		await user.click(screen.getByRole('button', { name: /queue generation job/i }));

		await screen.findByText('Title must be at least 3 characters long.');

		const titleInput = screen.getByLabelText(/title/i);
		await user.type(titleInput, 'c');

		await waitFor(() =>
			expect(screen.queryByText('Title must be at least 3 characters long.')).not.toBeInTheDocument()
		);
	});

	it('surfaces numeric range errors for out-of-bounds inputs', async () => {
		const user = userEvent.setup();
		const initialValues = createValidValues();

		renderGenerationForm(vi.fn(), initialValues);

		const wordCountInput = screen.getByLabelText(/target word count/i);
		await user.clear(wordCountInput);
		await user.type(wordCountInput, '500');

		await user.click(screen.getByRole('button', { name: /queue generation job/i }));

		await screen.findByText('Target word count must be at least 1,000 words.');
	});

	it('renders provided initial values', () => {
		const initialValues = createValidValues();

		renderGenerationForm(vi.fn(), initialValues);

		expect(screen.getByLabelText(/title/i)).toHaveValue(initialValues.title);
		expect(screen.getByLabelText(/premise/i)).toHaveValue(initialValues.premise);
		expect(screen.getByLabelText(/^genre$/i)).toHaveValue(initialValues.genre);
		expect(screen.getByLabelText(/subgenre/i)).toHaveValue(initialValues.subgenre);
		expect(screen.getByLabelText(/target word count/i)).toHaveValue(initialValues.targetWordCount);
		expect(screen.getByLabelText(/target chapters/i)).toHaveValue(initialValues.targetChapters);
		expect(screen.getByLabelText(/emulate human-like stylistic choices/i)).toBeChecked();
	});

	it('shows a submission error banner when submit fails with a friendly message', async () => {
	const user = userEvent.setup();
	const initialValues = createValidValues();
	const onSubmit = vi.fn().mockRejectedValueOnce(new Error('We\'re receiving too many requests right now. Please wait a moment and try again.'));

	renderGenerationForm(onSubmit, initialValues);

	await user.click(screen.getByRole('button', { name: /queue generation job/i }));

	await screen.findByText(/too many requests right now/i);
});

		it('shows a token limit warning when average chapter length exceeds 8,000 words', async () => {
			const user = userEvent.setup();
			renderGenerationForm(vi.fn(), {
				...defaultGenerationFormValues,
				title: 'Big Chapters',
				premise: 'A very long story premise that meets the minimum length requirements.',
				genre: 'science-fiction',
				subgenre: 'Space opera',
				targetWordCount: 100_000,
				targetChapters: 10,
				humanLikeWriting: true
			});

			// 100,000 / 10 = 10,000 > 8,000 triggers the warning
			await user.click(screen.getByRole('button', { name: /queue generation job/i }));
			expect(
				screen.getByText(/very large chapters may hit ai token limits/i)
			).toBeInTheDocument();
		});

		it('shows a token limit warning when chapter count exceeds 40', async () => {
			const user = userEvent.setup();
			renderGenerationForm(vi.fn(), {
				...defaultGenerationFormValues,
				title: 'Many Chapters',
				premise: 'A premise long enough to pass validation easily for testing.',
				genre: 'science-fiction',
				subgenre: 'Diplomatic sci-fi',
				targetWordCount: 120_000,
				targetChapters: 41,
				humanLikeWriting: true
			});

			await user.click(screen.getByRole('button', { name: /queue generation job/i }));
			expect(
				screen.getByText(/very large novels with many chapters may exceed processing limits/i)
			).toBeInTheDocument();
		});
});

const renderGenerationForm = (
	onSubmit: (values: GenerationFormValues) => void,
	initialValues: GenerationFormValues = defaultGenerationFormValues
) => {
	const result = render(
		<GenerationForm initialValues={initialValues} isSubmitting={false} onSubmit={onSubmit} />
	);
	const form = result.container.querySelector('form');
	if (form) {
		form.setAttribute('novalidate', 'true');
	}
	return result;
};

const fillForm = async (
	user: ReturnType<typeof userEvent.setup>,
	values: {
		title: string;
		premise: string;
		subgenre: string;
		targetWordCount: string;
		targetChapters: string;
		humanLikeWriting: boolean;
		genre: GenerationFormValues['genre'];
	}
) => {
	await user.clear(screen.getByLabelText(/title/i));
	await user.type(screen.getByLabelText(/title/i), values.title);

	const premiseInput = screen.getByLabelText(/premise/i);
	await user.clear(premiseInput);
	await user.type(premiseInput, values.premise);

	await user.selectOptions(screen.getByLabelText(/^genre$/i), values.genre);

	await user.clear(screen.getByLabelText(/subgenre/i));
	await user.type(screen.getByLabelText(/subgenre/i), values.subgenre);

	await user.clear(screen.getByLabelText(/target word count/i));
	await user.type(screen.getByLabelText(/target word count/i), values.targetWordCount);

	await user.clear(screen.getByLabelText(/target chapters/i));
	await user.type(screen.getByLabelText(/target chapters/i), values.targetChapters);

	const checkbox = screen.getByLabelText(/emulate human-like stylistic choices/i) as HTMLInputElement;
	const shouldCheck = values.humanLikeWriting;

	if (checkbox.checked !== shouldCheck) {
		await user.click(checkbox);
	}
};
