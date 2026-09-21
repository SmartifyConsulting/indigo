import { createFileRoute } from "@tanstack/react-router";

import { AuthLayout } from "@/components/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: `Set up your agency | ${BRAND.name}` },
      { name: "description", content: `Create an FSP workspace on ${BRAND.name}.` },
      { property: "og:title", content: `Set up your agency | ${BRAND.name}` },
      { property: "og:description", content: `Create an FSP workspace on ${BRAND.name}.` },
    ],
  }),
  component: Signup,
});

function Signup() {
  return (
    <AuthLayout
      wide
      tab="signup"
      title={`Set up your agency on ${BRAND.name}`}
      subtitle="For FSP owners and Key Individuals. Advisors are invited afterwards."
    >
      <SignUpForm />
    </AuthLayout>
  );
}
