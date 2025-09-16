"use client";

import { SignUp } from "@clerk/nextjs";
import { Zap, Users, Shield } from "lucide-react";
import Image from "next/image";

function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-white flex overflow-hidden">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse" />
            <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-2000" />
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-orange-100 rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-4000" />
            <div className="absolute bottom-0 right-20 w-72 h-72 bg-white rounded-full mix-blend-multiply filter blur-xl animate-pulse animation-delay-1000" />
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 py-12 max-w-lg mx-auto">
          {/* Logo & Brand */}
          <div className="mb-12 text-center">
            <div className="mb-4">
              <Image 
                src="/Group 2.png" 
                alt="RapidScreen Logo" 
                width={280} 
                height={120}
                className="object-contain mx-auto"
              />
            </div>
            <div>
              <p className="text-orange-100 text-sm font-medium flex items-center gap-2 justify-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 inline-flex">
                <Zap className="w-4 h-4" />
                The next-gen AI platform
              </p>
            </div>
          </div>

          {/* Main Heading */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Let <span className="text-orange-200">AI</span> handle your calls
            </h2>
          </div>

          {/* Feature List */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Ready to Scale</h3>
                <p className="text-orange-100 text-sm leading-relaxed">
                  Handle thousands of calls simultaneously
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/80 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border border-blue-400/50">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Team Collaboration</h3>
                <p className="text-orange-100 text-sm leading-relaxed">
                  Seamless integration with your existing workflow
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500/80 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 border border-green-400/50">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Enterprise Security</h3>
                <p className="text-orange-100 text-sm leading-relaxed">
                  Bank-grade security for your conversations
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-12">
            <div className="mb-3">
              <Image 
                src="/Group 2.png" 
                alt="RapidScreen Logo" 
                width={200} 
                height={80}
                className="object-contain mx-auto"
              />
            </div>
            <p className="text-gray-600 text-xs font-medium flex items-center gap-1 justify-center bg-gray-50 rounded-full px-3 py-1 border border-gray-200 inline-flex">
              <Zap className="w-3 h-3 text-orange-500" />
              The next-gen AI platform
            </p>
          </div>

          {/* Sign Up Header */}
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Create your account</h2>
            <p className="text-gray-600 leading-relaxed">
              Try our voice AI capabilities and create in-browser interviews today
            </p>
          </div>

          {/* Clerk Sign Up Component */}
          <div className="flex justify-center">
            <SignUp 
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "mx-auto w-full",
                  card: "shadow-none border-0 bg-transparent w-full",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "bg-white border-0 shadow-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200 rounded-xl h-12 font-medium",
                  socialButtonsBlockButtonText: "font-medium text-sm",
                  dividerLine: "bg-gray-200",
                  dividerText: "text-gray-500 text-sm",
                  formFieldInput: "border border-gray-200 rounded-xl px-4 py-3 h-12 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 text-sm",
                  formButtonPrimary: "bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 h-12 border-0 shadow-none",
                  footerActionLink: "text-orange-600 hover:text-orange-700 font-medium",
                  identityPreviewText: "text-gray-700",
                  formFieldLabel: "text-gray-700 font-medium text-sm mb-2",
                  main: "w-full"
                }
              }}
            />
          </div>

          {/* Footer Text */}
          <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{" "}
              <a href="/sign-in" className="text-orange-600 hover:text-orange-700 font-medium transition-colors">
                Sign in
              </a>
            </p>
          </div>

          {/* Mobile Features */}
          <div className="lg:hidden mt-16 pt-8 border-t border-gray-100">
            <div className="text-center space-y-6">
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                <Zap className="w-4 h-4 text-orange-500" />
                <span>Ready to Scale</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                <Users className="w-4 h-4 text-blue-500" />
                <span>Team Collaboration</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Enterprise Security</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
