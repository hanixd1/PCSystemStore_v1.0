import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import CartSidebar from "@/components/CartSidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PC System Store",
  description: "Hardware & Gaming",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* AGREGAMOS suppressHydrationWarning={true} AQUÍ */}
      <body 
        className={`${inter.className} bg-gray-50 text-gray-900`}
        suppressHydrationWarning={true} 
      >
        <Header />
        <CartSidebar />
        <main className="min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </body>
    </html>
  );
}