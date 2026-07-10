import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, AlertTriangle, ShieldAlert, Target, ShieldCheck, Database, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { EVIDENCE_CARDS } from '@/data/mockData';
import { EvidenceCard } from '@/components/EvidenceCard';
import { MetricCard } from '@/components/MetricCard';
import { RiskBadge } from '@/components/RiskBadge';
import { StatusChip } from '@/components/StatusChip';
import { SemanticBadge, semanticBadgeClass } from '@/components/SemanticBadge';

function icMemoStatusClass(status: string) {
  const label = status === 'CLAIM'
    ? 'Company claim'
    : status === 'GAP'
      ? 'Blocker'
      : status === 'High'
        ? 'Verified public source'
        : status === 'Medium'
          ? 'Needs review'
          : 'Unknown';

  return semanticBadgeClass(undefined, 'text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0', label);
}

export default function ICMemo() {
  const radarData = [
    { subject: 'Technology', A: 72, fullMark: 100 },
    { subject: 'Customer Overlap', A: 45, fullMark: 100 },
    { subject: 'Revenue Synergy', A: 68, fullMark: 100 },
    { subject: 'Cultural Alignment', A: 60, fullMark: 100 },
  ];

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-8">
      <div className="mb-4 px-3 py-2 rounded-md border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700">
        <span className="font-semibold tracking-normal">Example screen</span>
        {' · '}This is a static illustrative preview — not a live analysis result. Financial figures are not independently verified.
      </div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">IC Draft Memo: Illustrative target</h1>
        <p className="text-muted-foreground">Comprehensive extraction, analysis, and sanity check results.</p>
      </div>

      <Tabs defaultValue="executive" className="w-full">
        <div className="overflow-x-auto pb-2 custom-scrollbar">
          <TabsList className="w-max inline-flex">
            <TabsTrigger value="executive">Executive Summary</TabsTrigger>
            <TabsTrigger value="evidence">Evidence Registry</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="strategic">Strategic Fit</TabsTrigger>
            <TabsTrigger value="ai">AI Assessment</TabsTrigger>
            <TabsTrigger value="sanity">Sanity Check</TabsTrigger>
            <TabsTrigger value="dd">DD Plan</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          {/* EXECUTIVE SUMMARY */}
          <TabsContent value="executive" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard label="Revenue" value="Unknown" source="Source required" />
              <MetricCard label="EBITDA" value="Unknown" source="Source required" />
              <MetricCard label="Net Cash" value="Unknown" source="Source required" tone="warning" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-green-500 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">Margin profile requires source-backed evidence</span></div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">Net cash requires source-backed verification</span></div>
                  <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">Niche vertical with high switching costs</span></div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-amber-500 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Risks & Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">ARR unverified — management claim, not confirmed</span></div>
                  <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">Customer concentration schedule required</span></div>
                  <div className="flex items-start gap-3"><AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" /><span className="text-sm font-medium">Non-GAAP EBITDA reconciliation required</span></div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Indicative EV Range</p>
                    <p className="font-mono text-3xl font-bold text-foreground">Not available</p>
                  </div>
                  <div className="h-12 w-[1px] bg-border hidden md:block"></div>
                  <div className="text-left md:text-right">
                    <p className="text-sm text-muted-foreground mb-2">Recommendation</p>
                    <SemanticBadge className="text-lg px-4 py-1">Request Financials</SemanticBadge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EVIDENCE REGISTRY */}
          <TabsContent value="evidence" className="space-y-6 outline-none">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-md border border-border bg-card text-center">
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </div>
              <div className="p-4 rounded-md border border-border bg-card text-center">
                <div className="text-2xl font-bold text-blue-500">7</div>
                <div className="text-xs text-muted-foreground">Claims</div>
              </div>
              <div className="p-4 rounded-md border border-border bg-card text-center">
                <div className="text-2xl font-bold text-muted-foreground">9</div>
                <div className="text-xs text-muted-foreground">Unknowns</div>
              </div>
              <div className="p-4 rounded-md border border-border bg-card text-center">
                <div className="text-2xl font-bold text-red-500">2</div>
                <div className="text-xs text-muted-foreground">Conflicts</div>
              </div>
            </div>

            <div className="space-y-3">
              {EVIDENCE_CARDS.map((card, i) => (
                <EvidenceCard key={i} {...card} />
              ))}
            </div>

            <p className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-md border border-border text-center">
              Note: This is an example screen only. Figures shown are illustrative and are not verified by a live analysis.
            </p>
          </TabsContent>

          {/* FINANCIALS */}
          <TabsContent value="financials" className="space-y-6 outline-none">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Extracted Financials</CardTitle>
                <CardDescription>Metrics synthesized from public filings and management packs.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-0 rounded-md border border-border overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/50 p-3 border-b border-border text-xs font-semibold text-muted-foreground">
                    <div className="col-span-4">Metric</div>
                    <div className="col-span-3">Value</div>
                    <div className="col-span-3">Source</div>
                    <div className="col-span-2">Confidence</div>
                  </div>
                  {[
                    { m: "Revenue", v: "— (illustrative)", s: "Not verified in preview", c: "Low" },
                    { m: "Recurring revenue", v: "—", s: "Management Pack", c: "Low", note: "(definition unclear)" },
                    { m: "Adj. EBITDA", v: "[illustrative]", s: "Annual Report", c: "Medium", note: "(non-GAAP)" },
                    { m: "Net cash", v: "[illustrative]", s: "Companies House", c: "High" },
                    { m: "ARR", v: "Claimed — definition absent", s: "Management Pack", c: "Low", note: "(candidate)" }
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 p-3 border-b border-border last:border-0 items-center bg-card">
                      <div className="col-span-4 text-sm font-medium">
                        {row.m} {row.note && <span className="text-xs font-normal text-muted-foreground block">{row.note}</span>}
                      </div>
                      <div className="col-span-3 font-mono text-sm">{row.v}</div>
                      <div className="col-span-3 text-xs text-muted-foreground">{row.s}</div>
                      <div className="col-span-2 text-xs">
                        <span className={icMemoStatusClass(row.c)}>
                          {row.c}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-500 font-medium leading-relaxed">
                    ARR is absent from statutory accounts. Reconciliation required before use in valuation models.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* VALUATION */}
          <TabsContent value="valuation" className="space-y-6 outline-none">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Indicative Valuation Range</CardTitle>
                <CardDescription>Valuation is hidden in static sample mode. Source-backed revenue, ARR and EBITDA evidence are required.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-6 rounded-md border border-border bg-card text-center">
                    <div className="text-sm text-muted-foreground mb-1">Bear Case (3.5x)</div>
                    <div className="font-mono text-3xl font-bold text-foreground mb-2">Not available</div>
                  </div>
                  <div className="p-6 rounded-md border border-blue-500/30 bg-blue-500/5 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-md">BASE</div>
                    <div className="text-sm text-blue-700 mb-1">Base Case (4.5x)</div>
                    <div className="font-mono text-3xl font-bold text-blue-500 mb-2">Not available</div>
                  </div>
                  <div className="p-6 rounded-md border border-border bg-card text-center">
                    <div className="text-sm text-muted-foreground mb-1">Bull Case (6.0x)</div>
                    <div className="font-mono text-3xl font-bold text-foreground mb-2">Not available</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-md">
                  <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-amber-500 font-medium">Multiple selection highly dependent on unverified metrics.</p>
                    <p className="text-sm text-amber-500/80">
                      Valuation is not available in static sample mode. ARR, revenue split and EBITDA bridge require source-backed evidence before modelling.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* STRATEGIC FIT */}
          <TabsContent value="strategic" className="space-y-6 outline-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Fit Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="text-5xl font-mono font-bold text-blue-500">7.0</div>
                    <div>
                      <div className="text-sm text-muted-foreground">Fit Score / 10</div>
                      <SemanticBadge tone="info" className="mt-1">Adjacent Fit</SemanticBadge>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Target operates in an adjacent vertical (telco billing). While core technology stack shows moderate overlap, customer synergies are present but not fully underwritten due to high switching costs in the sector. Cultural alignment appears average based on public indicators.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Synergy Radar</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Radar name="Score" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI ASSESSMENT */}
          <TabsContent value="ai" className="space-y-6 outline-none">
            {/* Executive AI view */}
            <Card className="border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-blue-700">Executive AI View</CardTitle>
                    <CardDescription>Source-based AI disruption assessment — medium confidence</CardDescription>
                  </div>
                  <RiskBadge level="moderate" className="shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The target shows meaningful AI opportunity but limited verified AI moat evidence. Replica risk is medium-high until proprietary data, integration depth and customer workflow lock-in are proven.
                </p>
              </CardContent>
            </Card>

            {/* Score grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'AI Disruption Score', value: '6/10', color: 'text-amber-700' },
                { label: 'AI Replica Risk',     value: '7/10', color: 'text-red-700' },
                { label: 'AI Moat',             value: '4/10', color: 'text-amber-700' },
                { label: 'AI Opportunity',      value: '8/10', color: 'text-green-700' },
                { label: 'Defensibility',       value: '5/10', color: 'text-amber-700' },
              ].map(({ label, value, color }) => (
                <div key={label} className="p-3 rounded-md border border-border bg-card text-center">
                  <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</div>
                </div>
              ))}
            </div>

            {/* Three panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* AI already used */}
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">AI Already Used?</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Product AI claim',        status: 'CLAIM' },
                    { label: 'AI workflow assistant',   status: 'CLAIM' },
                    { label: 'Roadmap AI features',     status: 'CLAIM' },
                    { label: 'Live AI module revenue',  status: 'UNKNOWN' },
                    { label: 'Customer-facing AI',      status: 'UNKNOWN' },
                  ].map(({ label, status }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={icMemoStatusClass(status)}>{status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* AI moat */}
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">AI Moat Evidence</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'Proprietary data',        status: 'UNKNOWN' },
                    { label: 'Feedback loops',          status: 'UNKNOWN' },
                    { label: 'Embedded workflows',      status: 'CLAIM' },
                    { label: 'Distribution advantage',  status: 'CLAIM' },
                    { label: 'Domain-specific models',  status: 'GAP' },
                  ].map(({ label, status }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={icMemoStatusClass(status)}>{status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Inference economics */}
              <Card className="border-border">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Inference Economics</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: 'AI feature COGS',          status: 'UNKNOWN' },
                    { label: 'Gross margin drag',        status: 'UNKNOWN' },
                    { label: 'Vendor dependency',        status: 'GAP' },
                    { label: 'Pricing power',            status: 'GAP' },
                    { label: 'AI module monetised',      status: 'UNKNOWN' },
                  ].map(({ label, status }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className={icMemoStatusClass(status)}>{status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* AI valuation caveat */}
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 p-4 rounded-md">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-700 mb-1">AI-related valuation caveat</p>
                <p className="text-sm text-amber-500/80 leading-relaxed">
                  AI upside should not increase the base valuation until management proves live monetised AI modules, inference cost control, and measurable customer adoption.
                </p>
              </div>
            </div>

            {/* AI diligence questions */}
            <Card className="border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">AI Diligence Questions — must request before IC</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {[
                    'What percentage of revenue is recurring software vs services?',
                    'Which AI features are live vs roadmap?',
                    'What are monthly inference costs per active customer?',
                    'Is AI priced as a paid module or included in base subscription?',
                    'What proprietary data improves model output?',
                    'Which workflows could a customer rebuild internally with AI tools?',
                    'How much implementation work can AI automate?',
                  ].map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary font-mono shrink-0">{i + 1}.</span>
                      {q}
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SANITY CHECK */}
          <TabsContent value="sanity" className="space-y-6 outline-none">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Conflicts & Resolutions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="grid grid-cols-12 bg-muted/50 p-3 border-b border-border text-xs font-semibold text-muted-foreground">
                    <div className="col-span-3">Item</div>
                    <div className="col-span-5">Finding</div>
                    <div className="col-span-4">Resolution</div>
                  </div>
                  {[
                    { item: "Revenue Figure", finding: "Management pack figure differs from filed accounts — variance flagged as diligence item (example)", res: "Filed accounts take precedence. Variance flagged as diligence item.", status: "diligence" },
                    { item: "ARR Validation", finding: "ARR from management pack absent from official accounts", res: "Demoted to 'Candidate' fact. Blocking gap.", status: "blocking" },
                    { item: "Customer Mix", finding: "Customer concentration not verified in static sample mode", res: "Request concentration schedule before IC use.", status: "warning" }
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-12 p-4 border-b border-border last:border-0 items-start bg-card gap-4">
                      <div className="col-span-3 text-sm font-medium">{row.item}</div>
                      <div className="col-span-5 text-sm text-muted-foreground">{row.finding}</div>
                      <div className="col-span-4 flex flex-col gap-2 items-start">
                        <span className="text-sm text-foreground">{row.res}</span>
                        <StatusChip status={row.status.charAt(0).toUpperCase() + row.status.slice(1)} variant={row.status as any} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DD PLAN */}
          <TabsContent value="dd" className="space-y-6 outline-none">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-1">Generated Due Diligence Plan</h3>
              <p className="text-sm text-muted-foreground">7 focused workstreams prioritised based on identified gaps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Revenue Quality", priority: "High", items: ["ARR definition & validation", "SaaS vs services revenue split", "Historical revenue bridge"] },
                { title: "Financial Statements", priority: "High", items: ["EBITDA bridge to GAAP", "Debt & lease schedule", "Working capital normalisation"] },
                { title: "Customer Analysis", priority: "High", items: ["Top-5 concentration schedule", "Historical churn data", "Net retention metrics"] },
                { title: "Product & Technology", priority: "Medium", items: ["Product roadmap review", "Tech stack architecture", "Open source dependencies"] },
                { title: "Legal & IP", priority: "Medium", items: ["IP assignments confirmation", "Material contracts review", "Pending litigation check"] },
                { title: "AI Risk Assessment", priority: "Medium", items: ["AI product roadmap", "Data rights dependencies", "Automation risk mapping"] },
                { title: "Management & Team", priority: "Medium", items: ["Key person risk assessment", "Incentive structure review", "Succession planning"] }
              ].map((ws, i) => (
                <Card key={i} className={`border ${ws.priority === 'High' ? 'border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.05)]' : 'border-border'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {ws.title}
                      </CardTitle>
                      <SemanticBadge tone={ws.priority === 'High' ? 'warning' : 'unknown'}>
                        {ws.priority} Priority
                      </SemanticBadge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mt-2">
                      {ws.items.map((item, j) => (
                        <li key={j} className="text-sm flex items-start gap-2 text-muted-foreground">
                          <span className="text-primary mt-1">•</span> {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
