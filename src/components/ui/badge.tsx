import * as React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'whitespace-nowrap inline-flex items-center justify-center rounded-[var(--feds-radius-4)] border px-2 py-1 type-label transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          'border-[var(--semantic-info-border)] bg-[var(--semantic-info-bg)] text-[var(--semantic-info-text)] shadow-xs',
        secondary:
          // @replit no hover because we use hover-elevate
          'border-[var(--semantic-unknown-border)] bg-[var(--semantic-unknown-bg)] text-[var(--semantic-unknown-text)]',
        destructive:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          'border-[var(--semantic-blocker-border)] bg-[var(--semantic-blocker-bg)] text-[var(--semantic-blocker-text)] shadow-xs',
        // @replit shadow-xs" - use badge outline variable
        outline: 'text-foreground border [border-color:var(--badge-outline)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
