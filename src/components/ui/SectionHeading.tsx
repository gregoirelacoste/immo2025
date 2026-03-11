import { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  className?: string;
}

export default function SectionHeading({ children, className = "" }: SectionHeadingProps) {
  return (
    <h2 className={`text-lg font-semibold mb-4 ${className}`}>{children}</h2>
  );
}
