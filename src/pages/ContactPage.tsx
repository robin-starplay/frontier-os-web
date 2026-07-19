import React, { useState } from 'react';
import { Send, MapPin, Mail, AlertTriangle } from 'lucide-react';
import { BookIntroButton } from '@/components/BookIntroButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'wouter';

const MESSAGE_TYPES = [
  'Pilot enquiry',
  'Product feedback',
  'Data / privacy question',
  'Partnership',
  'Other',
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', organisation: '', role: '', messageType: '', message: '',
  });

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Demo only — no submission
    setSubmitted(true);
  }

  return (
    <div className="flex-1 w-full">
      {/* header */}
      <div className="w-full border-b border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
          <p className="text-[10px] font-semibold tracking-normal text-primary mb-2">Contact</p>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Get in touch.</h1>
          <p className="text-base text-muted-foreground">
            Pilot enquiries, product questions, data handling or partnership conversations.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* company details */}
          <div className="lg:col-span-1 space-y-6">
            <div>
              <p className="text-[10px] font-semibold tracking-normal text-primary mb-4">Company</p>
              <p className="text-sm font-semibold text-foreground mb-1">Frontier Intelligence Systems Ltd</p>
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-3">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground/60" />
                <span>71–75 Shelton Street<br />Covent Garden<br />London, WC2H 9JQ<br />United Kingdom</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
                <Mail className="w-4 h-4 shrink-0 text-muted-foreground/60" />
                <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">
                  contact@getfrontieros.com
                </a>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                For data handling or privacy questions, review the{' '}
                <Link href="/privacy" className="text-primary/80 hover:text-primary underline underline-offset-2">Privacy Notice</Link>{' '}
                and{' '}
                <Link href="/data-processing" className="text-primary/80 hover:text-primary underline underline-offset-2">Data Processing</Link>{' '}
                page first.
              </p>
            </div>
          </div>

          {/* form */}
          <div className="lg:col-span-2">
            {/* two options */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 rounded-lg border border-border bg-card/50 px-4 py-3 flex items-start gap-3">
                <Send className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Option A: Send a message</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fill in the form below.</p>
                </div>
              </div>
              <div className="flex-1 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
                <BookIntroButton
                  variant="link"
                  label="Option B: Book a 30-minute intro"
                  showIcon={true}
                  className="text-sm font-medium text-foreground hover:text-primary gap-2 [&>svg]:text-primary"
                />
              </div>
            </div>

            {/* info notice */}
            <div className="flex items-start gap-2 px-3 py-2.5 mb-5 rounded bg-muted/20 border border-border text-muted-foreground text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
              For live enquiries, email{' '}
              <a href="mailto:contact@getfrontieros.com" className="underline underline-offset-2 ml-0.5 text-primary hover:opacity-80">
                contact@getfrontieros.com
              </a>{' '}or book a 30-minute intro above.
            </div>

            {submitted ? (
              <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <p className="text-base font-semibold text-foreground">Message received</p>
                <p className="text-sm text-muted-foreground">
                  Thanks. We'll review your message and respond from{' '}
                  <a href="mailto:contact@getfrontieros.com" className="text-primary hover:underline">
                    contact@getfrontieros.com
                  </a>.
                </p>
                <BookIntroButton
                  eventName="clicked_book_intro_contact"
                  variant="outline"
                  className="mx-auto mt-1"
                />
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: '', email: '', organisation: '', role: '', messageType: '', message: '' }); }}
                  className="text-sm text-primary hover:underline mt-2"
                >
                  Reset form
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={form.name} onChange={e => set('name', e.target.value)} className="bg-background" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Work email</Label>
                    <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="bg-background" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="org">Organisation</Label>
                    <Input id="org" value={form.organisation} onChange={e => set('organisation', e.target.value)} className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={form.role} onChange={e => set('role', e.target.value)} className="bg-background" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Message type</Label>
                  <Select value={form.messageType} onValueChange={v => set('messageType', v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {MESSAGE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    rows={5}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder="Your message"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground/70">
                  Do not submit confidential documents or sensitive deal information through this form.
                </p>
                <Button type="submit" className="w-full h-10">
                  Send message <Send className="w-3.5 h-3.5 ml-2" />
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
