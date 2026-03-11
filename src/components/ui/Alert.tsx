import { ReactNode } from "react";

type Variant = "error" | "warning" | "success" | "info";

interface AlertProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  error: "bg-red-50 border border-red-200 text-red-700",
  warning: "bg-amber-50 border border-amber-200 text-amber-700",
  success: "bg-green-50 border border-green-200 text-green-700",
  info: "bg-blue-50 border border-blue-200 text-blue-700",
};

export default function Alert({ variant = "error", children, className = "" }: AlertProps) {
  return (
    <div className={`rounded-lg p-3 text-sm ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}
