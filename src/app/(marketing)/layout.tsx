import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Show } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/app/theme-toggle";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/70 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-md">
              <Stethoscope className="size-4" aria-hidden />
            </span>
            <span className="font-display text-base font-semibold">
              AesthetIQ
            </span>
          </Link>

          <nav className="text-muted-foreground ml-6 hidden items-center gap-5 text-sm sm:flex">
            <Link href="/#features" className="hover:text-foreground">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Show when="signed-out">
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Start free</Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild size="sm">
                <Link href="/dashboard">Open clinic</Link>
              </Button>
            </Show>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm sm:px-6">
          <span className="font-display text-foreground font-semibold">
            AesthetIQ
          </span>
          <span>Clinic management for aesthetic practices.</span>
          <Link href="/pricing" className="hover:text-foreground ml-auto">
            Pricing
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
