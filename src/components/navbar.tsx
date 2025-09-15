import Link from "next/link";
import React from "react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Image from "next/image";

function Navbar() {
  return (
    <div className="fixed inset-x-0 top-0 bg-gray-50 border-b border-gray-200 z-[10] h-fit py-3">
      <div className="flex items-center justify-between h-full gap-2 px-8 mx-auto">
        <div className="flex flex-row gap-4 justify-center items-center">
          <Link href={"/dashboard"} className="flex items-center">
            <p className="text-xl font-bold">
              <span className="text-orange-500">Rapid</span>
              <span className="text-gray-500">Screen</span>{" "}
              <span className="text-[10px] text-gray-400 font-normal">Trial</span>
            </p>
          </Link>
          <p className="my-auto text-lg text-gray-300">/</p>
          <div className="my-auto">
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/dashboard"
              hidePersonal={true}
              afterSelectOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/dashboard"
              appearance={{
                variables: {
                  fontSize: "0.9rem",
                  colorPrimary: "#f97316", // orange-500
                },
                elements: {
                  organizationSwitcherTrigger: "text-gray-700 hover:text-orange-500",
                  organizationSwitcherTriggerIcon: "text-gray-500",
                }
              }}
            />
          </div>
        </div>
        <div className="flex items-center">
          <UserButton 
            afterSignOutUrl="/sign-in" 
            signInUrl="/sign-in"
            appearance={{
              variables: {
                colorPrimary: "#f97316", // orange-500
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default Navbar;
