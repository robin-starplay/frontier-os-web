import { expect, type Page, type TestInfo } from '@playwright/test';

const BAD_PAGE_TEXT = [
  '404: NOT_FOUND',
  'Application error',
  "This app isn't live yet",
  'Backend returned 422',
];

function ignoredUrl(url: string): boolean {
  return /favicon|googletagmanager|google-analytics|doubleclick|clarity|posthog|sentry|analytics|\/api\/workspace\/session/i.test(url);
}

export function installGuardrails(
  page: Page,
  testInfo: TestInfo,
  options: { allowApi422?: boolean } = {},
) {
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  page.on('response', response => {
    const url = response.url();
    const status = response.status();
    if (ignoredUrl(url)) return;
    if (status === 404 && isAppRoute(url)) {
      failedResponses.push(`${status} ${url}`);
    }
    if (status === 422 && !options.allowApi422 && /\/api\//.test(url)) {
      failedResponses.push(`${status} ${url}`);
    }
  });

  return async () => {
    await assertNoBadPageText(page);
    expect(pageErrors, `Unhandled page errors in ${testInfo.title}`).toEqual([]);
    expect(failedResponses, `Failed app/API responses in ${testInfo.title}`).toEqual([]);
  };
}

function isAppRoute(url: string): boolean {
  try {
    const parsed = new URL(url);
    return !/\.[a-z0-9]+$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

export async function gotoAndAssertUsable(page: Page, path: string) {
  let response = await page.goto(path, { waitUntil: 'commit', timeout: 60_000 });
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 30_000 });
  } catch {
    response = await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  }
  expect(response?.status(), `${path} should not return HTTP 404`).not.toBe(404);
  await expect(page.locator('body')).toBeVisible();
  await assertNoBadPageText(page);
}

export async function assertNoBadPageText(page: Page) {
  const body = page.locator('body');
  for (const text of BAD_PAGE_TEXT) {
    await expect(body).not.toContainText(text);
  }
}

export async function clickNavLink(page: Page, name: RegExp | string) {
  const nav = page.getByRole('navigation').first();
  await nav.getByRole('link', { name }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await assertNoBadPageText(page);
}

export async function createTestWorkspace(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const createdAt = new Date().toISOString();
    const workspaceId = 'e2e-local-workspace';
    const userId = 'e2e-local-user';
    localStorage.setItem('frontier_trial_account', JSON.stringify({
      plan_id: 'free_trial',
      url_screens_limit: 5,
      document_trials_limit: 2,
      created_at: createdAt,
      workspace_id: workspaceId,
      user_id: userId,
    }));
    localStorage.setItem('frontier_workspace_id', workspaceId);
    localStorage.setItem('frontier_user_id', userId);
    localStorage.setItem('frontier_account', JSON.stringify({
      plan_id: 'free_trial',
      mode: 'local_e2e',
      workspace_id: workspaceId,
      user_id: userId,
      created_at: createdAt,
    }));
    localStorage.setItem('fos_profile', JSON.stringify({
      name: 'Playwright Test User',
      email: 'test@example.com',
      org: 'E2E Test',
      role: 'Tester',
    }));
  });
}

export async function fillRunScreen(page: Page, company: string, website: string) {
  await page.getByLabel(/company name/i).first().fill(company);
  await page.getByLabel(/website/i).first().fill(website);
}

export async function visibleText(page: Page, pattern: RegExp) {
  await expect(page.locator('body')).toContainText(pattern);
}
