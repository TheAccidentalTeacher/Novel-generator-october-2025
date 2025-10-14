import type { Meta, StoryObj } from '@storybook/react';
import { Button, Card, CardContent, CardFooter, CardHeader, StatusBadge } from '@letswriteabook/ui';

type CardStoryProps = Omit<React.ComponentProps<typeof Card>, 'children'> & {
	title?: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	content?: React.ReactNode;
	footer?: React.ReactNode;
};

const meta = {
	title: 'UI/Card',
	component: Card,
	tags: ['autodocs'],
	args: {
		content: (
			<>
				<p>
					LetsWriteABook surfaced five new draft concepts ready for review. You can spot-check tone, plot continuity,
					and adherence to the story bible before handing them off to the editing queue.
				</p>
				<ul className="list-disc space-y-1 pl-6 text-sm text-[var(--color-text-muted)]">
					<li>2 drafts flagged for sensitivity review</li>
					<li>1 draft exceeded target word count by 15%</li>
					<li>Average editing turnaround: 4h 12m</li>
				</ul>
			</>
		)
	},
	argTypes: {
		title: { control: 'text' },
		description: { control: 'text' }
	}
} satisfies Meta<CardStoryProps>;

export default meta;

type Story = StoryObj<CardStoryProps>;

const renderCard = ({ title, description, actions, content, footer, ...props }: CardStoryProps) => (
	<Card {...props}>
		<CardHeader title={title} description={description} actions={actions} />
		<CardContent>{content}</CardContent>
		{footer ? <CardFooter>{footer}</CardFooter> : null}
	</Card>
);

export const Default: Story = {
	args: {
		title: 'Draft curation snapshot',
		description: 'Summary of the latest generation run.'
	},
	render: renderCard
};

export const WithActions: Story = {
	args: {
		title: 'Generation queue',
		description: 'Monitor, approve, and escalate pending generations.',
		actions: <Button variant="secondary">View queue</Button>,
		footer: (
			<div className="flex w-full items-center justify-between text-sm text-[var(--color-text-muted)]">
				<span>Last updated 3 minutes ago</span>
				<Button variant="ghost">
					Refresh
				</Button>
			</div>
		)
	},
	render: renderCard
};

export const Minimal: Story = {
	args: {
		content: (
			<div className="flex items-center gap-3">
				<StatusBadge tone="info">Realtime feed</StatusBadge>
				<span className="text-sm text-[var(--color-text-secondary)]">
					Tap into the event timeline to watch token streams and AI interventions.
				</span>
			</div>
		)
	},
	render: renderCard
};

export const DarkThemeExample: Story = {
	parameters: {
		backgrounds: {
			default: 'Night'
		}
	},
	args: {
		title: 'Nightly tuning report',
		description: 'A quick glance at prompt adjustments applied during the midnight run.',
		content: (
			<strong className="text-[var(--color-text-inverse)]">
				Generated 18 alternate endings based on sentiment feedback and editor overrides.
			</strong>
		)
	},
	render: renderCard
};
