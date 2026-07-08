import React from 'react';
import { useLocation } from 'wouter';
import { CheckCircle2, XCircle, ChevronRight, FileText, Download, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RiskBadge } from '@/components/RiskBadge';

export default function ResultsPreview() {
  const [, setLocation] = useLocation();

  const handleRunNew = () => setLocation('/run');
  const handleViewMemo = () => setLocation('/memo');

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto pb-12">
      {/* Example screen notice */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-6 py-2 text-xs text-amber-700 flex items-center gap-2">
        <span className="font-semibold tracking-normal">Example screen</span>
        <span className="text-amber-700/60">·</span>
        <span>Static example — not a real company. Public-source facts require source metadata.</span>
      </div>

      {/* Top Bar */}
      <div className="border-b border-border bg-card py-6 px-6 md:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight">Illustrative target</h1>
            <Badge variant="outline" className="bg-muted font-mono rounded text-muted-foreground border-border">Static example</Badge>
          </div>
          <p className="text-sm text-muted-foreground">Generated Today</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-amber-500/20 hover:bg-amber-500/20 font-semibold px-3 py-1">
              Request Financials
            </Badge>
            <Badge className="bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-amber-500/20 hover:bg-amber-500/20 px-3 py-1">
              Partially Ready
            </Badge>
            <Badge className="bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-blue-500/20 hover:bg-blue-500/20 px-3 py-1">
              Adjacent Fit
            </Badge>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={handleRunNew} className="flex-1 sm:flex-none">
              Run Another
            </Button>
            <Button onClick={handleViewMemo} className="flex-1 sm:flex-none">
              View Full IC Memo
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="p-6 md:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Row 1 */}
        <Card className="col-span-1 border-border lg:col-span-1 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recommendation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 rounded bg-amber-500/20 text-amber-500 font-bold text-lg border border-amber-500/30">
                Request Financials
              </span>
            </div>
            <p className="text-sm text-foreground leading-relaxed mb-4">
              Financial quality, ARR, customer concentration and adjusted EBITDA reconciliation remain unknown until source-backed evidence is provided.
            </p>
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              IC readiness: Partially ready
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border lg:col-span-2 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Key Evidence</CardTitle>
            <Badge className="bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-amber-500/20">Static example · no fake figures</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Revenue</span>
                </div>
                <div className="font-mono text-2xl font-bold mb-1">—</div>
                <div className="text-[10px] text-muted-foreground">Not verified in this public-source preview</div>
              </div>
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Net cash</span>
                </div>
                <div className="font-mono text-2xl font-bold mb-1">—</div>
                <div className="text-[10px] text-muted-foreground">Not verified in this public-source preview</div>
              </div>
              <div className="p-4 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-muted-foreground">EBITDA margin</span>
                </div>
                <div className="font-mono text-2xl font-bold mb-1">—</div>
                <div className="text-[10px] text-muted-foreground">Not verified in this public-source preview</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row 2 */}
        <Card className="col-span-1 lg:col-span-3 border-red-500/30 bg-red-500/5 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-red-500 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Blocking Gaps
            </CardTitle>
            <Badge className="bg-red-500 text-white">6 Gaps</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              {[
                "ARR and recurring revenue definition",
                "SaaS vs services revenue split",
                "Adjusted EBITDA bridge to GAAP",
                "Top-customer concentration schedule",
                "Debt / lease / off-balance sheet schedule",
                "Shareholder register"
              ].map((gap, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-background border border-border">
                  <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="text-sm font-medium">{gap}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Row 3 */}
        <Card className="col-span-1 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Indicative Valuation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-muted-foreground">Bear (3.5x)</span>
                <span className="font-mono font-bold text-foreground">Not available</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-blue-500/10 border border-blue-500/30">
                <span className="text-sm text-blue-500 font-medium">Base (4.5x)</span>
                <span className="font-mono font-bold text-blue-500">Not available</span>
              </div>
              <div className="flex justify-between items-center p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-muted-foreground">Bull (6.0x)</span>
                <span className="font-mono font-bold text-foreground">Not available</span>
              </div>
            </div>
            <p className="text-xs italic text-amber-500 p-2 bg-amber-500/10 rounded border border-amber-500/20">
              Valuation is not shown in static sample mode. ARR and EBITDA bridge require source-backed evidence.
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Document Reconciliation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-foreground">Confirming facts</span>
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">1</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-foreground">Candidate facts</span>
                <Badge className="bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-blue-500/20">2</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-foreground">Conflicting claims</span>
                <Badge className="bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border-red-500/20">1</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border">
                <span className="text-sm text-foreground">Diligence items</span>
                <Badge className="bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-amber-500/20">4</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border shadow-sm flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Strategic & AI Fit</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Fit Score</span>
                <Badge className="bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] border-blue-500/20">Adjacent</Badge>
              </div>
              <Progress value={70} className="h-2 mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>7.0 / 10</span>
                <span>10</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Vertical software alignment is illustrative only. Buyer-specific synergies require a real URL screen.
              </p>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium">AI Risk Profile</span>
                <RiskBadge level="moderate" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI risk is illustrative only until product evidence and source metadata are available.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom CTA Row */}
        <Card className="col-span-1 lg:col-span-3 border-border shadow-sm bg-primary/5 border-primary/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Next Best Action</h3>
              <p className="text-primary font-medium text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5" /> Request financials package from target
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="bg-background" disabled>
                <Download className="mr-2 h-4 w-4" /> Export Markdown
              </Button>
              <Button onClick={handleViewMemo} size="lg">
                <FileText className="mr-2 h-4 w-4" /> View Full IC Memo
              </Button>
            </div>
          </CardContent>
        </Card>
        
      </div>
      
      <div className="px-8 text-center">
        <p className="text-xs text-muted-foreground italic">
          Frontier OS is a decision-support workflow. Outputs are indicative and require professional judgement, source review and diligence confirmation.
        </p>
      </div>
    </div>
  );
}
