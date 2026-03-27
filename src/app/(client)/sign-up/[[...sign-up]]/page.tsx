"use client";

import { useSignUp } from "@clerk/nextjs";
import { OAuthStrategy } from "@clerk/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");

  // Handle email/password sign up
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setError("");

    try {
      await signUp.create({
        emailAddress: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle verification code
  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth sign up (Google, LinkedIn)
  const handleOAuthSignUp = async (strategy: OAuthStrategy) => {
    if (!isLoaded || !signUp) return;

    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string }> };
      setError(clerkError.errors?.[0]?.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* Left Side - Background Image (700x984) */}
      <div className="hidden lg:flex lg:w-[45%] h-screen items-center justify-start pl-3 py-3">
        <div className="relative rounded-[24px] overflow-hidden h-full" style={{ aspectRatio: '700/984' }}>
          <Image
            src="/auth-bg.png"
            alt="RapidScreen"
            width={700}
            height={984}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-[55%] flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <p className="text-2xl tracking-wide">
              <span className="font-extrabold italic text-orange-500">RAPID</span>
              <span className="font-light text-gray-500">SCREEN</span>
            </p>
          </div>

          {/* Sign Up Header */}
          <h1 className="text-3xl font-bold text-center text-gray-900">
            {pendingVerification ? "Verify Email" : "Sign Up"}
          </h1>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!pendingVerification ? (
            <>
              {/* Sign Up Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                    required
                  />
                </div>

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                  required
                />

                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 bg-[#F5F5F7] border-0 text-base placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200"
                  required
                />
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-4 text-gray-500">Or with</span>
                </div>
              </div>

              {/* Social Sign Up Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthSignUp("oauth_linkedin_oidc")}
                  className="h-12 bg-[#F5F5F7] border-0 hover:bg-[#EBEBED] rounded-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Sign up with Linkedin
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignUp("oauth_google")}
                  className="h-12 bg-[#F5F5F7] border-0 hover:bg-[#EBEBED] rounded-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-full text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Creating account..." : "Try Rapidscreen for Free"}
              </button>
            </>
          ) : (
            /* Verification Form */
            <form onSubmit={handleVerification} className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                We&apos;ve sent a verification code to <strong>{email}</strong>
              </p>
              
              <input
                type="text"
                placeholder="Enter verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-14 bg-[#F5F5F7] border-0 text-base text-center placeholder:text-gray-400 rounded-full px-6 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white transition-all duration-200 tracking-widest"
                required
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 bg-black text-white hover:bg-gray-900 rounded-full text-base font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Verifying..." : "Verify Email"}
              </button>

              <button
                type="button"
                onClick={() => setPendingVerification(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to sign up
              </button>
            </form>
          )}

          {/* Sign In Link */}
          <p className="text-center text-sm text-gray-500">
            Already a Member?{" "}
            <Link href="/sign-in" className="text-[#A78BFA] hover:text-[#9F7AEA] transition-colors">
              Sign In
            </Link>
          </p>

          {/* Mobile Welcome Text */}
          <div className="lg:hidden mt-12 pt-8 border-t border-gray-100">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                A faster way to hire.
              </h3>
              <p className="text-gray-500 text-sm">
                Rapidscreen AI transforms how you hire across your organisation
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
