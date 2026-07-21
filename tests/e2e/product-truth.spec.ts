import { expect, test } from '@playwright/test';
import { verifiedFactPresentation } from '../../src/lib/evidencePresentation';
import { canonicalCompanyDomain, normalizeWebsiteUrl } from '../../src/lib/urlUtils';
import { latestScreenRunForIdentity, type RunEntry } from '../../src/lib/runHistory';
import { createTestWorkspace, gotoAndAssertUsable } from './helpers';

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
