import { expect, test, type Page } from '@playwright/test';
import { createTestWorkspace, mockWorkspaceApis } from './helpers';

async function prepareWorkspace(page: Page) {
  await mockWorkspaceApis(page);
  await page.route('**/api/usage/status*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'ok',
      url_only_analyses: { used: 0, limit: 5, remaining: 5 },
      screen_limit: 5,
      screens_used: 0,
      screens_remaining: 5,
      origination: { used: 0, limit: null, remaining: null, quota_enforced: false },
      origination_limit: null,
      origination_used: 0,
      origination_remaining: null,
    }),
  }));
  await createTestWorkspace(page);
}

test('application More menu remains compact, accessible and inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepareWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'More' }).click();

  const menu = page.locator('[data-app-more-menu]');
  await expect(menu).toBeVisible();
  for (const label of ['Request pilot', 'Book intro', 'Workspace', 'Exports', 'Evidence workflow', 'FAQ', 'Feedback']) {
    await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
  }

  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  expect(menuBox!.x).toBeGreaterThanOrEqual(0);
  expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(1280);
  expect(menuBox!.width).toBeGreaterThanOrEqual(220);
  expect(menuBox!.width).toBeLessThanOrEqual(240);

  const itemStyles = await menu.locator('[data-app-more-item]').evaluateAll(items => items.map(item => {
    const style = getComputedStyle(item);
    return {
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      height: Math.round(item.getBoundingClientRect().height),
    };
  }));
  expect(new Set(itemStyles.map(style => style.fontSize))).toEqual(new Set(['14px']));
  expect(new Set(itemStyles.map(style => style.fontWeight))).toEqual(new Set(['500']));
  expect(new Set(itemStyles.map(style => style.lineHeight))).toEqual(new Set(['20px']));
  expect(itemStyles.every(style => style.height >= 36 && style.height <= 38)).toBe(true);
});

for (const viewport of [
  { width: 390, columns: 1 },
  { width: 768, columns: 2 },
  { width: 1024, columns: 2 },
  { width: 1280, columns: 2 },
  { width: 1440, columns: 2 },
  { width: 1680, columns: 2 },
  { width: 1920, columns: 2 },
]) {
  test(`Origination Workspace uses ${viewport.columns} column layout at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: 1000 });
    await prepareWorkspace(page);
    await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });

    const workspace = page.locator('[data-origination-workspace]');
    const sections = workspace.locator('[data-workspace-section]');
    await expect(workspace).toBeVisible();
    const boxes = await sections.evaluateAll(items => items.map(item => {
      const box = item.getBoundingClientRect();
      return { left: Math.round(box.left), top: Math.round(box.top), width: Math.round(box.width) };
    }));
    const columns = new Set(boxes.map(box => box.left)).size;
    expect(columns).toBe(viewport.columns);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

    if (viewport.columns === 2) {
      const history = boxes[0];
      const savedLeads = boxes[1];
      expect(Math.abs(savedLeads.width - history.width)).toBeLessThanOrEqual(2);
      const workspaceBox = await workspace.boundingBox();
      expect(workspaceBox).not.toBeNull();
      expect(workspaceBox!.width).toBeLessThanOrEqual(1520);
    }
  });
}

test('saved lead cards keep names, domains and actions scannable', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepareWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('frontier_saved_leads', JSON.stringify([{
      id: 'basis-vectors',
      company_name: 'Basis Vectors Capital with a deliberately long acquisition target name',
      website: 'https://www.basisvectors.example.com/a/very/long/path/that/should/not/wrap',
      jurisdiction: 'UK',
      sector: 'Software',
      source: 'origination',
      source_label: 'Web source extraction',
      source_url: 'https://source.example.com/listicle',
      candidate_type: 'company_candidate',
      evidence_confidence: 'Partial',
      candidate_quality: 'medium',
      website_status: 'likely_official',
      run_ready: true,
      compare_ready: true,
      screening_status: 'not_screened',
      saved_at: '2026-07-10T08:25:00Z',
    }]));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });

  await expect(page.getByText(/Basis Vectors Capital with a deliberately long/i)).toBeVisible();
  const domain = page.locator('[data-saved-lead-domain]').first();
  await expect(domain).toContainText('basisvectors.example.com');
  await expect(domain).toHaveCSS('white-space', 'nowrap');
  await expect(domain).toHaveCSS('text-overflow', 'ellipsis');
  await expect(page.getByRole('button', { name: 'Screen company', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to Compare', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeVisible();
});

test('workspace account control labels usage as company screens', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepareWorkspace(page);
  await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });

  const account = page.locator('[data-header-account]');
  await expect(account).toHaveAccessibleName(/company screens remaining/i);
  await expect(account).toContainText('5/5 Screens');
  await expect(account).not.toHaveAccessibleName(/product quota|global quota/i);
});
