import { Suspense } from "react";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#f4f3ef] flex items-center justify-center px-4">
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
