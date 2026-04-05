import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { UIStateProvider } from "./state/ui-state";
import PushNotificationsProvider from "./components/push-notifications-provider";

const dmSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  preload: false,
});

const syne = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "CloudDuty",
  description: "CloudDuty SaaS dashboard experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="minimal"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider>
          <UIStateProvider>
            <PushNotificationsProvider />
            {children}
          </UIStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
