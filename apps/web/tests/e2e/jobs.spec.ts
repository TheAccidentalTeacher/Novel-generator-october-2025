import { expect, test } from '@playwright/test';

const basePaths = {
	jobs: '/jobs'
};

test.describe('Jobs dashboard', () => {
	test('shows placeholder job list when API is offline', async ({ page }) => {
		await page.goto(basePaths.jobs);

		await expect(page.getByRole('heading', { name: 'Novel generation jobs' })).toBeVisible();
		await expect(page.getByText('Using placeholder data')).toBeVisible();

		const timelineButtons = page.getByRole('button', { name: 'View timeline' });
		await expect(timelineButtons).not.toHaveCount(0);
	});

	test('navigates from list to job detail placeholder', async ({ page }) => {
		await page.goto(basePaths.jobs);

		const firstTimelineLink = page.getByRole('link', { name: 'View timeline' }).first();
		await firstTimelineLink.click();

		await expect(page).toHaveURL(/\/jobs\//);
		await expect(page.getByRole('heading', { name: 'Job timeline' })).toBeVisible();
		await expect(page.getByText('Using placeholder data')).toBeVisible();
		await expect(page.getByText('Realtime:')).toBeVisible();
	});
});
