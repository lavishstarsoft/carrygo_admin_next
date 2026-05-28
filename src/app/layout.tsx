import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import AuthGuard from "./AuthGuard";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarryGo Admin Panel",
  description: "Admin panel to manage CarryGo drivers and orders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.className} antialiased bg-slate-50 text-slate-900`}>
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}
