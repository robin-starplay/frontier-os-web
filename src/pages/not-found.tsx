import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center bg-background text-foreground min-h-[calc(100vh-140px)]">
      <div className="flex flex-col items-center text-center max-w-md p-8 border border-border bg-card rounded-lg shadow-sm">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold tracking-tight mb-2">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The quadrant you are looking for does not exist or has been reclassified.
        </p>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
