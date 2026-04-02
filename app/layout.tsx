import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { FloatingChat } from "@/components/FloatingChat";

export const metadata: Metadata = {
  title: "Cricket Election Command Centre",
  description: "Cricket Election Command Centre — Election Operations",
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
