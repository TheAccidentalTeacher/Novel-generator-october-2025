import type { Meta, StoryObj } from '@storybook/react';
import { StatusBadge } from '@letswriteabook/ui';

const meta = {
	title: 'UI/StatusBadge',
	component: StatusBadge,
	tags: ['autodocs'],
	args: {
		children: 'In progress',
		tone: 'info'
	},
	argTypes: {
		tone: {
			control: 'inline-radio',
			options: ['neutral', 'info', 'success', 'warning', 'danger']
		}
	}
} satisfies Meta<typeof StatusBadge>;

export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Info: Story = {};

export const Success: Story = {
	args: {
		tone: 'success',
		children: 'All systems go'
	}
};

export const WithIcon: Story = {
	args: {
		tone: 'warning',
		children: 'Attention required',
		icon: '⚠'
	}
};

export const DarkTheme: Story = {
	parameters: {
		backgrounds: {
			default: 'Night'
		}
	},
	args: {
		tone: 'danger',
		children: 'Escalated'
	}
};
