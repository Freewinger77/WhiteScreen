import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/components/providers";
import { Toaster } from "sonner";
import SessionWrapper from "@/components/SessionWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RapidScreen",
  description: "AI powered Interviews",
  openGraph: {
    title: "RapidScreen",
    description: "AI-powered Interviews",
    siteName: "RapidScreen",
    images: [
      {
        url: "/rapidscreen.png",
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
        <SessionWrapper>
          <ClerkProvider>
            <Providers>
              {children}
              <Toaster
                toastOptions={{
                  classNames: {
                    toast: "bg-white border-2 border-orange-400",
                    title: "text-black",
                    description: "text-red-400",
                    actionButton: "bg-orange-400",
                    cancelButton: "bg-orange-400",
                    closeButton: "bg-lime-400",
                  },
                }}
              />
            </Providers>
          </ClerkProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
