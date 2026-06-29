import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Use"
      subtitle="These terms apply to use of the Frontier OS website and demo."
      lastUpdated="[date to be confirmed before launch]"
      sections={[
        {
          title: 'About these terms',
          content: (
            <p>
              These terms of use apply to your use of the Frontier OS website and public demo at getfrontieros.com
              (and any associated subdomains). By using the website or demo, you agree to these terms.
              If you do not agree, please do not use the website.
              These terms may be updated from time to time. Continued use after changes constitutes acceptance.
            </p>
          ),
        },
        {
          title: 'Who we are',
          content: (
            <div className="space-y-1">
              <p>Frontier Intelligence Systems Ltd</p>
              <p>71–75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</p>
              <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">contact@getfrontieros.com</a>
            </div>
          ),
        },
        {
          title: 'About Frontier OS',
          content: (
            <p>
              Frontier OS is a software acquisition screening and decision-support tool. It is designed to help
              buyers, investors and deal teams organise, assess and act on acquisition-related evidence.
              It is not a financial adviser, legal adviser or valuation service.
            </p>
          ),
        },
        {
          title: 'Demo and pilot use',
          content: (
            <p>
              The public demo may use sample data, synthetic examples or public information. It is provided
              to demonstrate workflow concepts only. The demo is not a substitute for full diligence, professional
              advice or a commercial pilot arrangement. Paid pilot terms are agreed separately.
            </p>
          ),
        },
        {
          title: 'No professional advice',
          content: (
            <p>
              Frontier OS does not provide investment, legal, tax, accounting or financial advice. Outputs
              are decision support and require human review. Nothing produced by Frontier OS should be treated
              as a recommendation to buy, sell, invest in or avoid any asset or business without independent
              professional advice.
            </p>
          ),
        },
        {
          title: 'User responsibility',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li>Checking source material and not relying solely on Frontier OS outputs.</li>
              <li>Reviewing outputs and applying professional judgement.</li>
              <li>Ensuring that information submitted to the website is accurate.</li>
              <li>Ensuring you have the right to submit or upload any materials you provide.</li>
              <li>Obtaining independent professional advice where required.</li>
              <li>Complying with applicable laws and regulations in your use of the service.</li>
            </ul>
          ),
        },
        {
          title: 'Acceptable use',
          content: (
            <div>
              <p className="mb-2">You must not use this website or demo to:</p>
              <ul className="list-disc list-outside ml-4 space-y-1.5">
                <li>Do anything unlawful, harmful or fraudulent.</li>
                <li>Upload malicious files, code or content.</li>
                <li>Upload confidential third-party documents without authority to process them.</li>
                <li>Attempt to reverse engineer, scrape, overload or otherwise misuse the service.</li>
                <li>Submit misleading, offensive or infringing material.</li>
                <li>Impersonate another person or organisation.</li>
              </ul>
            </div>
          ),
        },
        {
          title: 'Uploaded materials',
          content: (
            <p>
              Users should only upload documents they are authorised to process. Confidential or third-party
              materials should only be used in controlled pilots with agreed retention, deletion and provider
              data-use terms. The public demo should not be used to process confidential customer documents.
            </p>
          ),
        },
        {
          title: 'Intellectual property',
          content: (
            <p>
              Website content, product names, designs, workflows and demo materials are owned by or licensed
              to Frontier Intelligence Systems Ltd, except for materials you provide. You must not copy,
              reproduce or redistribute any part of the website without permission.
            </p>
          ),
        },
        {
          title: 'Availability',
          content: (
            <p>
              The demo and website may change, be paused or be withdrawn at any time without notice.
              We do not guarantee continuous availability.
            </p>
          ),
        },
        {
          title: 'Liability',
          content: (
            <p>
              To the extent permitted by law, Frontier Intelligence Systems Ltd is not responsible for losses
              arising from reliance on demo outputs, unavailability of the service, or errors in content.
              This section should be reviewed by a solicitor before commercial launch.
            </p>
          ),
        },
        {
          title: 'Changes to these terms',
          content: (
            <p>
              These terms may be updated from time to time. The current version will always be available on
              this page. Material changes will be noted with an updated date.
            </p>
          ),
        },
        {
          title: 'Governing law',
          content: (
            <p>
              These terms are governed by the law of England and Wales. Any disputes will be subject to
              the exclusive jurisdiction of the courts of England and Wales.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              For questions about these terms, contact{' '}
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
