import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test('light and dark themes expose the FEDS semantic token contract', async ({ page }) => {
  await page.goto('/');
  const light = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--feds-background-primary', '--feds-surface-primary', '--feds-text-primary', '--feds-accent-primary', '--feds-success-text'].map(name => style.getPropertyValue(name).trim());
  });
  expect(light.every(Boolean)).toBeTruthy();

  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = 'dark';
  });
  const dark = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return ['--feds-background-primary', '--feds-surface-primary', '--feds-text-primary', '--feds-accent-primary', '--feds-success-text'].map(name => style.getPropertyValue(name).trim());
  });
  expect(dark.every(Boolean)).toBeTruthy();
  expect(dark).not.toEqual(light);
});

test('FEDS focus, reduced motion and numeric table rules are present', async ({ page }) => {
  await page.goto('/dev/design-system');
  await expect(page.getByRole('heading', { name: 'Frontier Enterprise Design System' })).toBeVisible();
  const button = page.getByRole('button', { name: 'Primary' });
  await button.focus();
  const focusStyle = await button.evaluate(el => {
    const style = getComputedStyle(el);
    return { outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focusStyle.outline !== 'none' || focusStyle.shadow !== 'none').toBeTruthy();
  await expect(page.locator('td[data-numeric="true"]').first()).toHaveCSS('font-variant-numeric', /tabular-nums/);

  const css = fs.readFileSync(path.resolve('src/index.css'), 'utf8');
  expect(css).toContain('@media (prefers-reduced-motion: reduce)');
});

test('migrated shared components use semantic tokens rather than raw colours', () => {
  const files = [
    'src/components/ui/button.tsx',
    'src/components/ui/card.tsx',
    'src/components/ui/badge.tsx',
    'src/components/ui/table.tsx',
    'src/components/StatusChip.tsx',
    'src/components/investment/DecisionWorkspace.tsx',
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.resolve(file), 'utf8');
    expect(source, file).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  }
});

test('status indicators include readable status text and an accessible label', async ({ page }) => {
  await page.goto('/dev/design-system');
  const status = page.getByRole('status', { name: 'Verified status' });
  await expect(status).toContainText('Verified');
});
