import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/testing-library';

import { GenerationForm } from './GenerationForm';
import { defaultGenerationFormValues } from '@/features/generation/validators/generation-schema';

const meta = {
	title: 'Features/Generation/GenerationForm',
	component: GenerationForm,
	tags: ['autodocs'],
	args: {
		initialValues: defaultGenerationFormValues,
		isSubmitting: false,
		onSubmit: async () => undefined
	},
	argTypes: {
		onSubmit: { action: 'submitted' }
	},
	parameters: {
		layout: 'centered'
	}
} satisfies Meta<typeof GenerationForm>;

export default meta;

type Story = StoryObj<typeof GenerationForm>;

export const Default: Story = {};

export const Prefilled: Story = {
	args: {
		initialValues: {
			...defaultGenerationFormValues,
			title: 'Echoes of Auriga',
			premise:
				'A reluctant diplomat must broker peace with an ancient AI colony before it reignites a galaxy-spanning war.',
			subgenre: 'Diplomatic sci-fi',
			targetWordCount: 85_000,
			targetChapters: 18,
			humanLikeWriting: false
		}
	}
};

export const SubmissionInProgress: Story = {
	args: {
		isSubmitting: true
	}
};

export const ValidationErrors: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const user = userEvent.setup();

		await user.click(canvas.getByRole('button', { name: /queue generation job/i }));
	}
};
