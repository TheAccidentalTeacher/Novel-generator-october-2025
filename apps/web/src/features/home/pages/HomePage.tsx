import { Link } from 'react-router-dom';
import { Button, Card, CardContent, CardFooter, CardHeader, StatusBadge } from '@letswriteabook/ui';

export const HomePage = (): JSX.Element => (
	<section className="page">
		<header className="page__header">
			<h2>Welcome back, storyteller.</h2>
			<p>
				Track AI-assisted writing runs, monitor queue health, and follow realtime synthesis as we bring
				the new console to life.
			</p>
		</header>
		<div className="page__content">
			<Card>
				<CardHeader
					title="Queue a generation job"
					description="Submit a new novel run with the in-progress generation form."
					actions={<StatusBadge tone="info">alpha</StatusBadge>}
				/>
				<CardContent>
					<p>
						Experiment with the rebuilt generation workflow. When the backend is offline we\'ll return a
						placeholder job so you can continue exploring the UI.
					</p>
				</CardContent>
				<CardFooter className="justify-start">
					<Link to="/generation">
						<Button variant="secondary">Open generation form</Button>
					</Link>
				</CardFooter>
			</Card>
			<Card>
				<CardHeader
					title="Realtime demo"
					description="Browse placeholder jobs and drill into a simulated realtime stream while the gateway is finalized."
					actions={<StatusBadge tone="warning">preview</StatusBadge>}
				/>
				<CardContent>
					<p>
						Follow a streaming walkthrough of realtime events using the in-progress messaging layer. Ideal for
							verifying payload fidelity while backend work continues.
					</p>
				</CardContent>
				<CardFooter className="justify-start">
					<Link to="/jobs">
						<Button>Open job dashboard</Button>
					</Link>
				</CardFooter>
			</Card>
			<Card>
				<CardHeader
					title="System health"
					description="Review worker utilisation, queue depth, and recent deploys."
				/>
				<CardContent>
					<p>
						Dive into throughput metrics, queue backlogs, and recent deploy history to keep tabs on overall
						system stability.
					</p>
				</CardContent>
				<CardFooter className="justify-start">
					<Link to="/monitoring">
						<Button variant="secondary">View monitoring overview</Button>
					</Link>
				</CardFooter>
			</Card>
		</div>
	</section>
);
