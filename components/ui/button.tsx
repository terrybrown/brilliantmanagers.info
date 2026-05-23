import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)]',
        secondary:
          'border border-[var(--btn-secondary-border)] bg-transparent text-[var(--btn-secondary-fg)] hover:text-white',
        ghost:
          'bg-transparent text-slate-400 hover:text-white',
        danger:
          'border border-[var(--btn-danger-border)] bg-[var(--btn-danger-bg)] text-[var(--btn-danger-fg)] hover:opacity-80',
      },
      size: {
        default: 'px-5 py-2.5',
        sm: 'px-3 py-1.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        <span className={cn('contents', loading && 'opacity-0 pointer-events-none')}>
          {children}
        </span>
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center gap-1"
            aria-hidden="true"
          >
            <span className="btn-dot-1 h-1.5 w-1.5 rounded-full bg-current" />
            <span className="btn-dot-2 h-1.5 w-1.5 rounded-full bg-current" />
            <span className="btn-dot-3 h-1.5 w-1.5 rounded-full bg-current" />
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
