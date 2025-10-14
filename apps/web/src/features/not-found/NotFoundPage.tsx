import { Link } from 'react-router-dom';

export const NotFoundPage = (): JSX.Element => (
	<section className="page">
		<header className="page__header">
			<h2>Page not found</h2>
			<p>The route you requested is not part of the Phase 7 console yet.</p>
		</header>
		<div className="page__content page__content--stacked">
			<div className="empty-state">
				<p>
					Need a different view? Return to the <Link to="/">dashboard</Link> or check the rebuild
					playbook for roadmap updates.
				</p>
			</div>
		</div>
	</section>
);
