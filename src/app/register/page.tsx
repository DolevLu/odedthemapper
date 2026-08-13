import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <RegisterForm />
    </Suspense>
  );
}
