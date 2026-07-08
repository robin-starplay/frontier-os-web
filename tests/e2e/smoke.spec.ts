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

  await clickNavLink(page, /^Run$/i);
  await expect(page).toHaveURL(/\/app\/run/);
  await visibleText(page, /evidence-first acquisition screen|run an evidence-first acquisition screen/i);

  await clickNavLink(page, /^Cockpit$/i);
  await expect(page).toHaveURL(/\/app\/cockpit/);
  await visibleText(page, /cockpit|pipeline|saved runs/i);

  await clickNavLink(page, /^Compare$/i);
  await expect(page).toHaveURL(/\/app\/compare/);
  await visibleText(page, /compare software acquisition targets|target comparison/i);

  await clickNavLink(page, /^Origination$/i);
  await expect(page).toHaveURL(/\/app\/origination/);
  await visibleText(page, /origination|target discovery|known target universe/i);

  await clickNavLink(page, /^Pricing$/i);
  await expect(page).toHaveURL(/\/pricing/);
  await visibleText(page, /pricing|start free|request pilot/i);

  await clickNavLink(page, /AI risk/i);
  await expect(page).toHaveURL(/\/app\/ai-risk/);
  await visibleText(page, /AI risk|AI replica|defensibility/i);

  await clickNavLink(page, /^Trust$/i);
  await expect(page).toHaveURL(/\/trust/);
  await visibleText(page, /trust|evidence|security/i);

  await assertClean();
});
