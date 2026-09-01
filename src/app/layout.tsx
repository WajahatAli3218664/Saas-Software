import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AesthetIQ — Clinic management, done properly",
    template: "%s · AesthetIQ",
  },
  description:
    "Appointments, treatment records, invoicing and printing for aesthetic clinics. One subscription, every device.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html
        lang="en"
        suppressHydrationWarning
        className={`${sans.variable} ${mono.variable} ${display.variable} h-full antialiased`}
      >
        <body className="bg-background text-foreground flex min-h-full flex-col">
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
