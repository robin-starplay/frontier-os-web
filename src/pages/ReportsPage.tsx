import React from 'react';
import { useLocation } from 'wouter';
import { Search, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PREVIOUS_REPORTS } from '@/data/mockData';

export default function ReportsPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">Analysis Reports</h1>
          <p className="text-sm text-muted-foreground">Historical diligence reports and IC memos.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Search companies..." 
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button onClick={() => setLocation('/run')}>
            Run New Analysis
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Recommendation</th>
                <th className="px-6 py-4 font-semibold">Evidence</th>
                <th className="px-6 py-4 font-semibold">Strategic Fit</th>
                <th className="px-6 py-4 font-semibold">Blocking Gaps</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {PREVIOUS_REPORTS.map((report, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{report.company}</span>
                      <Badge variant="outline" className="text-[10px] font-mono rounded border-border text-muted-foreground">
                        {report.ticker}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {report.recommendation === "Request Financials" ? (
                      <Badge className="bg-[var(--semantic-claim-bg)] text-[var(--semantic-claim-text)] border-amber-500/20 hover:bg-amber-500/10">
                        {report.recommendation}
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">
                        {report.recommendation}
                      </Badge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={
                      report.evidenceQuality === "High" ? "text-green-500 border-green-500/30" : "text-amber-500 border-amber-500/30"
                    }>
                      {report.evidenceQuality}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                      {report.strategicFit}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {report.blockingGaps > 0 ? (
                      <span className="inline-flex items-center justify-center bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] border border-red-500/20 rounded px-2 py-0.5 text-xs font-bold">
                        {report.blockingGaps}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {report.date}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setLocation('/results')} className="text-primary hover:text-primary hover:bg-primary/10">
                      <FileText className="h-4 w-4 mr-2" />
                      Open Report
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}