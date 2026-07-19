import React from 'react';
import { Upload, FileText, X, File, FileSpreadsheet } from 'lucide-react';

export function DocumentIngestion() {
  const mockFiles = [
    { name: "Q3_Financials.pdf", size: "2.4 MB", type: "pdf", icon: FileText },
    { name: "Pitch_Deck_v4.pdf", size: "14.1 MB", type: "pdf", icon: FileText },
    { name: "Management_Bio.docx", size: "1.2 MB", type: "docx", icon: File },
    { name: "Cohort_Analysis_2025.xlsx", size: "4.8 MB", type: "xlsx", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors rounded-lg p-8 flex flex-col items-center justify-center bg-card/50 text-center cursor-pointer group">
        <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <h4 className="text-sm font-medium mb-1 text-foreground">Upload Documents</h4>
        <p className="text-xs text-muted-foreground mb-4 max-w-[250px]">
          Drag and drop or browse PDF, Excel and Word files, including financials, cap tables and legal documents.
        </p>
        <button type="button" className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-medium rounded hover:bg-secondary/80 transition-colors border border-secondary-border">
          Browse Files
        </button>
      </div>

      <div className="space-y-2">
        <h5 className="text-xs font-semibold text-muted-foreground tracking-normal mb-3">Processed Documents</h5>
        {mockFiles.map((file, i) => {
          const Icon = file.icon;
          return (
            <div key={i} className="flex items-center justify-between p-3 rounded bg-card border border-card-border group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-secondary text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{file.size} • Uploaded today</p>
                </div>
              </div>
              <button type="button" className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
