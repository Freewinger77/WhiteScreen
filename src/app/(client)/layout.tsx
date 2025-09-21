"use client";

import "../globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import Navbar from "@/components/navbar";
import Providers from "@/components/providers";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import SideMenu from "@/components/sideMenu";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

const metadata = {
  title: "VocalHire",
  description: "Voice AI-powered Interviews",
  openGraph: {
    title: "VocalHire",
    description: "Voice AI-powered Interviews",
    siteName: "VocalHire",
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
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <link rel="icon" href="/browser-client-icon.ico" />
      </head>
      <body
        className={cn(
          inter.className,
          "antialiased overflow-hidden min-h-screen",
        )}
      >
        <ClerkProvider
          signInFallbackRedirectUrl={"/dashboard"}
          afterSignOutUrl={"/sign-in"}
        >
          <Providers>
            {!pathname.includes("/sign-in") &&
              !pathname.includes("/sign-up") && <Navbar />}
            {pathname.includes("/sign-in") || pathname.includes("/sign-up") ? (
              <div className="h-screen w-full">
                {children}
              </div>
            ) : (
              <div className="flex flex-row h-screen">
                <SideMenu />
                <div className="ml-[200px] pt-[64px] h-full overflow-y-auto flex-grow">
                  {children}
                </div>
              </div>
            )}
            <Toaster
              toastOptions={{
                classNames: {
                  toast: "bg-white border border-gray-200",
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
