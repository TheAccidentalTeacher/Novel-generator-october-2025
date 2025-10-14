import { NavLink, Outlet } from 'react-router-dom';

type NavigationItem = {
	path: string;
	label: string;
	end?: boolean;
};

const navigation: NavigationItem[] = [
	{ path: '/', label: 'Dashboard', end: true },
	{ path: '/jobs', label: 'Jobs' },
	{ path: '/monitoring', label: 'Monitoring' }
];

const linkClassName = ({ isActive }: { isActive: boolean }) =>
	`app-nav__link${isActive ? ' app-nav__link--active' : ''}`;

export const AppLayout = (): JSX.Element => (
	<div className="app-shell" data-theme="lwb">
		<header className="app-shell__header">
			<div className="app-shell__brand">
				<span className="app-shell__badge">Phase 7</span>
				<h1 className="app-shell__title">LetsWriteABook Ops Console</h1>
			</div>
			<nav className="app-nav" aria-label="Primary navigation">
				{navigation.map(({ path, label, end }) => (
					<NavLink key={path} to={path} end={end} className={linkClassName}>
						{label}
					</NavLink>
				))}
			</nav>
		</header>
		<main className="app-shell__main">
			<Outlet />
		</main>
		<footer className="app-shell__footer">
			<p>
				Realtime data is simulated until the WebSocket gateway ships. Review the rebuild playbook for
				progress updates.
			</p>
		</footer>
	</div>
);
