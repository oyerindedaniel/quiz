import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-brand-500 focus-visible:ring-brand-200 focus-visible:ring-[3px] aria-invalid:ring-incorrect-200 dark:aria-invalid:ring-incorrect-400 aria-invalid:border-incorrect-500 transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-500 text-white [a&]:hover:bg-brand-600",
        secondary:
          "border-transparent bg-gray-100 text-gray-900 [a&]:hover:bg-gray-200",
        destructive:
          "border-transparent bg-incorrect-500 text-white [a&]:hover:bg-incorrect-600 focus-visible:ring-incorrect-200 dark:focus-visible:ring-incorrect-400 dark:bg-incorrect-600",
        outline: "text-gray-900 [a&]:hover:bg-gray-50 [a&]:hover:text-gray-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
