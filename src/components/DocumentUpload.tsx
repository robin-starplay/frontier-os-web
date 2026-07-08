import React, { useRef, useState } from 'react';
import { Upload, X, FileText, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = '.pdf,.pptx,.docx,.xlsx,.txt,.md';
const ACCEPTED_EXTS = ['pdf', 'pptx', 'docx', 'xlsx', 'txt', 'md'];

const DOCUMENT_CATEGORIES = [
  'pitch deck', 'CIM', 'management pack', 'financial model',
  'board deck', 'annual report', 'customer data export', 'other',
];

const SENSITIVITY_LEVELS = ['public', 'internal', 'confidential', 'highly confidential'];

const RETENTION_PREFS = [
  'URL-only / no upload',
  'delete after run',
  'delete after 7 days',
  'agree before pilot',
];

interface MockFile {
  id: string;
  filename: string;
  file_type: string;
  size_mb: string;
  document_category: string;
  sensitivity_level: string;
  retention_preference: string;
}

function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() ?? 'file';
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<MockFile[]>([]);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(fileList: FileList) {
    const next: MockFile[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = extOf(f.name);
      if (!ACCEPTED_EXTS.includes(ext)) continue;
      next.push({
        id: `${Date.now()}-${i}`,
        filename: f.name,
        file_type: ext.toUpperCase(),
        size_mb: formatSize(f.size),
        document_category: '',
        sensitivity_level: '',
        retention_preference: '',
      });
    }
    setFiles(prev => [...prev, ...next]);
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id));
  }

  function updateFile(id: string, field: keyof MockFile, value: string) {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  }

  const hasConfidential = files.some(
    f => f.sensitivity_level === 'confidential' || f.sensitivity_level === 'highly confidential',
  );

  return (
    <div className="space-y-3">
      {/* demo warning — compact amber bar */}
      <div className="flex items-center gap-2 px-3 py-2 rounded bg-amber-500/8 border border-amber-500/20 text-amber-700 text-xs">
        <Info className="w-3.5 h-3.5 shrink-0" />
        Upload is simulated in the private beta sample workflow. Do not upload confidential documents here.
      </div>

      {/* drop zone — use label wrapping a hidden input for full keyboard/screen-reader support */}
      <label
        htmlFor="doc-upload-input"
        tabIndex={0}
        role="button"
        aria-label="Select documents to upload"
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          dragOver
            ? 'border-primary/60 bg-primary/5'
            : 'border-border hover:border-primary/30 hover:bg-muted/20',
        )}
      >
        <Upload className="w-6 h-6 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Upload documents for document-assisted review</p>
          <p className="text-xs text-muted-foreground mt-1">
            Pitch decks, CIMs, management packs, Excel exports and filings can be used in controlled document-assisted workflows.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">
            PDF · PPTX · DOCX · XLSX · TXT · MD
          </p>
        </div>
        <input
          id="doc-upload-input"
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          multiple
          className="hidden"
          onChange={e => { if (e.target.files) addFiles(e.target.files); }}
        />
      </label>

      {/* confidential warning */}
      {hasConfidential && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Confidential documents should only be processed in a controlled pilot with agreed retention, deletion and provider data-use settings.
        </div>
      )}

      {/* file list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Files selected for preview only. No files are transmitted in the private beta sample workflow.
          </p>
          {files.map(f => (
            <div key={f.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.filename}</p>
                    <p className="text-xs text-muted-foreground">{f.file_type} · {f.size_mb}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-muted-foreground/60 border border-border rounded px-1.5 py-0.5">
                    not uploaded — sample only
                  </span>
                  <button
                    onClick={() => removeFile(f.id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Select value={f.document_category} onValueChange={v => updateFile(f.id, 'document_category', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Document category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={f.sensitivity_level} onValueChange={v => updateFile(f.id, 'sensitivity_level', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Sensitivity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SENSITIVITY_LEVELS.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={f.retention_preference} onValueChange={v => updateFile(f.id, 'retention_preference', v)}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Retention" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_PREFS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* legal links */}
      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Before using document-assisted workflows, review the{' '}
        <Link href="/privacy" className="text-primary/80 hover:text-primary underline underline-offset-2">Privacy Notice</Link>,{' '}
        <Link href="/data-processing" className="text-primary/80 hover:text-primary underline underline-offset-2">Data Processing</Link>{' '}
        notes and{' '}
        <Link href="/terms" className="text-primary/80 hover:text-primary underline underline-offset-2">Terms of Use</Link>.
        Do not upload confidential documents in the private beta sample workflow.
      </p>
    </div>
  );
}
