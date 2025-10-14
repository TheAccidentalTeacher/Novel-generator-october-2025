import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@letswriteabook/ui';

const meta = {
	title: 'UI/Button',
	component: Button,
	tags: ['autodocs'],
	args: {
		children: 'Primary action'
	},
	argTypes: {
		onClick: { action: 'clicked' },
		variant: {
			control: 'radio',
			options: ['primary', 'secondary', 'ghost']
		}
	}
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = {
	args: {
		variant: 'secondary',
		children: 'Secondary action'
	}
};

export const WithIcon: Story = {
	args: {
		children: 'Open timeline',
		icon: '↗'
	}
};

export const Loading: Story = {
	args: {
		isLoading: true,
		children: 'Loading state'
	}
};
