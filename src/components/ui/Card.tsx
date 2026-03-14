import { ReactNode } from "react";

type Padding = "sm" | "md" | "lg";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: Padding;
}

const paddingClasses: Record<Padding, string> = {
  sm: "p-3",
  md: "p-4 md:p-6",
  lg: "p-6 md:p-8",
};

export default function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <section
      className={`bg-white rounded-xl shadow-sm border border-tiili-border ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </section>
  );
}
