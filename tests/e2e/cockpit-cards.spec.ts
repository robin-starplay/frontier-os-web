import { expect, test } from '@playwright/test';
import { createTestWorkspace, gotoAndAssertUsable, mockWorkspaceApis } from './helpers';

const runs = [
  {
    id: 'screened-1', type: 'url', timestamp: '2026-07-19T12:00:00Z', company: 'Cerillion',
    website: 'https://www.cerillion.com/products/billing', recommendation: 'Request Financials', recommendation_level: 'amber',
    ic_readiness: 'Conditional', valuation_readiness: '', strategic_fit_label: '', evidence_confidence: 'Medium', ai_replica_risk: 'Low',
    blockers: ['ARR bridge and retention data required'], next_action: 'Cerillion: Cerillion: Request ARR bridge, retention data and customer concentration.', result: null,
  },
  {
    id: 'signal-1', type: 'origination', timestamp: '2026-07-19T11:00:00Z', company: 'Utility Signal',
    website: '', recommendation: 'Website required', recommendation_level: 'grey', ic_readiness: '', valuation_readiness: '', strategic_fit_label: '', evidence_confidence: '', ai_replica_risk: '',
    blockers: [], next_action: 'Utility Signal: verify the official website.', result: null,
  },
  {
    id: 'compare-1', type: 'compare', timestamp: '2026-07-19T10:00:00Z', company: 'Imported Candidate',
    website: 'https://www.google.com/url?q=https%3A%2F%2Fvery-long-imported-candidate-domain.example%2Fproducts%2Futilities%3Fcampaign%3Dlong', recommendation: '', recommendation_level: 'grey',
    ic_readiness: '', valuation_readiness: '', strategic_fit_label: '', evidence_confidence: 'Low', ai_replica_risk: '', blockers: [], next_action: '', result: null,
  },
];

test.beforeEach(async ({ page }) => {
  await mockWorkspaceApis(page);
  await createTestWorkspace(page);
  await page.evaluate(value => localStorage.setItem('fos_run_history', JSON.stringify(value)), runs);
  await gotoAndAssertUsable(page, '/app/cockpit');
});

test('cockpit cards use compact maturity variants and primary action hierarchy', async ({ page }) => {
  const cards = page.getByTestId('cockpit-target-card');
  await expect(cards).toHaveCount(3);

  const screened = cards.filter({ hasText: 'Cerillion' });
  await expect(screened).toHaveAttribute('data-card-variant', 'screened-target');
  await expect(screened.getByTestId('primary-actions').locator('button:not([aria-label^="More actions"])')).toHaveCount(3);
  await expect(screened.getByTestId('next-action')).toHaveText('Request ARR bridge, retention data and customer concentration.');
  await expect(screened.getByText('Ready to screen')).toHaveCount(0);
  await expect(screened.getByText('Screened', { exact: true })).toHaveCount(0);

  const signal = cards.filter({ hasText: 'Utility Signal' });
  await expect(signal).toHaveAttribute('data-card-variant', 'origination-signal');
  await expect(signal.getByRole('button', { name: 'Add website' })).toBeVisible();
  await expect(signal.getByText('Main blocker')).toHaveCount(0);
  await expect(signal.getByTestId('next-action')).toHaveText('Verify the official company website.');
  await expect(signal.getByText(/Discovered 19 Jul/)).toBeVisible();

  const imported = cards.filter({ hasText: 'Imported Candidate' });
  await expect(imported).toHaveAttribute('data-card-variant', 'individual-screen');
  await expect(imported.getByRole('link', { name: 'Individual screen' })).toBeVisible();
  await expect(imported.getByTestId('next-action')).toHaveText('Run an individual company screen before comparison.');
  await expect(imported.getByText(/Imported 19 Jul/)).toBeVisible();
  await expect(imported.getByText('very-long-imported-candidate-domain.example')).toBeVisible();
  await expect(imported.getByText(/google\.com\/url/)).toHaveCount(0);
});

test('secondary actions and destructive remove remain keyboard accessible', async ({ page }) => {
  const screened = page.getByTestId('cockpit-target-card').filter({ hasText: 'Cerillion' });
  const more = screened.getByRole('button', { name: 'More actions for Cerillion' });
  await more.focus();
  await page.keyboard.press('Enter');

  const edit = page.getByRole('menuitem', { name: 'Edit', exact: true });
  const rescreen = page.getByRole('menuitem', { name: 'Re-screen' });
  const remove = page.getByRole('menuitem', { name: 'Remove target' });
  await expect(edit).toBeVisible();
  await expect(rescreen).toBeVisible();
  await expect(remove).toBeVisible();

  const [editBox, rescreenBox] = await Promise.all([edit.boundingBox(), rescreen.boundingBox()]);
  expect(editBox?.height).toBe(rescreenBox?.height);
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu')).toBeVisible();
});

test('cockpit cards do not overflow common viewport widths', async ({ page }) => {
  for (const width of [390, 768, 1024, 1280, 1440, 1680, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
});
