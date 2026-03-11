type Variant = "private" | "public";

interface BadgeProps {
  variant: Variant;
}

const labels: Record<Variant, string> = {
  private: "Privé",
  public: "Public",
};

export default function Badge({ variant }: BadgeProps) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
      {labels[variant]}
    </span>
  );
}
