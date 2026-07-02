import React, { useState } from 'react';
import { Send, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { BookIntroButton, BOOK_INTRO_URL } from '@/components/BookIntroButton';
import { DocumentReviewPanel } from '@/components/DocumentReviewPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { getBackendBaseUrl } from '@/lib/frontierApi';

const PILOT_FEATURES = [
  { label: 'UK company screening', note: 'Companies House, audited accounts, HMRC references' },
  { label: 'US company screening',  note: 'SEC EDGAR filings (public companies)' },
  { label: 'German company screening', note: 'Handelsregister connector (manual v1)' },
  { label: 'Document-assisted review', note: 'Pitch decks, CIMs, management packs, Excel exports' },
  { label: 'AI defensibility analysis', note: 'Replica risk, moat evidence, inference economics' },
  { label: 'IC-readiness output', note: 'Evidence pack and diligence gap list' },
  { label: 'Deal cockpit', note: 'Pipeline tracking and decision history' },
];

const UPLOAD_PREFS = ['Yes', 'Maybe after data terms', 'No, URL-only first'];

const DOC_TYPES = [
  'pitch deck', 'CIM', 'financial model', 'board deck',
  'management pack', 'Excel export', 'other',
];

const DATA_CONCERNS = [
  'retention', 'model provider use', 'customer confidentiality',
  'legal permission to process', 'security review', 'other',
];

const TEAM_SIZES = ['1–3 people', '4–10 people', '11–30 people', '30+ people'];
const DEAL_VOLUMES = ['1–5 screens per month', '6–20 screens', '21–50 screens', '50+ screens'];

export default function RequestPilotPage() {
  const [submitState, setSubmitState] = useState<'idle' | 'success' | 'fallback' | 'error'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [fallbackEmail, setFallbackEmail] = useState('contact@getfrontieros.com');
  const [bookIntroUrl, setBookIntroUrl] = useState(BOOK_INTRO_URL);
  const [form, setForm] = useState({
    name: '', email: '', organisation: '', role: '',
    teamSize: '', dealVolume: '', targetJurisdictions: '',
    uploadPref: '', docTypes: [] as string[], dataConcerns: [] as string[],
    notes: '',
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function toggleMulti(field: 'docTypes' | 'dataConcerns', value: string) {
    setForm(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitState('idle');
    setResponseMessage('');

    const workflow = [
      form.uploadPref && `Upload preference: ${form.uploadPref}`,
      form.docTypes.length > 0 && `Document types: ${form.docTypes.join(', ')}`,
      form.dataConcerns.length > 0 && `Data concerns: ${form.dataConcerns.join(', ')}`,
    ].filter(Boolean).join('\n');

    const payload = {
      name: form.name,
      email: form.email,
      organisation: form.organisation,
      role: form.role,
      team_size: form.teamSize,
      screens_per_month: form.dealVolume,
      target_jurisdictions: form.targetJurisdictions,
      workflow,
      message: form.notes,
      source: 'request_pilot',
    };

    try {
      const base = getBackendBaseUrl();
      const res = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (import.meta.env.DEV) {
        console.debug('[contact] request pilot submitted', data);
      }
      const contactEmail = typeof data?.contact_email === 'string'
        ? data.contact_email
        : typeof data?.fallback_email === 'string'
          ? data.fallback_email
          : 'contact@getfrontieros.com';
      const bookingUrl = typeof data?.book_intro_url === 'string' ? data.book_intro_url : BOOK_INTRO_URL;
      setFallbackEmail(contactEmail);
      setBookIntroUrl(bookingUrl);

      if (
        res.ok &&
        (
          (data?.sent === false && data?.reason === 'email_not_configured') ||
          data?.delivery_mode === 'email_not_configured'
        )
      ) {
        setResponseMessage(
          typeof data?.message === 'string'
            ? data.message
            : `Please email ${contactEmail} or book a 30-minute intro.`,
        );
        setSubmitState('fallback');
        return;
      }

      if (res.ok && (data?.sent === true || data?.status === 'ok')) {
        setResponseMessage(typeof data?.message === 'string' ? data.message : 'Request received');
        setSubmitState('success');
        return;
      }

      if (!res.ok || data?.status !== 'ok') {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Request failed');
      }
    } catch {
      setFallbackEmail('contact@getfrontieros.com');
      setBookIntroUrl(BOOK_INTRO_URL);
      setResponseMessage('Please email contact@getfrontieros.com or book a 30-minute intro.');
      setSubmitState('error');
    } finally {
      setSubmitting(false);
    }
  }

  const showFallback = submitState === 'fallback' || submitState === 'error';

  return (
    <div className="flex-1 w-full">
      {/* header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-2">Pilot</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Request a pilot.</h1>
          <p className="text-base text-muted-foreground">
            Pilot conversations can define screen scope, document handling, retention and deletion requirements
            before any confidential material is processed.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 space-y-12">

        {/* what's included */}
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-4">What a pilot includes</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PILOT_FEATURES.map(({ label, note }) => (
              <div key={label} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* demo notice */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-amber-500/8 border border-amber-500/20 text-amber-400 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Private beta preview — if this form fails, email{' '}
          <a href="mailto:contact@getfrontieros.com" className="underline underline-offset-2 ml-0.5">
            contact@getfrontieros.com
          </a>.
        </div>

        {submitState === 'success' ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground mb-1">Request received</p>
              <p className="text-sm text-muted-foreground">
                Thanks — we'll review your message and respond from{' '}
                <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">
                  contact@getfrontieros.com
                </a>.
              </p>
            </div>
            <div className="pt-1">
              <p className="text-xs text-muted-foreground mb-3">Prefer to talk sooner?</p>
              <BookIntroButton
                eventName="clicked_book_intro_request_pilot"
                variant="outline"
                className="mx-auto"
              />
            </div>
            <button onClick={() => { setSubmitState('idle'); setResponseMessage(''); }} className="text-xs text-muted-foreground hover:text-primary transition-colors mt-1">
              Reset form
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* sidebar — Prefer to talk first? */}
            <div className="lg:order-2">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5 sticky top-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Prefer to talk first?</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Book a 30-minute intro to discuss your screening workflow, target volume, document sensitivity and whether Frontier OS is a fit for a private beta pilot.
                </p>
                <BookIntroButton
                  eventName="clicked_book_intro_request_pilot"
                  variant="primary"
                  className="w-full justify-center"
                />
              </div>
            </div>

            {/* form */}
            <div className="lg:col-span-2 lg:order-1">
          <form onSubmit={handleSubmit} className="space-y-8">
            {showFallback && (
              <div className={cn(
                'rounded-lg border px-4 py-3 text-sm',
                submitState === 'error'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'border-amber-500/25 bg-amber-500/10 text-amber-300',
              )}>
                <p className="font-semibold text-foreground mb-1">
                  {submitState === 'error' ? 'Request could not be sent' : 'Email delivery is not configured yet'}
                </p>
                <p className="text-muted-foreground">
                  {responseMessage || `Please email ${fallbackEmail} or book a 30-minute intro.`}
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <a
                    href={`mailto:${fallbackEmail}`}
                    className="inline-flex items-center justify-center text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
                  >
                    Email {fallbackEmail}
                  </a>
                  <a
                    href={bookIntroUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent h-8 px-3 rounded-md transition-colors text-foreground"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Book intro
                  </a>
                </div>
              </div>
            )}

            {/* contact details */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-4">Your details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} className="bg-background" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="bg-background" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="org">Organisation</Label>
                  <Input id="org" value={form.organisation} onChange={e => set('organisation', e.target.value)} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={form.role} onChange={e => set('role', e.target.value)} className="bg-background" />
                </div>
              </div>
            </div>

            {/* deal workflow */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-4">Deal workflow</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Team size</Label>
                  <Select value={form.teamSize} onValueChange={v => set('teamSize', v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{TEAM_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Screens per month (approx.)</Label>
                  <Select value={form.dealVolume} onValueChange={v => set('dealVolume', v)}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{DEAL_VOLUMES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5 mt-4">
                <Label htmlFor="jurisdictions">Target jurisdictions (e.g. UK, US, DE)</Label>
                <Input
                  id="jurisdictions"
                  value={form.targetJurisdictions}
                  onChange={e => set('targetJurisdictions', e.target.value)}
                  className="bg-background"
                  placeholder="UK, US, Germany..."
                />
              </div>
            </div>

            {/* document-assisted review */}
            <DocumentReviewPanel />
            <div className="rounded-lg border border-border bg-card/50 p-5">
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">Document-assisted review — pilot interest</p>
              <p className="text-xs text-muted-foreground mb-5">
                Pilot conversations can define document handling, retention and deletion requirements before any confidential material is processed.
              </p>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <Label>Would you upload pitch decks or management packs?</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {UPLOAD_PREFS.map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set('uploadPref', p)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm border transition-colors',
                          form.uploadPref === p
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Document types you might use</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DOC_TYPES.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleMulti('docTypes', d)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm border transition-colors',
                          form.docTypes.includes(d)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Data concerns (select any that apply)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {DATA_CONCERNS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleMulti('dataConcerns', c)}
                        className={cn(
                          'px-3 py-1.5 rounded-md text-sm border transition-colors',
                          form.dataConcerns.includes(c)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Anything else you want us to know</Label>
              <textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Sector focus, existing tools, timing..."
              />
            </div>

            <p className="text-xs text-muted-foreground/70">
              Pilot conversations can define document handling, retention and deletion requirements.{' '}
              <Link href="/privacy" className="text-primary/80 hover:text-primary underline underline-offset-2">Privacy Notice</Link>
              {' · '}
              <Link href="/terms" className="text-primary/80 hover:text-primary underline underline-offset-2">Terms of Use</Link>
              {' · '}
              <Link href="/data-processing" className="text-primary/80 hover:text-primary underline underline-offset-2">Data Processing</Link>
            </p>

            <Button type="submit" className="w-full h-11 text-base" disabled={submitting}>
              {submitting ? 'Sending request...' : showFallback ? 'Retry request' : 'Request pilot'}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
