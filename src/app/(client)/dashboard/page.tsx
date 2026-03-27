"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import InterviewCard, { InterviewCardSkeleton } from "@/components/dashboard/interview/interviewCard";
import CreateInterviewCard from "@/components/dashboard/interview/createInterviewCard";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { InterviewService } from "@/services/interviews.service";
import { ClientService } from "@/services/clients.service";
import { ResponseService } from "@/services/responses.service";
import { useInterviews } from "@/contexts/interviews.context";
import Modal from "@/components/dashboard/Modal";
import { Folder, Gem, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function Interviews() {
  const { interviews, interviewsLoading } = useInterviews();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { isLoaded: userLoaded } = useUser();
  const [planCheckLoading, setPlanCheckLoading] = useState<boolean>(false);
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [allowedResponsesCount, setAllowedResponsesCount] =
    useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const hasCheckedPlanRef = useRef<boolean>(false);
  const orgFetchRef = useRef<string | null>(null);

  // Full page skeleton loader
  function PageSkeleton() {
    return (
      <main className="p-8 pt-0 ml-12 mr-auto rounded-md">
        <div className="flex flex-col items-left">
          <div className="h-8 w-48 bg-gray-200 rounded-lg mt-8 animate-pulse" />
          <div className="h-4 w-64 bg-gray-100 rounded mt-2 animate-pulse" />
          <div className="mt-6 flex flex-wrap gap-4">
            <InterviewCardSkeleton />
            <InterviewCardSkeleton />
            <InterviewCardSkeleton />
          </div>
        </div>
      </main>
    );
  }

  function InterviewsLoader() {
    return (
      <>
        <InterviewCardSkeleton />
        <InterviewCardSkeleton />
        <InterviewCardSkeleton />
      </>
    );
  }

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organization?.id) {
          if (orgFetchRef.current === organization.id) {
            return;
          }
          orgFetchRef.current = organization.id;
          const data = await ClientService.getOrganizationById(
            organization.id,
            organization.name,
            organization.imageUrl
          );
          if (data?.plan) {
            setCurrentPlan(data.plan);
            if (data.plan === "free_trial_over") {
              setIsModalOpen(true);
            }
          }
          if (data?.allowed_responses_count) {
            setAllowedResponsesCount(data.allowed_responses_count);
          }
        }
      } catch (error) {
        console.error("Error fetching organization data:", error);
      }
    };

    fetchOrganizationData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  useEffect(() => {
    const fetchResponsesCount = async () => {
      if (!organization?.id || !interviews) {
        return;
      }
      if (hasCheckedPlanRef.current) {
        return;
      }
      hasCheckedPlanRef.current = true;

      setPlanCheckLoading(true);
      try {
        let totalResponses = 0;
        if (currentPlan !== "free_trial_over") {
          for (const interview of interviews) {
            const responses = await ResponseService.getAllResponses(
              interview.id,
            );
            totalResponses += responses.length;
          }
        }

        if (totalResponses >= allowedResponsesCount && currentPlan === "free") {
          setCurrentPlan("free_trial_over");
          try {
            for (const interview of interviews) {
              await InterviewService.updateInterview(
                { is_active: false },
                interview.id,
              );
            }
          } catch (error) {
            console.error("Error disabling active interviews", error);
          }
          await ClientService.updateOrganization(
            { plan: "free_trial_over" },
            organization.id,
          );
        }
      } catch (error) {
        console.error("Error fetching responses:", error);
      } finally {
        setPlanCheckLoading(false);
      }
    };

    fetchResponsesCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, interviews]);

  // Show skeleton while Clerk is loading
  if (!orgLoaded || !userLoaded) {
    return <PageSkeleton />;
  }

  // No organization empty state
  if (!organization) {
    return (
      <main className="p-8 pt-0 ml-12 mr-auto rounded-md animate-fadeIn">
        <div className="flex flex-col items-center justify-center h-[80vh] max-w-md mx-auto text-center">
          <Folder className="h-20 w-20 text-gray-300 mb-6" />
          <h2 className="text-3xl font-semibold tracking-tight text-gray-700 mb-4">
            Create Your First Organisation
          </h2>
          <p className="text-gray-500 mb-8">
            Add an organisation to start creating interviews across your website.
          </p>
          <Button 
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-full h-14 w-14 flex items-center justify-center transition-transform hover:scale-105"
            onClick={() => (document.querySelector('.cl-organizationSwitcherTrigger') as HTMLElement)?.click()}
          >
            <Plus size={24} />
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 pt-0 ml-12 mr-auto rounded-md animate-fadeIn">
      <div className="flex flex-col items-left">
        <h2 className="mr-2 text-2xl font-semibold tracking-tight mt-8">
          My Interviews
        </h2>
        <h3 className="text-sm tracking-tight text-gray-600 font-medium">
          Start getting responses now!
        </h3>
        <div className="mt-6 flex flex-wrap gap-4">
          {currentPlan == "free_trial_over" ? (
            <Card className="flex items-center justify-center border-dashed border-gray-300 border-2 h-60 w-56 rounded-2xl shrink-0 overflow-hidden bg-gray-50 shadow-sm animate-fadeIn">
              <CardContent className="flex items-center flex-col mx-auto">
                <div className="flex flex-col justify-center items-center w-full overflow-hidden">
                  <Plus size={72} strokeWidth={1.2} className="text-gray-700" />
                </div>
                <CardTitle className="mt-3 p-0 text-sm font-medium text-center text-gray-800">
                  You cannot create any more interviews unless you upgrade
                </CardTitle>
              </CardContent>
            </Card>
          ) : (
            <div className="animate-fadeIn">
              <CreateInterviewCard />
            </div>
          )}
          {interviewsLoading ? (
            <InterviewsLoader />
          ) : (
            <>
              {isModalOpen && (
                <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                  <div className="flex flex-col space-y-4">
                    <div className="flex justify-center text-orange-600">
                      <Gem />
                    </div>
                    <h3 className="text-xl font-semibold text-center">
                      Upgrade to Pro
                    </h3>
                    <p className="text-l text-center">
                      You have reached your limit for the free trial. Please
                      upgrade to pro to continue using our features.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex justify-center items-center">
                        <Image
                          src={"/premium-plan-icon.png"}
                          alt="Graphic"
                          width={299}
                          height={300}
                        />
                      </div>

                      <div className="grid grid-rows-2 gap-2">
                        <div className="p-4 border rounded-lg">
                          <h4 className="text-lg font-medium">Free Plan</h4>
                          <ul className="list-disc pl-5 mt-2">
                            <li>10 Responses</li>
                            <li>Basic Support</li>
                            <li>Limited Features</li>
                          </ul>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <h4 className="text-lg font-medium">Pro Plan</h4>
                          <ul className="list-disc pl-5 mt-2">
                            <li>Flexible Pay-Per-Response</li>
                            <li>Priority Support</li>
                            <li>All Features</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <p className="text-l text-center">
                      Contact{" "}
                      <span className="font-semibold">founders@folo-up.co</span>{" "}
                      to upgrade your plan.
                    </p>
                  </div>
                </Modal>
              )}
              {interviews.map((item, index) => (
                <div 
                  key={item.id} 
                  className="animate-fadeIn"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.3)}s` }}
                >
                  <InterviewCard
                    id={item.id}
                    interviewerId={item.interviewer_id}
                    name={item.name}
                    url={item.url ?? ""}
                    readableSlug={item.readable_slug}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default Interviews;
