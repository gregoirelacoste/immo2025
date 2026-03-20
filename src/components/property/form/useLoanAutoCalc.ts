"use client";

import { useEffect, useState, Dispatch, SetStateAction } from "react";
import { PropertyFormData } from "@/domains/property/types";
import { calculateNotaryFees } from "@/lib/calculations";

export function useLoanAutoCalc(
  form: PropertyFormData,
  setForm: Dispatch<SetStateAction<PropertyFormData>>
): { loanManuallySet: boolean; setLoanManuallySet: Dispatch<SetStateAction<boolean>> } {
  const [loanManuallySet, setLoanManuallySet] = useState(false);

  useEffect(() => {
    if (form.purchase_price > 0 && !loanManuallySet) {
      const notary =
        form.notary_fees > 0
          ? form.notary_fees
          : calculateNotaryFees(form.purchase_price, form.property_type);
      const furnitureCost = form.meuble_status === "meuble" ? (form.furniture_cost || 0) : 0;
      const autoLoan = Math.max(
        0,
        form.purchase_price + notary + (form.renovation_cost || 0) + furnitureCost - form.personal_contribution
      );
      setForm((prev) => ({ ...prev, loan_amount: autoLoan }));
    }
  }, [
    form.purchase_price,
    form.property_type,
    form.personal_contribution,
    form.notary_fees,
    form.renovation_cost,
    form.meuble_status,
    form.furniture_cost,
    loanManuallySet,
    setForm,
  ]);

  return { loanManuallySet, setLoanManuallySet };
}
