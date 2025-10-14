import type { Meta, StoryObj } from '@storybook/react';

import { HomePage } from './HomePage';

const meta = {
	title: 'Pages/HomePage',
	component: HomePage,
	tags: ['autodocs'],
	parameters: {
		docs: {
			description: {
				component:
					'The primary landing surface for the console, highlighting realtime demos and monitoring entry points.'
			}
		}
	}
} satisfies Meta<typeof HomePage>;

export default meta;

type Story = StoryObj<typeof HomePage>;

export const Default: Story = {};
