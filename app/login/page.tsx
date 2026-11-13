import { LoginForm } from "@/components/login-form";
import { ModalVisualTest } from "@/components/modal-visual-test";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
      <ModalVisualTest />
      <LoginForm />
    </div>
  );
}
