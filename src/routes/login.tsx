import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";
import { BRAND } from "@/lib/brand";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: `Sign in | ${BRAND.name}` },
      { name: "description", content: `Sign in to the ${BRAND.name} advice workspace.` },
      { property: "og:title", content: `Sign in | ${BRAND.name}` },
      { property: "og:description", content: `Sign in to the ${BRAND.name} advice workspace.` },
    ],
  }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
  return (
    <AuthLayout
      wide
      tab="signin"
      title={t("auth.signin")}
      subtitle={`Your ${BRAND.name} advice workspace.`}
    >
      <SignInForm />
    </AuthLayout>
  );
}
