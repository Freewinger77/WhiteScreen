import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/components/providers";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RapidScreen",
  description: "Voice AI-powered Interviews",
  openGraph: {
    title: "RapidScreen",
    description: "Voice AI-powered Interviews",
    siteName: "RapidScreen",
    images: [
      {
        url: "/Group 2.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/browser-user-icon.ico" />
      </head>
      <body className={inter.className}>
        <ClerkProvider>
          <Providers>
            {children}
            <Toaster
              toastOptions={{
                classNames: {
                  toast: "bg-white border-2 border-orange-400",
                  title: "text-gray-900",
                  description: "text-gray-600",
                  actionButton: "bg-orange-500 text-white hover:bg-orange-600",
                  cancelButton: "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  closeButton: "text-gray-400 hover:text-gray-600",
                },
              }}
            />
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
