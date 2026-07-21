export type VerificationState = 'VERIFIED_PUBLIC_SOURCE' | 'VERIFIED_UPLOADED_DOCUMENT' | 'COMPANY_CLAIM' | 'NOT_FOUND' | 'CONFLICT' | 'UNKNOWN';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
}

export function verifiedFactPresentation(item: Record<string, unknown>) {
  const source = text(item.source ?? item.source_type ?? item.verification_state).toLowerCase();
  const uploaded = source.includes('uploaded') || source.includes('document') || text(item.verification_status).toLowerCase() === 'audited_primary_source';
  const label = text(item.label ?? item.metric_label ?? item.metric_name ?? item.field ?? item.title ?? item.claim_type)
    || (uploaded ? 'Verified document fact' : 'Verified public fact');
  const page = text(item.page ?? item.source_page);
  const document = text(item.source_document ?? item.document_name ?? item.filename);
  const publicSource = text(item.source_label) || 'Public source';
  return {
    label,
    state: (uploaded ? 'VERIFIED_UPLOADED_DOCUMENT' : 'VERIFIED_PUBLIC_SOURCE') as VerificationState,
    sourceCopy: uploaded
      ? `Verified in uploaded annual report${document ? ` · ${document}` : ''}${page ? ` · Page ${page}` : ''}`
      : `Verified in public source · ${publicSource}`,
    tone: uploaded ? 'document' as const : 'public' as const,
  };
}
