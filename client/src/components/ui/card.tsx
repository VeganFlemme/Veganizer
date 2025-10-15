import * as React from "react"

import { cn } from "@/lib/utils"

// Card variant styles
const cardVariants = {
  default: "rounded-xl border border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 shadow-md transition-all duration-200",
  elevated: "rounded-xl border border-border/60 bg-card shadow-elevated backdrop-blur supports-[backdrop-filter]:bg-card/90",
  outline: "rounded-xl border-2 border-border bg-transparent shadow-sm",
  glass: "rounded-xl border border-border/30 bg-card/40 backdrop-blur-md supports-[backdrop-filter]:bg-card/25 shadow-lg",
  interactive: "rounded-xl border border-border/60 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 shadow-md transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-border active:translate-y-0 active:transition-duration-75"
}

type CardVariant = keyof typeof cardVariants

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  'data-variant'?: CardVariant
}

function getCardClasses(variant: CardVariant = 'default', isInteractive?: boolean) {
  const baseClasses = cardVariants[variant]
  
  if (isInteractive && variant === 'default') {
    return cardVariants.interactive
  }
  
  return baseClasses
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, variant, ...props }, ref) => {
  // Check if card should be interactive based on props
  const isInteractive = !!(props.onClick || props.onKeyDown || props.role === 'button' || props.tabIndex !== undefined)
  
  // Get variant from data attribute if provided
  const dataVariant = props['data-variant']
  const finalVariant = dataVariant || variant || 'default'
  
  return (
    <div
      ref={ref}
      className={cn(
        getCardClasses(finalVariant, isInteractive),
        "text-card-foreground",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 md:p-8", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 md:p-8 md:pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 md:p-8 md:pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
