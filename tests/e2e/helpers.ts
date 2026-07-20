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
    if (/\/api\/(workspace\/session|usage\/status).*access control checks/i.test(error.message)) return;
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

export async function mockWorkspaceApis(page: Page) {
  await page.route(/\/api\/workspace\/session(?:\?|$)/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ok',
      workspace_id: 'e2e-local-workspace',
      user_id: 'e2e-local-user',
      plan_id: 'free_trial',
    }),
  }));
  await page.route(/\/api\/cockpit\/runs(?:\?|$)/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.route(/\/api\/cockpit\/summary(?:\?|$)/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      total_runs: 0,
      financials_count: 0,
      high_ai_risk_count: 0,
      blockers_count: 0,
      compared_count: 0,
    }),
  }));
}

export async function createTestWorkspace(page: Page) {
  await page.goto('/create-workspace', { waitUntil: 'domcontentloaded' });

  const workspaceExists = await page.evaluate(() => {
    try {
      const trial = JSON.parse(localStorage.getItem('frontier_trial_account') || 'null') as { plan_id?: string } | null;
      return trial?.plan_id === 'free_trial' || Boolean(localStorage.getItem('frontier_workspace_id'));
    } catch {
      return false;
    }
  });

  if (!workspaceExists) {
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

    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await expect.poll(
    () => page.evaluate(() => {
      try {
        const trial = JSON.parse(localStorage.getItem('frontier_trial_account') || 'null') as { plan_id?: string } | null;
        return trial?.plan_id === 'free_trial' || Boolean(localStorage.getItem('frontier_workspace_id'));
      } catch {
        return false;
      }
    }),
    { message: 'Workspace state should be persisted before app navigation', timeout: 30_000 },
  ).toBe(true);

  await expect(page.getByRole('heading', { name: /continue your beta workspace/i })).toBeVisible();
}

export async function fillRunScreen(page: Page, company: string, website: string) {
  await page.getByLabel(/company name/i).first().fill(company);
  await page.getByLabel(/website/i).first().fill(website);
}

export async function visibleText(page: Page, pattern: RegExp) {
  await expect(page.locator('body')).toContainText(pattern);
}
