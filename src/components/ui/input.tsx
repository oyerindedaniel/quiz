import * as React from "react";

import { cn } from "@/utils/lib";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-gray-900 placeholder:text-gray-500 selection:bg-brand-500 selection:text-white dark:bg-gray-100 border-gray-300 flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-brand-500 focus-visible:ring-brand-200 focus-visible:ring-[3px]",
        "aria-invalid:ring-incorrect-200 dark:aria-invalid:ring-incorrect-400 aria-invalid:border-incorrect-500",
        className
      )}
      {...props}
    />
  );
}

export { Input };
