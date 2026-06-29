import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Notice"
      subtitle="How Frontier Intelligence Systems Ltd may collect and use personal data in connection with the Frontier OS website and demo."
      lastUpdated="[date to be confirmed before launch]"
      sections={[
        {
          title: 'Who we are',
          content: (
            <div className="space-y-1">
              <p>Frontier Intelligence Systems Ltd</p>
              <p>71–75 Shelton Street, Covent Garden, London, United Kingdom, WC2H 9JQ</p>
              <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">contact@getfrontieros.com</a>
              <p className="mt-2 text-muted-foreground/80">
                We are the data controller for personal data collected through this website.
              </p>
            </div>
          ),
        },
        {
          title: 'What personal data we may collect',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li>Name and work email address.</li>
              <li>Organisation and role.</li>
              <li>Contact form messages and pilot request details.</li>
              <li>Feedback responses submitted via the website.</li>
              <li>Technical usage data, IP address and device or browser information where collected.</li>
              <li>Uploaded documents if document-assisted workflows are enabled.</li>
              <li>Analysis inputs such as company name, website, buyer thesis and user-provided notes.</li>
            </ul>
          ),
        },
        {
          title: 'How we collect it',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li>Website forms, including contact and pilot request forms.</li>
              <li>Demo workflow inputs.</li>
              <li>Uploaded files where document-assisted workflows are enabled.</li>
              <li>Email communications.</li>
              <li>Technical logs from hosting and analytics services, where applicable.</li>
            </ul>
          ),
        },
        {
          title: 'Why we use it',
          content: (
            <ul className="list-disc list-outside ml-4 space-y-1.5">
              <li>To respond to enquiries and contact form submissions.</li>
              <li>To provide access to the demo or pilot workflows.</li>
              <li>To understand customer interest and improve the product.</li>
              <li>To maintain the security and reliability of the website.</li>
              <li>To comply with applicable legal obligations.</li>
            </ul>
          ),
        },
        {
          title: 'Lawful basis',
          content: (
            <p>
              Relevant lawful bases may include legitimate interests, contract preparation or performance,
              consent where applicable, and legal obligations. This section should be reviewed by a data
              protection adviser before launch.
            </p>
          ),
        },
        {
          title: 'Uploaded documents',
          content: (
            <p>
              Uploaded documents, where enabled, are used for the requested analysis workflow only.
              Document-assisted workflows should use explicit retention, deletion and provider data-use
              settings agreed before processing. The public demo should not be used to process confidential
              customer documents.
            </p>
          ),
        },
        {
          title: 'Model and cloud providers',
          content: (
            <p>
              If third-party model, hosting, storage or analytics providers are used, their role and relevant
              data-use settings should be disclosed to users before paid pilots begin. This section will be
              updated as infrastructure decisions are confirmed.
            </p>
          ),
        },
        {
          title: 'How long we keep data',
          content: (
            <p>
              Public demo data should be minimised. Pilot data retention periods should be agreed with
              the customer before confidential documents are processed. Contact form data is retained only
              as long as needed to respond to enquiries.
            </p>
          ),
        },
        {
          title: 'Who we share data with',
          content: (
            <div>
              <p className="mb-2">We may share data with the following categories of recipient where necessary:</p>
              <ul className="list-disc list-outside ml-4 space-y-1.5">
                <li>Hosting and infrastructure providers.</li>
                <li>Email and form submission providers.</li>
                <li>Analytics providers, if used.</li>
                <li>Model or AI inference providers, if used.</li>
                <li>Professional advisers where required.</li>
                <li>Legal or regulatory bodies where required by law.</li>
              </ul>
            </div>
          ),
        },
        {
          title: 'International transfers',
          content: (
            <p>
              If providers process data outside the UK, appropriate safeguards (such as UK adequacy decisions
              or standard contractual clauses) should be documented before launch. This section will be
              updated as providers are confirmed.
            </p>
          ),
        },
        {
          title: 'Your rights',
          content: (
            <div>
              <p className="mb-2">
                Under UK data protection law, you may have the right to:
              </p>
              <ul className="list-disc list-outside ml-4 space-y-1.5">
                <li><strong className="text-foreground">Access</strong> — request a copy of your personal data.</li>
                <li><strong className="text-foreground">Correction</strong> — ask us to correct inaccurate data.</li>
                <li><strong className="text-foreground">Deletion</strong> — ask us to delete your data in certain circumstances.</li>
                <li><strong className="text-foreground">Restriction</strong> — ask us to restrict processing in certain circumstances.</li>
                <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interests.</li>
                <li><strong className="text-foreground">Portability</strong> — receive your data in a portable format where applicable.</li>
                <li><strong className="text-foreground">Withdraw consent</strong> — where processing is based on consent, you may withdraw it at any time.</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, contact{' '}
                <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">contact@getfrontieros.com</a>.
              </p>
            </div>
          ),
        },
        {
          title: 'Complaints',
          content: (
            <p>
              If you have concerns about how we handle your data, please contact us first at{' '}
              <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">contact@getfrontieros.com</a>.
              You may also have the right to complain to the UK Information Commissioner's Office (ICO) at{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ico.org.uk</a>.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              For privacy queries, contact{' '}
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
