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
  await expect(page.getByRole('link', { name: /Originate Open workflow step/i })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Screen Open workflow step/i })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Save to Cockpit Open workflow step/i })).toHaveCount(1);
  await expect(page.getByRole('link', { name: /Compare Open workflow step/i })).toHaveCount(1);
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
