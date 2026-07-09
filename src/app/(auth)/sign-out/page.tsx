import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { signOut } from "@/lib/auth/entra";
import { getSession } from "@/lib/auth/session";

export default async function SignOutPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          Sign out
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          Are you sure you want to sign out?
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <SubmitButton size="lg" className="w-full md:w-[220px]">
            Sign out
          </SubmitButton>
        </form>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full md:w-[220px]"
        >
          <Link href="/">Cancel</Link>
        </Button>
      </div>
    </>
  );
}
