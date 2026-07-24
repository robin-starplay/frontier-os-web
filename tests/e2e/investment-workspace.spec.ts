import { expect, test } from '@playwright/test';
import { createTestWorkspace } from './helpers';

const corePages = [
  { path: '/app/origination', title: 'Discover opportunities', purpose: 'Build and qualify a target universe against an investment thesis.' },
  { path: '/app/run', title: 'Investment review', purpose: 'Form a source-backed initial view of an opportunity and identify what must be proven next.' },
  { path: '/app/cockpit', title: 'Pipeline', purpose: 'Track opportunities, investment decisions and the work required to reach the next stage.' },
  { path: '/app/compare', title: 'Compare opportunities', purpose: 'Compare investment opportunities on a consistent evidence and thesis basis.' },
];

test('core workflow uses canonical navigation and places active work in the initial viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await createTestWorkspace(page);

  for (const item of corePages) {
    await page.goto(item.path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: item.title })).toBeVisible();
    await expect(page.getByText(item.purpose, { exact: true }).first()).toBeVisible();
    const headingBox = await page.getByRole('heading', { level: 1, name: item.title }).boundingBox();
    expect(headingBox).not.toBeNull();
    expect(headingBox!.y).toBeLessThan(320);
    await expect(page.getByTestId('environment-banner')).toHaveCount(1);
  }

  const nav = page.getByRole('navigation').first();
  for (const label of ['Discover', 'Review', 'Pipeline', 'Compare']) {
    await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
});

test('authenticated pipeline does not claim browser-only persistence', async ({ page }) => {
  await createTestWorkspace(page);
  await page.goto('/app/cockpit', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).not.toContainText('Runs are saved locally in this browser.');
  await expect(page.locator('body')).not.toContainText('Deal pipeline is stored locally in this browser.');
});

test('compare discloses preliminary evidence maturity', async ({ page }) => {
  await createTestWorkspace(page);
  await page.goto('/app/compare', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Preliminary comparison', { exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).toContainText(/screened|reviewed|evidence/i);
});

test('prohibited competitor wording is absent from core pages', async ({ page }) => {
  await createTestWorkspace(page);
  const prohibited = /right-hand system|speed of judgement|investment DNA|applied specialised intelligence|decision infrastructure/i;
  for (const item of corePages) {
    await page.goto(item.path, { waitUntil: 'domcontentloaded' });
    expect(await page.locator('body').innerText()).not.toMatch(prohibited);
  }
});
