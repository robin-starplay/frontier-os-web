import { expect, test, type Page } from '@playwright/test';
import { createTestWorkspace, mockWorkspaceApis } from './helpers';

async function prepare(page: Page) {
  await mockWorkspaceApis(page);
  await page.route('**/api/usage/status*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'ok', origination: { used: 0, limit: null, remaining: null, quota_enforced: false } }),
  }));
  await createTestWorkspace(page);
}

test('completed 21 July origination run is saved, shown immediately and survives refresh', async ({ page }) => {
  await prepare(page);
  let submittedBody: Record<string, unknown> = {};
  await page.route('**/api/origination/thesis', async route => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'completed',
        saved_to_cockpit: true,
        origination_id: 'org_2026_07_21_reliability',
        completed_at: '2026-07-21T18:30:00Z',
        candidate_summary: { discovery_quality: 'high', confirmed_company_candidates: 1 },
        ranked_targets: [{ company_name: 'Trustworthy Systems', website: 'https://trustworthy.example', candidate_type: 'company_candidate', identity_validation_status: 'passed' }],
      }),
    });
  });

  await page.goto('/app/origination');
  await page.getByLabel('Describe the companies you want to find').fill('UK operational software');
  await page.getByRole('button', { name: 'Find companies' }).click();

  await expect(page.getByRole('status')).toContainText('Run saved to Workspace');
  await expect(page.getByTitle('UK operational software')).toBeVisible();
  expect(submittedBody).toMatchObject({
    workspace_id: 'e2e-local-workspace',
    user_id: 'e2e-local-user',
    save_to_cockpit: true,
  });
  expect(submittedBody.run_id).toMatch(/^org_/);

  await page.reload();
  await expect(page.getByTitle('UK operational software')).toBeVisible();
  await expect(page.getByText(/Jul 21, 07:30 PM/)).toBeVisible();
});

test('21 July runs precede legacy dates, duplicate run ids merge, and deletion persists', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/origination');
  await page.evaluate(() => localStorage.setItem('frontier_origination_runs', JSON.stringify([
    { id: 'july-10', run_id: 'july-10', workspace_id: 'e2e-local-workspace', run_type: 'origination', created_at: '2026-07-10T08:00:00Z', completed_at: '2026-07-10T08:05:00Z', thesis: 'Same thesis', result: { ranked_targets: [] }, form: {}, sync_state: 'synced' },
    { id: 'july-11', run_id: 'july-11', workspace_id: 'e2e-local-workspace', run_type: 'origination', created_at: '2026-07-11T08:00:00Z', completed_at: '2026-07-11T08:05:00Z', thesis: 'Same thesis', result: { ranked_targets: [] }, form: {}, sync_state: 'synced' },
    { id: 'older', run_id: 'older', workspace_id: 'e2e-local-workspace', run_type: 'origination', created_at: '2026-07-21T08:00:00Z', completed_at: '2026-07-21T08:05:00Z', thesis: 'Same thesis', result: { ranked_targets: [] }, form: {}, sync_state: 'synced' },
    { id: 'newer', run_id: 'newer', workspace_id: 'e2e-local-workspace', run_type: 'origination', created_at: '2026-07-21T09:00:00Z', completed_at: '2026-07-21T09:05:00Z', thesis: 'Same thesis', result: { ranked_targets: [] }, form: {}, sync_state: 'synced' },
    { id: 'newer', run_id: 'newer', workspace_id: 'e2e-local-workspace', run_type: 'origination', created_at: '2026-07-21T09:00:00Z', completed_at: '2026-07-21T09:05:00Z', thesis: 'Same thesis', result: { ranked_targets: [] }, form: {}, sync_state: 'pending' },
  ])));
  await page.reload();

  const cards = page.locator('[data-workspace-section="history"] > div').last().locator(':scope > div');
  await expect(page.getByText('Same thesis', { exact: true })).toHaveCount(4);
  await expect(cards.first()).toContainText('10:05');
  await page.getByRole('button', { name: 'Delete origination run Same thesis' }).first().click();
  await page.reload();
  await expect(page.getByText('Same thesis', { exact: true })).toHaveCount(3);
});

test('missing backend save confirmation is reported honestly', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/workspace/origination-runs*', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ detail: { status: 'error', error_code: 'PERSISTENCE_UNAVAILABLE', message: 'Workspace persistence is temporarily unavailable.' } }),
  }));
  await page.route('**/api/origination/thesis', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'completed', ranked_targets: [] }),
  }));
  await page.goto('/app/origination');
  await page.getByLabel('Describe the companies you want to find').fill('Unsynchronised test thesis');
  await page.getByRole('button', { name: 'Find companies' }).click();
  await expect(page.getByRole('status')).toContainText('could not be fully saved to Workspace');
  await expect(page.getByRole('button', { name: 'Retry save' })).toBeVisible();
  await expect(page.getByText(/Pending sync/)).toBeVisible();
  await page.getByRole('button', { name: 'Retry save' }).click();
  await expect(page.getByRole('status')).toContainText('Run saved to Workspace');
});

test('interpreted thesis exposes criteria conflicts before execution', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/origination');
  await page.getByLabel('Describe the companies you want to find').fill('UK FinTech SaaS companies excluding utilities');
  await page.getByText('Refine criteria', { exact: true }).click();
  await page.getByLabel('Sector / vertical').fill('Software');

  await expect(page.getByRole('heading', { name: 'Interpreted acquisition thesis' })).toBeVisible();
  await expect(page.getByText(/Target: Software/)).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Criteria conflict');
  await expect(page.getByText(/• utilities/)).toBeVisible();
});

test('backend progress and candidate score detail render without simulated stages', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/origination/thesis', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      status: 'partial', saved_to_cockpit: true, origination_id: 'org_guided',
      execution: {
        run_id: 'orig_guided',
        status: 'partial',
        events: [
          { event: 'structuring_thesis', status: 'completed', count: 1, message: 'Investment thesis structured.' },
          { event: 'expanding_queries', status: 'completed', count: 12, message: 'Discovery queries prepared.' },
          { event: 'searching_sources', status: 'completed', count: 138, message: 'Source search completed.' },
          { event: 'resolving_identities', status: 'warning', count: 4, message: 'Some identities remain unresolved.', details: { company_mentions: 16 } },
          { event: 'ranking_candidates', status: 'completed', count: 4, message: 'Candidates ranked.' },
          { event: 'quality_check', status: 'warning', count: 4, message: 'Category match requires review.', details: { rejected_candidates: 12 } },
          { event: 'saving_workspace', status: 'completed', count: 1, message: 'Workspace record saved.' },
          { event: 'completed', status: 'partial', count: 4, message: 'Run completed with material limitations.' },
        ],
      },
      candidate_summary: { discovery_quality: 'medium', confirmed_company_candidates: 1 },
      ranked_targets: [{
        rank: 1, company_name: 'Decision Systems', official_website: 'https://decision.example',
        candidate_type: 'company_candidate', candidate_quality: 'screenable_now', identity_validation_status: 'passed',
        identity_confidence: 'high', official_website_confidence: 'high', website_status: 'confirmed_official', fit_score_100: 72, why_it_fits: 'Vertical software and UK relevance.',
        key_mismatch: 'Scale is not yet verified.', evidence_status: 'verified_public_source', run_ready: true,
      }],
    }),
  }));
  await page.goto('/app/origination');
  await page.getByLabel('Describe the companies you want to find').fill('UK vertical software');
  await page.getByRole('button', { name: 'Find companies' }).click();
  await expect(page.getByText('Fit 72/100')).toBeVisible();
  await expect(page.getByText('Scale is not yet verified.')).toBeVisible();
  await page.getByText('View evidence and score breakdown').click();
  await page.getByText('Run details').click();
  await expect(page.getByText('Searching sources · 138 sources')).toBeVisible();
  await expect(page.getByText('Resolving identities · 16 company mentions, 4 confirmed identities')).toBeVisible();
  await expect(page.getByText('Quality check · 4 accepted, 12 rejected')).toBeVisible();
  await expect(page.getByText('Saving workspace · 1 saved run')).toBeVisible();
  await expect(page.getByText('Run details · Partial')).toBeVisible();
  await expect(page.getByText('Category match requires review.')).toBeVisible();
  await expect(page.getByText(/· 0/)).toHaveCount(0);
});

test('historical result does not masquerade as a current run or invent counts', async ({ page }) => {
  await prepare(page);
  await page.goto('/app/origination');
  await page.evaluate(() => localStorage.setItem('frontier_last_origination_result', JSON.stringify({
    status: 'completed',
    ranked_targets: [{ company_name: 'Legacy Systems', website: 'https://legacy.example' }],
  })));
  await page.reload();

  await expect(page.getByText('Historical result available. Detailed execution data is unavailable.')).toBeVisible();
  await expect(page.getByText('Previous origination result available')).toHaveCount(0);
  await page.getByText('Run details').click();
  await expect(page.getByText('Historical result. Detailed execution data is unavailable.')).toBeVisible();
  await expect(page.getByText(/· 0/)).toHaveCount(0);
});

test('polled progress preserves completed stages and prevents duplicate submission', async ({ page }) => {
  await prepare(page);
  let statusPolls = 0;
  let submissions = 0;
  await page.route('**/api/origination/thesis', async route => {
    submissions += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'running', job_id: 'job_progress' }),
    });
  });
  await page.route('**/api/origination/jobs/job_progress', async route => {
    statusPolls += 1;
    if (statusPolls === 1) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'running',
          execution: {
            run_id: 'orig_progress',
            status: 'running',
            events: [
              { event: 'structuring_thesis', status: 'completed', count: 1, message: 'Investment thesis structured.' },
              { event: 'searching_sources', status: 'running', count: 24, message: 'Searching sources.' },
            ],
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'completed',
        result: {
          status: 'completed',
          saved_to_cockpit: true,
          ranked_targets: [],
          execution: {
            run_id: 'orig_progress',
            status: 'completed',
            events: [
              { event: 'searching_sources', status: 'completed', count: 106, message: 'Source search completed.' },
              { event: 'quality_check', status: 'completed', count: 4, message: 'Candidate quality checks completed.' },
              { event: 'completed', status: 'completed', count: 4, message: 'Origination run completed.' },
            ],
          },
        },
      }),
    });
  });

  await page.goto('/app/origination');
  await page.getByLabel('Describe the companies you want to find').fill('UK workflow software');
  const submit = page.getByRole('button', { name: 'Find companies' });
  await submit.dblclick();
  await expect(page.getByText('Structuring thesis · 1 structured thesis')).toBeVisible();
  await expect(submit).toBeEnabled();
  await page.getByText('Run details').click();
  await expect(page.getByText('Searching sources · 106 sources')).toBeVisible();
  expect(submissions).toBe(1);
});
