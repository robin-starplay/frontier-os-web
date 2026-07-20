import { expect, test } from '@playwright/test';
import { createTestWorkspace } from './helpers';

const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 900 },
  { width: 1440, height: 900 },
  { width: 1680, height: 1050 },
  { width: 1920, height: 1080 },
];

for (const viewport of viewports) {
  test(`key public layouts do not overflow at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await createTestWorkspace(page);
    for (const path of ['/pricing', '/trust', '/how-it-works', '/create-workspace']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `${path} overflows at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.viewport + 1);
      await expect(page.locator('h1').first()).toBeVisible();
    }
  });
}

for (const viewport of viewports) {
  test(`public header remains contained at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/how-it-works', { waitUntil: 'domcontentloaded' });

    const header = page.getByRole('navigation').first();
    const headerBox = await header.boundingBox();
    expect(headerBox).not.toBeNull();
    expect(headerBox!.x).toBeGreaterThanOrEqual(0);
    expect(headerBox!.x + headerBox!.width).toBeLessThanOrEqual(viewport.width + 1);

    const controlsFit = await header.locator('a:visible, button:visible').evaluateAll((controls, width) =>
      controls.every((control) => {
        const rect = control.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= Number(width) + 1;
      }), viewport.width);
    expect(controlsFit, `Header controls exceed ${viewport.width}px viewport`).toBe(true);

    const betaWorkspace = page.getByRole('link', { name: 'Beta workspace' });
    if (await betaWorkspace.isVisible()) {
      const lineCount = await betaWorkspace.evaluate((control) => {
        const range = document.createRange();
        range.selectNodeContents(control);
        return new Set(Array.from(range.getClientRects()).map(rect => Math.round(rect.top))).size;
      });
      expect(lineCount, 'Beta workspace should render on one line').toBe(1);
    }

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
  });
}

test('how it works presents one canonical workflow', async ({ page }) => {
  await page.goto('/how-it-works', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Workflow overview')).toHaveCount(0);
  await expect(page.getByText('Evidence-first', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Originate — Open workflow step', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Screen — Open workflow step', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Save to Cockpit — Open workflow step', exact: true })).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Compare — Open workflow step', exact: true })).toHaveCount(1);
});

test('public header omits the standalone beta badge', async ({ page }) => {
  await page.goto('/how-it-works', { waitUntil: 'domcontentloaded' });
  const header = page.getByRole('navigation').first();

  await expect(header.getByText('BETA', { exact: true })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Beta workspace' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await header.getByRole('button', { name: 'Toggle navigation' }).click();
  await expect(header.getByText('BETA', { exact: true })).toHaveCount(0);
  await expect(header.getByRole('link', { name: 'Beta workspace' })).toBeVisible();
});

test('pricing presents customer-facing beta access copy', async ({ page }) => {
  await page.goto('/pricing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('CTA: Stripe link loaded', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Paid beta access is currently activated manually after payment.', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Stripe checkout|activated manually after payment/i)).toHaveCount(0);
  await expect(page.getByText('Access origination, company screening, document-assisted review, Deal Cockpit and Compare.', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Book intro', { exact: true }).first()).toBeVisible();
});

test('pricing card actions share horizontal baselines', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

  const primaryTops = await page.getByRole('button', { name: /^(Start free|Start beta|Request pilot|Discuss access)/ }).evaluateAll(
    buttons => buttons.map(button => Math.round(button.getBoundingClientRect().top)),
  );
  expect(primaryTops).toHaveLength(4);
  expect(new Set(primaryTops).size).toBe(1);

  const secondaryTops = await page.getByText('Book intro', { exact: true }).evaluateAll(
    links => links.slice(0, 3).map(link => Math.round(link.getBoundingClientRect().top)),
  );
  expect(secondaryTops).toHaveLength(3);
  expect(new Set(secondaryTops).size).toBe(1);
});

for (const width of [1024, 1280, 1366, 1440, 1680, 1920]) {
  test(`workspace header controls are normalised at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await createTestWorkspace(page);
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' });

    const header = page.getByRole('navigation').first();
    const navStyles = await header.locator('[data-header-nav-item]:visible').evaluateAll(items =>
      items.map(item => {
        const style = getComputedStyle(item);
        return { fontSize: style.fontSize, lineHeight: style.lineHeight };
      }));
    expect(navStyles.length).toBeGreaterThan(0);
    expect(new Set(navStyles.map(style => style.fontSize))).toEqual(new Set(['14px']));
    expect(new Set(navStyles.map(style => style.lineHeight))).toEqual(new Set(['20px']));

    const workspace = header.locator('[data-header-cta="open-workspace"]');
    const account = header.locator('[data-header-account]');
    await expect(workspace).toBeVisible();
    await expect(account).toBeVisible();
    await expect(workspace).toHaveCSS('white-space', 'nowrap');

    const workspaceBox = await workspace.boundingBox();
    const accountBox = await account.boundingBox();
    expect(workspaceBox).not.toBeNull();
    expect(accountBox).not.toBeNull();
    expect(workspaceBox!.height).toBeLessThanOrEqual(38);
    expect(workspaceBox!.height).toBe(36);
    expect(accountBox!.height).toBe(36);
    expect(Math.abs(workspaceBox!.y - accountBox!.y)).toBeLessThanOrEqual(1);
  });
}

for (const width of [1024, 1280]) {
  test(`application header uses shared navigation typography at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await createTestWorkspace(page);
    await page.goto('/app/origination', { waitUntil: 'domcontentloaded' });

    const header = page.getByRole('navigation').first();
    const navStyles = await header.locator('[data-header-nav-item]:visible').evaluateAll(items =>
      items.map(item => {
        const style = getComputedStyle(item);
        return { fontSize: style.fontSize, lineHeight: style.lineHeight, height: item.getBoundingClientRect().height };
      }));
    expect(navStyles.length).toBeGreaterThan(0);
    expect(new Set(navStyles.map(style => style.fontSize))).toEqual(new Set(['14px']));
    expect(new Set(navStyles.map(style => style.lineHeight))).toEqual(new Set(['20px']));
    expect(new Set(navStyles.map(style => style.height))).toEqual(new Set([36]));

    const accountBox = await header.locator('[data-header-account]').boundingBox();
    const themeBox = await header.getByRole('button', { name: /switch to .* theme/i }).boundingBox();
    expect(accountBox).not.toBeNull();
    expect(themeBox).not.toBeNull();
    expect(accountBox!.height).toBe(36);
    expect(themeBox!.height).toBe(36);
    expect(Math.abs(accountBox!.y - themeBox!.y)).toBeLessThanOrEqual(1);
  });
}
