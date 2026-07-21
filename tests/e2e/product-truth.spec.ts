import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { verifiedFactPresentation } from '../../src/lib/evidencePresentation';
import { canonicalCompanyDomain, normalizeWebsiteUrl } from '../../src/lib/urlUtils';
import { latestScreenRunForIdentity, type RunEntry } from '../../src/lib/runHistory';
import { createTestWorkspace, gotoAndAssertUsable } from './helpers';
import { groupFinancialEvidence } from '../../src/components/FinancialEvidenceGrid';

const financialEvidenceFixture = [
  { canonical_metric_type: 'group_revenue', label: 'Group Revenue', value: '£45.4m', period: 'FY2025', page: 5, metric_name: 'revenue' },
  { canonical_metric_type: 'group_revenue', label: 'Group Revenue', value: '£43.8m', period: 'FY2024', page: 7, metric_name: 'revenue' },
  { canonical_metric_type: 'adjusted_ebitda', label: 'Adjusted EBITDA', value: '£23.1m', period: 'FY2025', page: 5, metric_name: 'adjusted_ebitda' },
  { canonical_metric_type: 'net_cash', label: 'Net Cash', value: '£34.4m', period: 'FY2025', page: 5, metric_name: 'net_cash' },
  { canonical_metric_type: 'gross_profit', label: 'Gross Profit', value: '£37.0m', period: 'FY2025', page: 11, metric_name: 'gross_profit' },
  { canonical_metric_type: 'recurring_revenue', label: 'Recurring Revenue', value: '£15.9m', period: 'FY2025', page: 5, metric_name: 'recurring_revenue' },
  { canonical_metric_type: 'recurring_revenue', label: 'Recurring Revenue', value: '£15.5m', period: 'FY2024', page: 7, metric_name: 'recurring_revenue' },
  { canonical_metric_type: 'order_book', label: 'Order Book', value: '£56.9m', period: 'FY2025', page: 5, metric_name: 'order_book' },
  { canonical_metric_type: 'cash', label: 'Cash', value: '£34.4m', period: 'FY2025', page: 29, metric_name: 'cash' },
  { canonical_metric_type: 'employees', label: 'Employees', value: '370', period: 'FY2025', page: 61, metric_name: 'employees' },
  { canonical_metric_type: 'dividend', label: 'Dividend per share', value: '15.4p', period: 'FY2025', page: 4, metric_name: 'dividend' },
];

test('verified document facts retain metric, value, source type and page', () => {
  const card = verifiedFactPresentation({ label: 'Revenue', value: '£45.4m', source: 'uploaded_document', source_document: 'Cerillion annual report', page: 5, verification_status: 'audited_primary_source' });
  expect(card.label).toBe('Revenue');
  expect(card.state).toBe('VERIFIED_UPLOADED_DOCUMENT');
  expect(card.sourceCopy).toContain('Page 5');
  expect(`${card.label} · £45.4m ${card.sourceCopy}`).not.toContain('Not found');
});

test('uploaded-document and public-source verification remain distinct', () => {
  expect(verifiedFactPresentation({ field: 'Revenue', source: 'uploaded_document' }).state).toBe('VERIFIED_UPLOADED_DOCUMENT');
  expect(verifiedFactPresentation({ field: 'Company number', source: 'companies_house' }).state).toBe('VERIFIED_PUBLIC_SOURCE');
});

test('financial evidence groups overview and period comparisons', () => {
  const grouped = groupFinancialEvidence(financialEvidenceFixture);
  expect(grouped.overview.map(item => item.key)).toEqual(expect.arrayContaining(['group_revenue', 'adjusted_ebitda', 'net_cash', 'gross_profit']));
  const revenue = grouped.overview.find(item => item.key === 'group_revenue');
  expect(revenue?.facts.map(item => item.period)).toEqual(['FY2025', 'FY2024']);
  expect(revenue?.growth).toBe('+3.7%');
  expect(grouped.supporting.some(item => item.key === 'dividend')).toBe(true);
});

test('financial evidence grid is compact, responsive and does not duplicate verification copy', async ({ page }) => {
  await page.goto('/');
  const componentSource = readFileSync(new URL('../../src/components/FinancialEvidenceGrid.tsx', import.meta.url), 'utf8');
  expect(componentSource.match(/Verified in uploaded annual report/g)).toHaveLength(1);
  expect(componentSource).toContain('grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4');
  expect(componentSource).toContain('<details className="rounded-md');
  const cards = financialEvidenceFixture.slice(0, 4).map(fact => `<article class="min-h-[112px] rounded-md border p-3"><h5>${fact.label}</h5><p>${fact.value}</p><p>${fact.period} · Page ${fact.page}</p></article>`).join('');
  await page.setContent(`<link rel="stylesheet" href="/src/index.css"><main style="padding:16px"><h3>Financial evidence</h3><p>Audited annual report · 11 verified facts</p><p>Verified in uploaded annual report</p><h4>Financial overview</h4><div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4" data-financial-grid="financial-overview">${cards}</div><details><summary>Supporting extracted facts</summary></details></main>`);
  await expect(page.getByText('Financial overview', { exact: true })).toBeVisible();
  await expect(page.getByText(/FY2025 · Page 5/).first()).toBeVisible();
  await expect(page.getByText(/FY2024 · Page 7/).first()).toBeVisible();
  await expect(page.getByText('Verified in uploaded annual report', { exact: true })).toHaveCount(1);
  const supporting = page.locator('details');
  await expect(supporting).not.toHaveAttribute('open', '');

  for (const width of [390, 768, 1024, 1280, 1440, 1680, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    const columns = await page.locator('[data-financial-grid="financial-overview"]').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(columns, `${width}px column count`).toBe(width < 768 ? 1 : width < 1024 ? 2 : 4);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow, `${width}px overflow`).toBe(false);
  }
});

test('canonical domain matching ignores URL presentation and resolves Google redirects', () => {
  const variants = ['cerillion.com', 'www.cerillion.com', 'https://cerillion.com/', 'https://www.cerillion.com'];
  expect(new Set(variants.map(canonicalCompanyDomain))).toEqual(new Set(['cerillion.com']));
  const redirect = 'https://www.google.com/url?q=https%3A%2F%2Fhiredigital.com%2Fproducts&sa=D';
  expect(normalizeWebsiteUrl(redirect)).toBe('https://hiredigital.com/products');
  expect(canonicalCompanyDomain(redirect)).toBe('hiredigital.com');
});

test('latest completed individual screen supersedes stale compare state', () => {
  const base = { company: 'Cerillion', recommendation_level: 'amber', valuation_readiness: '', strategic_fit_label: '', ai_replica_risk: '', blockers: [], result: null } as const;
  const runs = [
    { ...base, id: 'stale', type: 'url', timestamp: '2026-07-18T10:00:00Z', website: 'https://www.cerillion.com', recommendation: 'Run individual screen', ic_readiness: '', evidence_confidence: 'low', next_action: 'Run individual screen' },
    { ...base, id: 'latest', type: 'document', timestamp: '2026-07-20T10:00:00Z', website: 'cerillion.com', recommendation: 'Advance with conditions', ic_readiness: 'Conditional', evidence_confidence: 'high', next_action: 'Request ARR bridge' },
  ] as RunEntry[];
  const selected = latestScreenRunForIdentity(runs, 'Cerillion plc', 'https://cerillion.com/');
  expect(selected?.id).toBe('latest');
  expect(selected?.recommendation).toBe('Advance with conditions');
  expect(selected?.evidence_confidence).toBe('high');
});

test('origination renders company identity as heading and product as supporting evidence', async ({ page }) => {
  await createTestWorkspace(page);
  await page.evaluate(() => localStorage.setItem('frontier_last_origination_result', JSON.stringify({
    status: 'ok',
    source_backed_target_universe_available: true,
    targets: [{
      company_name: 'ESG',
      product_name: 'Metering Management',
      candidate_type: 'company_candidate',
      candidate_quality: 'screenable_now',
      display_mode: 'full_card',
      official_website: 'https://esgglobal.com',
      website: 'https://esgglobal.com',
      website_status: 'confirmed_official',
      official_website_confidence: 'high',
      identity_confidence: 'high',
      entity_resolution_status: 'resolved',
      root_company_domain: 'esgglobal.com',
      source_label: 'Official company product page',
      source_url: 'https://esgglobal.com/product-pages/metering-management/',
      source_snippet: 'ESG provides metering management software.',
      run_ready: true,
      compare_ready: true,
    }],
  })));
  await gotoAndAssertUsable(page, '/app/origination');
  await expect(page.getByText('ESG', { exact: true })).toBeVisible();
  await expect(page.getByText('Product evidence: Metering Management', { exact: true })).toBeVisible();
  await expect(page.getByText('Metering Management', { exact: true })).toHaveCount(0);
});
