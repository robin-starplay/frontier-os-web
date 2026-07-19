import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Cookie Notice"
      subtitle="How the Frontier OS website may use cookies and local storage."
      lastUpdated="[date to be confirmed before launch]"
      sections={[
        {
          title: 'What cookies are',
          content: (
            <p>
              Cookies are small text files placed on your device by a website. They are widely used to
              make websites work, remember your preferences and provide usage information to site owners.
              Local storage is a similar browser mechanism used to store data on your device without an
              expiry date.
            </p>
          ),
        },
        {
          title: 'How Frontier OS may use cookies or local storage',
          content: (
            <div>
              <p className="mb-2">The Frontier OS website and demo may use the following types of cookies or local storage:</p>
              <ul className="list-disc list-outside ml-4 space-y-2">
                <li>
                  <strong className="text-foreground">Essential functionality:</strong> cookies or local storage required
                  for basic website operation, such as session management or security tokens.
                </li>
                <li>
                  <strong className="text-foreground">Demo interface state:</strong> local storage may be used to
                  remember demo form state or selected scenarios within a session.
                </li>
                <li>
                  <strong className="text-foreground">Analytics:</strong> if analytics are added, they may use cookies
                  to understand aggregate usage patterns. This notice and any consent flow will be updated
                  before analytics are deployed.
                </li>
                <li>
                  <strong className="text-foreground">Form or security functionality:</strong> if contact forms or
                  authentication features are added, they may use cookies for CSRF protection or session management.
                </li>
              </ul>
            </div>
          ),
        },
        {
          title: 'Current demo status',
          content: (
            <p>
              The current demo is intended to use only essential functionality and local interface state.
              No analytics or marketing cookies are currently deployed. If analytics or marketing cookies
              are added, this notice and any required consent flow will be updated before launch.
            </p>
          ),
        },
        {
          title: 'Managing cookies',
          content: (
            <p>
              You can manage or delete cookies through your browser settings. Most browsers allow you to
              block cookies, delete existing cookies or set preferences for specific sites. Blocking essential
              cookies may affect how the website functions. Instructions for managing cookies vary by browser.
              refer to your browser's help pages for guidance.
            </p>
          ),
        },
        {
          title: 'Contact',
          content: (
            <p>
              For questions about cookies or this notice, contact{' '}
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
