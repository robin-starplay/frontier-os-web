import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title="Disclaimer"
      subtitle="Important limitations on Frontier OS outputs and the public demo."
      lastUpdated="[date to be confirmed before launch]"
      sections={[
        {
          title: 'Decision support only',
          content: (
            <p>
              Frontier OS outputs are decision support and require human review. No output produced by
              Frontier OS should be relied upon as a substitute for professional analysis, diligence
              or independent advice. Every output requires source review and professional judgement
              before any decision is made.
            </p>
          ),
        },
        {
          title: 'No professional advice',
          content: (
            <p>
              Frontier OS does not provide investment, legal, tax, accounting or financial advice.
              Nothing on this website or produced by the demo constitutes a recommendation to buy, sell,
              invest in or avoid any asset, business or security. Users requiring professional advice
              should consult qualified advisers.
            </p>
          ),
        },
        {
          title: 'Valuation caveat',
          content: (
            <p>
              Valuation outputs and multiples produced by Frontier OS are indicative screening views only.
              They should not be relied upon as final valuation conclusions without full financial diligence,
              professional valuation advice and independent source confirmation.
            </p>
          ),
        },
        {
          title: 'AI defensibility caveat',
          content: (
            <p>
              AI moat assessments, AI replica risk scores and inference economics analyses are evidence-based
              screening views, not definitive predictions. They reflect the evidence available at the time
              of the screen and require technical diligence confirmation before any investment conclusion
              is formed.
            </p>
          ),
        },
        {
          title: 'Registry caveat',
          content: (
            <p>
              Registry connectors depend on source availability, access rights, jurisdictional rules,
              rate limits and source quality. Data retrieved from registries reflects what was available
              at the time of retrieval and may be incomplete, delayed or subject to filing errors.
              Registry data should be verified against original source filings where accuracy is critical.
            </p>
          ),
        },
        {
          title: 'Uploaded document caveat',
          content: (
            <p>
              Uploaded documents may contain management claims, assumptions, projections or selectively
              presented information. Statements extracted from uploaded documents should not be treated
              as verified facts without cross-referencing against authoritative registry or audited sources.
            </p>
          ),
        },
        {
          title: 'Public demo caveat',
          content: (
            <p>
              The public demo may use sample data, synthetic examples or public information. Demo outputs
              are illustrative only and do not reflect real companies, real transactions or real diligence
              findings. They are provided to demonstrate workflow concepts.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              For questions about this disclaimer or Frontier OS outputs, contact{' '}
              <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">
                contact@getfrontieros.com
              </a>.
            </p>
          ),
        },
      ]}
    />
  );
}
