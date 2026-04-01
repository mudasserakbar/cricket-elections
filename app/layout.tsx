import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { FloatingChat } from "@/components/FloatingChat";

export const metadata: Metadata = {
  title: "QCF Command Centre",
  description: "Quebec Cricket Federation — Election Operations Command Centre",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8F7F4]">
        <AuthProvider>
          {children}
          <FloatingChat />
        </AuthProvider>
      </body>
    </html>
  );
}
