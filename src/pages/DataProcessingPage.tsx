import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';

export default function DataProcessingPage() {
  return (
    <LegalLayout
      title="Data Processing & Document Handling"
      subtitle="How Frontier OS handles data and documents submitted through the website or demo."
      lastUpdated="[date to be confirmed before launch]"
      sections={[
        {
          title: 'URL-only first',
          content: (
            <p>
              Users can start with URL-only screening using public sources, company websites and sample data,
              without uploading any confidential documents. This is the recommended starting point for
              the public demo and for initial evaluation.
            </p>
          ),
        },
        {
          title: 'Documents optional',
          content: (
            <p>
              Document-assisted review is available as part of the product direction. Documents should only
              be uploaded when the user has authority to process them and retention, deletion and provider
              data-use terms are clear. The public demo should not be used to process confidential customer documents.
            </p>
          ),
        },
        {
          title: 'Supported document types',
          content: (
            <div className="flex flex-wrap gap-2">
              {['PDF', 'PPTX', 'DOCX', 'XLSX', 'TXT', 'MD'].map(t => (
                <span key={t} className="inline-flex items-center px-2.5 py-1 rounded border border-border bg-muted/30 text-xs font-mono text-foreground">
                  {t}
                </span>
              ))}
            </div>
          ),
        },
        {
          title: 'Document categories',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li>Pitch deck</li>
              <li>CIM (Confidential Information Memorandum)</li>
              <li>Management pack</li>
              <li>Financial model</li>
              <li>Board deck</li>
              <li>Annual report or filed accounts</li>
              <li>Customer data export</li>
              <li>Other</li>
            </ul>
          ),
        },
        {
          title: 'Company and run isolation',
          content: (
            <p>
              Paid-pilot infrastructure should scope uploaded documents, evidence and analysis outputs
              by workspace, company and run. Documents submitted for one target should not be accessible
              to unrelated workspaces or runs. Isolation requirements should be confirmed before paid pilots begin.
            </p>
          ),
        },
        {
          title: 'Retention options',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li><strong className="text-foreground">URL-only / no upload</strong> — no document processing; no retention issue.</li>
              <li><strong className="text-foreground">Delete after run</strong> — documents deleted immediately after analysis completes.</li>
              <li><strong className="text-foreground">Delete after defined period</strong> — documents retained for an agreed time, then deleted.</li>
              <li><strong className="text-foreground">Customer-requested deletion</strong> — documents deleted on request at any time.</li>
              <li><strong className="text-foreground">Agreed pilot retention</strong> — retention period defined in the pilot agreement.</li>
            </ul>
          ),
        },
        {
          title: 'Model and provider use',
          content: (
            <p>
              Before paid pilots, Frontier OS should disclose relevant model and provider data-use settings,
              including whether uploaded documents or analysis inputs are used by or retained by third-party
              model or hosting providers. This disclosure should be agreed before confidential documents are submitted.
            </p>
          ),
        },
        {
          title: 'Public demo limitation',
          content: (
            <p>
              The public demo should not be used to process confidential customer documents. Upload functionality
              in the public demo is mocked — files are selected locally but not transmitted or processed.
            </p>
          ),
        },
        {
          title: 'Human review',
          content: (
            <p>
              Outputs produced by Frontier OS are decision support and require human review. No output
              should be treated as a definitive fact, investment recommendation or legal conclusion without
              independent verification and professional judgement.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              For data handling or document processing questions, contact{' '}
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
