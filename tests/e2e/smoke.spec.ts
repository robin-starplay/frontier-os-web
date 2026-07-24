import { expect, test } from '@playwright/test';
import { clickNavLink, createTestWorkspace, gotoAndAssertUsable, installGuardrails, visibleText } from './helpers';

const ROUTES = [
  '/',
  '/app/run',
  '/app/compare',
  '/app/origination',
  '/request-pilot',
  '/pricing',
  '/trust',
  '/ai-risk',
];

test.describe('routing smoke', () => {
  for (const route of ROUTES) {
    test(`${route} loads a usable page`, async ({ page }, testInfo) => {
      const assertClean = installGuardrails(page, testInfo);
      await gotoAndAssertUsable(page, route);
      await assertClean();
    });
  }
});

test('desktop navigation reaches primary product pages', async ({ page }, testInfo) => {
  const assertClean = installGuardrails(page, testInfo);

  await createTestWorkspace(page);
  await gotoAndAssertUsable(page, '/');

  await clickNavLink(page, /^Review$/i);
  await expect(page).toHaveURL(/\/app\/run/);
  await visibleText(page, /investment review|form a source-backed initial view/i);

  await clickNavLink(page, /^Pipeline$/i);
  await expect(page).toHaveURL(/\/app\/cockpit/);
  await visibleText(page, /cockpit|pipeline|saved runs/i);

  await clickNavLink(page, /^Compare$/i);
  await expect(page).toHaveURL(/\/app\/compare/);
  await visibleText(page, /compare opportunities|consistent evidence and thesis basis/i);

  await clickNavLink(page, /^Discover$/i);
  await expect(page).toHaveURL(/\/app\/origination/);
  await visibleText(page, /discover opportunities|investment thesis|known target universe/i);

  await page.getByRole('navigation').first().getByRole('button', { name: /^More/i }).click();
  await page.getByRole('navigation').first().getByRole('menuitem', { name: 'Pricing', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/pricing/);
  await visibleText(page, /pricing|start free|request pilot/i);

  await page.getByRole('navigation').first().getByRole('button', { name: /^More/i }).click();
  await page.getByRole('navigation').first().getByRole('menuitem', { name: 'AI risk', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/app\/ai-risk/);
  await visibleText(page, /AI risk|AI replica|defensibility/i);

  await page.getByRole('navigation').first().getByRole('button', { name: /^More/i }).click();
  await page.getByRole('navigation').first().getByRole('menuitem', { name: 'Trust', exact: true }).click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/trust/);
  await visibleText(page, /trust|evidence|security/i);

  await assertClean();
});
