import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/lib";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-brand-500 focus-visible:ring-brand-200 focus-visible:ring-[3px] aria-invalid:ring-incorrect-200 dark:aria-invalid:ring-incorrect-400 aria-invalid:border-incorrect-500",
  {
    variants: {
      variant: {
        default: "bg-brand-500 text-white shadow-xs hover:bg-brand-600",
        destructive:
          "bg-incorrect-500 text-white shadow-xs hover:bg-incorrect-600 focus-visible:ring-incorrect-200 dark:focus-visible:ring-incorrect-400 dark:bg-incorrect-600",
        outline:
          "border bg-white shadow-xs hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-100 dark:border-gray-300 dark:hover:bg-gray-200",
        secondary: "bg-gray-100 text-gray-900 shadow-xs hover:bg-gray-200",
        ghost: "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-100",
        link: "text-brand-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
