import { UserProfile } from "@/domains/auth/types";

interface Props {
  monthlyPayment: number;
  monthlyInsurance: number;
  userProfile?: UserProfile | null;
}

export default function BudgetIndicator({ monthlyPayment, monthlyInsurance, userProfile }: Props) {
  if (!userProfile?.monthly_income || userProfile.monthly_income <= 0) return null;

  const totalMonthly = monthlyPayment + monthlyInsurance + (userProfile.existing_credits || 0);
  const debtRatio = (totalMonthly / userProfile.monthly_income) * 100;

  let color: string;
  let bgColor: string;
  let label: string;

  if (debtRatio < 30) {
    color = "text-green-700";
    bgColor = "bg-green-100";
    label = "Budget OK";
  } else if (debtRatio <= 35) {
    color = "text-orange-700";
    bgColor = "bg-orange-100";
    label = "Limite";
  } else {
    color = "text-red-700";
    bgColor = "bg-red-100";
    label = "Hors budget";
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bgColor}`}>
      {label} ({debtRatio.toFixed(0)}%)
    </span>
  );
}
