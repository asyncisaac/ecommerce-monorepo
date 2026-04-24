import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "../components/Navbar";
import ToastProvider from "../components/ToastProvider";
import AuthProvider from "../components/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loja",
  description: "E-commerce demo fullstack com Next.js, Express, tRPC e Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased min-h-screen`}>
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
