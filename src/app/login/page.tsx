import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ログイン | StudyStream",
};

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <div className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          StudyStream
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">ログイン</h1>
      </div>
      <LoginForm />
    </div>
  );
}
