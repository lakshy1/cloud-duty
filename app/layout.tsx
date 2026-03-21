import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { UIStateProvider } from "./state/ui-state";

const dmSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const syne = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  const themeScript = `
    (function() {
      try {
        var t = localStorage.getItem('theme');
        if (t !== 'minimal' && t !== 'obsidian') t = 'minimal';
        var root = document.documentElement;
        root.setAttribute('data-theme', t);
        root.classList.toggle('dark', t === 'obsidian');
      } catch (e) {}
    })();
  `;
  return (
    <html
      lang="en"
      data-theme="minimal"
      className={`${dmSans.variable} ${syne.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <UIStateProvider>{children}</UIStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
