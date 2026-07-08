import React from 'react';
import { Globe, FolderOpen, FileX, ShieldOff, Trash2, UserCheck, AlertCircle, Eye } from 'lucide-react';
import { BookIntroButton } from '@/components/BookIntroButton';
import { BetaCTA } from '@/components/BetaCTA';

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">{children}</p>;
}

interface TrustSection {
  icon: React.ElementType;
  title: string;
  body: string;
  caveat?: string;
}

const SECTIONS: TrustSection[] = [
  {
    icon: Globe,
    title: 'URL-only first',
    body: 'An initial screen runs using company websites, public registry data and official filings. No confidential documents are required for the first pass. Uploading documents is optional and only needed when deeper diligence is required.',
  },
  {
    icon: FileX,
    title: 'Documents optional',
    body: 'Uploaded documents are used only for the analysis workflow. They are not used for model training. Provider configuration and retention terms are disclosed before any paid engagement.',
    caveat: 'Document handling and retention terms must be agreed in writing before any sensitive material is uploaded.',
  },
  {
    icon: FolderOpen,
    title: 'Company-isolated workspaces',
    body: 'Each analysis runs in a company-specific workspace. Documents, evidence records and outputs for one company are not accessible in another. Cross-company retrieval is disabled by default.',
    caveat: 'Workspace isolation is a product design principle. Implementation detail and enforcement mechanism should be reviewed before production use.',
  },
  {
    icon: ShieldOff,
    title: 'No confidential data in the private beta sample workflow',
    body: 'The Frontier OS private beta uses sample data only. No real confidential documents, financial records or company-specific data are processed in the sample workflow.',
  },
  {
    icon: AlertCircle,
    title: 'Claims are not facts',
    body: 'Uploaded management packs, CIMs and board decks are not treated as verified sources. Every claim from a Tier 3 or lower source requires verification against the source hierarchy before it can enter an IC memo as a confirmed fact.',
  },
  {
    icon: Trash2,
    title: 'Retention and deletion',
    body: 'The product design supports explicit deletion of uploaded files, extracted text and generated outputs on a per-company-workspace basis. Retention periods and deletion confirmation are agreed in writing before paid engagement.',
    caveat: 'Deletion is a design intent, not a certified control. Confirmation of implementation should be requested before sensitive document upload.',
  },
  {
    icon: UserCheck,
    title: 'Human review required',
    body: 'All outputs are decision support material, not investment advice. Source review and professional judgement are required before any investment decision. Frontier OS surfaces evidence, gaps and conflicts — it does not resolve them on your behalf.',
  },
];

const SECURITY_ITEMS = [
  { label: 'Authentication',    status: 'Planned',          note: 'Role-based access and SSO — not yet live' },
  { label: 'Audit log',        status: 'Planned',          note: 'Per-workspace event log — not yet live' },
  { label: 'Data at rest',     status: 'Provider defaults', note: 'Subject to chosen cloud provider configuration' },
  { label: 'Data in transit',  status: 'HTTPS',            note: 'TLS enforced where hosted' },
  { label: 'Malware scanning', status: 'Planned',          note: 'Scheduled before document upload is live' },
  { label: 'Penetration test', status: 'Not performed',    note: 'Scheduled pre-launch' },
  { label: 'Certifications',   status: 'None',             note: 'None claimed at this stage' },
];

const STATUS_CHIP: Record<string, string> = {
  'Planned':          'bg-amber-500/10 text-amber-700 border-amber-500/20',
  'Provider defaults': 'bg-muted/40 text-muted-foreground border-border',
  'HTTPS':            'bg-green-500/10 text-green-700 border-green-500/20',
  'Not performed':    'bg-muted/40 text-muted-foreground border-border',
  'None':             'bg-muted/40 text-muted-foreground border-border',
};

export default function TrustPage() {
  return (
    <div className="flex-1 w-full">

      {/* Page header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <SectionLabel>Trust & privacy</SectionLabel>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight max-w-xl">
            Designed for careful deal workflows.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed mb-4">
            Start URL-only, add documents only when retention, deletion and provider data-use settings are clear. This page explains how Frontier OS is designed around that constraint.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-amber-700 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-md">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            Frontier OS is pre-launch software. Controls described here are design intent, not certified guarantees.
          </div>
        </div>
      </div>

      {/* Trust principles */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <SectionLabel>Trust principles</SectionLabel>
        <h2 className="text-xl font-bold text-foreground mb-8">How it is designed</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SECTIONS.map(({ icon: Icon, title, body, caveat }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  {caveat && (
                    <div className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                      <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                      <span>{caveat}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current status */}
      <div className="w-full bg-card/30 border-y border-border py-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <SectionLabel>Current status</SectionLabel>
          <h2 className="text-xl font-bold text-foreground mb-2">Security posture</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-xl">
            A factual account of the current state. No certifications are claimed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SECURITY_ITEMS.map(({ label, status, note }) => (
              <div key={label} className="rounded-lg border border-border bg-card px-5 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-0.5">{label}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${STATUS_CHIP[status] ?? 'bg-muted/40 text-muted-foreground border-border'}`}>
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What we do not claim yet */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <SectionLabel>What we do not claim yet</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {[
              'Independent security certification (e.g. ISO 27001 or equivalent)',
              'Independent penetration test completed',
              'Verified document deletion audit trail',
              'Formal DPA or data processing agreement in place',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
                <span className="text-sm text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>

          {/* Disclosure wording */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Disclosure wording</span>
            </div>
            <blockquote className="border-l-2 border-primary pl-4 text-sm text-foreground leading-relaxed italic mb-3">
              "Uploaded documents are used for the analysis workflow and should not be used for model training. Provider configuration and retention terms must be disclosed before paid pilots."
            </blockquote>
            <p className="text-xs text-muted-foreground">
              All outputs are decision support. They require source review and professional judgement before any investment decision.
            </p>
          </div>
        </div>

      </div>

      <BetaCTA
        title="Need to discuss data handling before document-assisted review?"
        body="Book a 30-minute intro to discuss retention, deletion and provider data-use settings before confidential documents are processed."
        primaryLabel="Request private beta access"
        primaryHref="/request-pilot"
        secondaryLabel=""
        secondaryHref=""
        calendarLabel="Book a 30-minute intro"
        eventName="trust_bottom"
      />
    </div>
  );
}
