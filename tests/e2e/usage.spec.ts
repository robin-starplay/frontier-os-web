import { expect, test, type Page } from '@playwright/test';
import { createTestWorkspace } from './helpers';

const SCREEN_QUOTA_COPY = 'You have used your beta company screens for this month.';

function usageResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ok',
    plan_id: 'free_trial',
    period: 'monthly',
    url_only_analyses: { used: 5, limit: 5, remaining: 0 },
    screen_limit: 5,
    screens_used: 5,
    screens_remaining: 0,
    origination: { used: 0, limit: null, remaining: null, quota_enforced: false },
    origination_limit: null,
    origination_used: 0,
    origination_remaining: null,
    quota_source: 'private_beta_usage_store',
    ...overrides,
  };
}

async function mockUsageStatus(page: Page, body: Record<string, unknown>) {
  await page.route('**/api/usage/status*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  }));
}

test('exhausted screen allowance does not block or warn on Origination', async ({ page }) => {
  await mockUsageStatus(page, usageResponse());
  await createTestWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /find companies/i })).toBeEnabled();
});

test('Screen page shows workflow-specific exhausted allowance copy', async ({ page }) => {
  await mockUsageStatus(page, usageResponse());
  await createTestWorkspace(page);
  await page.goto('/app/run', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toBeVisible();
});

test('Origination shows a backend message only for an enforced reached Origination limit', async ({ page }) => {
  const backendMessage = 'Your Origination pilot allowance has been used for this month.';
  await mockUsageStatus(page, usageResponse({
    origination: {
      used: 2,
      limit: 2,
      remaining: 0,
      quota_enforced: true,
      message: backendMessage,
      recommended_action: 'Book an intro',
    },
    origination_limit: 2,
    origination_used: 2,
    origination_remaining: 0,
  }));
  await createTestWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText(backendMessage, { exact: true })).toBeVisible();
  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toHaveCount(0);
});

test('Origination provider errors retain provider copy without screen quota wording', async ({ page }) => {
  const providerMessage = 'The discovery provider is temporarily rate limited. Try again shortly.';
  await mockUsageStatus(page, usageResponse());
  await page.route('**/api/origination/jobs', route => route.fulfill({ status: 404, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/origination/thesis', route => route.fulfill({
    status: 429,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'error',
      error: 'provider_rate_limit',
      quota_type: 'openai',
      error_code: 'OPENAI_RATE_LIMITED',
      message: providerMessage,
    }),
  }));
  await createTestWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await page.getByLabel(/describe the companies you want to find/i).fill('UK vertical software targets');
  await page.getByRole('button', { name: /find companies/i }).click();

  await expect(page.locator('span').getByText(providerMessage, { exact: true })).toBeVisible();
  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toHaveCount(0);
});

test('screen quota notice does not persist when navigating to Origination', async ({ page }) => {
  await mockUsageStatus(page, usageResponse());
  await createTestWorkspace(page);
  await page.goto('/app/run', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toBeVisible();

  await page.getByRole('navigation').first().getByRole('link', { name: 'Discover' }).click();
  await expect(page).toHaveURL(/\/app\/origination/);
  await expect(page.getByText(SCREEN_QUOTA_COPY, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /find companies/i })).toBeEnabled();
});
