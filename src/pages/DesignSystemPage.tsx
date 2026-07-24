import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Panel } from '@/components/ui/card';
import { StatusChip } from '@/components/StatusChip';
import { EvidenceItem, InvestmentView, MetricTable, NextAction } from '@/components/investment/DecisionWorkspace';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function DesignSystemPage() {
  return (
    <main className="min-h-screen bg-background-primary text-text-primary">
      <div className="app-container space-y-10 py-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div><p className="type-label text-accent-primary">Development only</p><h1 className="type-heading-1 mt-2">Frontier Enterprise Design System</h1><p className="type-body-md mt-2 max-w-2xl text-text-secondary">FEDS v1 foundations and decision-workspace primitives.</p></div>
          <ThemeToggle />
        </header>

        <section><h2 className="type-heading-2">Typography</h2><div className="mt-4 space-y-2"><p className="type-display-lg">Display large</p><p className="type-heading-2">Evidence-led decisions</p><p className="type-body-md text-text-secondary">Structured evidence stays readable during long review sessions.</p><p className="type-data">£12,450,000 · 18.4%</p></div></section>

        <section><h2 className="type-heading-2">Actions and forms</h2><Panel className="mt-4 space-y-4 p-5"><div className="flex flex-wrap gap-3"><Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="tertiary">Tertiary</Button><Button variant="destructive">Destructive</Button><Button variant="quiet">Quiet</Button></div><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5"><span className="type-label">Company</span><Input placeholder="Company name" /></label><label className="space-y-1.5"><span className="type-label">Review note</span><Textarea placeholder="Add an evidence-based note" /></label></div></Panel></section>

        <section><h2 className="type-heading-2">Statuses</h2><div className="mt-4 flex flex-wrap gap-2"><StatusChip status="Verified" variant="verified" /><StatusChip status="Partial" variant="caveat" /><StatusChip status="Unknown" variant="pending" /><StatusChip status="Blocked" variant="blocking" /><StatusChip status="Complete" variant="completed" /></div></section>

        <section><h2 className="type-heading-2">Decision and evidence</h2><div className="mt-4 space-y-6"><InvestmentView recommendation="Progress with conditions" readiness="Diligence required" confidence="Moderate" thesisFit="Potential fit" reasonsToProceed={['Recurring revenue is supported.']} reasonsForCaution={['Customer concentration remains unproven.']} principalUnknown="Retention by cohort" nextAction="Request underwriting evidence" /><Panel className="px-5"><EvidenceItem conclusion="Revenue is predominantly recurring." source="Annual report" page="42" type="Verified fact" status="Verified" confidence="High" freshness="FY 2025">Source excerpt and extraction provenance.</EvidenceItem></Panel><NextAction>Assign customer concentration diligence to the deal lead.</NextAction></div></section>

        <section><h2 className="type-heading-2">Data table</h2><div className="mt-4"><MetricTable metrics={[{ metric: 'Revenue', value: '£12.4m', period: 'FY 2025', source: 'Annual report', page: '38', status: 'Verified' }, { metric: 'Net retention', value: 'Not stated', period: 'Current', source: 'Not available', status: 'Unknown' }]} /></div></section>
      </div>
    </main>
  );
}
