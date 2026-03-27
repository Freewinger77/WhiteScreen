"use client";

import { useSignIn } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function ForgotPasswordPage() {
  const { signIn, isLoaded } = useSignIn();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Handle sending reset code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setSuccessfulCreation(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        router.push("/sign-in");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* Left Side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 p-4">
        <div className="relative w-full h-full rounded-[24px] overflow-hidden">
          <Image
            src="/auth-bg.png"
            alt="RapidScreen"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-2xl tracking-wide">
              <span className="font-extrabold italic text-orange-500">RAPID</span>
              <span className="font-light text-gray-500">SCREEN</span>
            </p>
          </div>

          {/* Header */}
          <h1 className="text-3xl font-bold text-center text-gray-900">
            {successfulCreation ? "Reset Password" : "Forgot Password"}
          </h1>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!successfulCreation ? (
            /* Send Code Form */
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                Enter your email address and we&apos;ll send you a code to reset your password.
              </p>

              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-full text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send Reset Code"}
              </button>
            </form>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                We&apos;ve sent a reset code to <strong>{email}</strong>
              </p>

              <input
                type="text"
                placeholder="Enter reset code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-14 bg-[#F5F5F7] border-0 text-base text-center placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200 tracking-widest"
                required
              />

              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-full text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>

              <button
                type="button"
                onClick={() => setSuccessfulCreation(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back
              </button>
            </form>
          )}

          {/* Back to Sign In Link */}
          <p className="text-center text-sm text-gray-500">
            Remember your password?{" "}
            <Link href="/sign-in" className="text-[#A78BFA] hover:text-[#9F7AEA] transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
