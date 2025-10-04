"use client";

import React, { useState, useEffect, useRef } from "react";
import { useOrganization } from "@clerk/nextjs";
import InterviewCard from "@/components/dashboard/interview/interviewCard";
import CreateInterviewCard from "@/components/dashboard/interview/createInterviewCard";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { InterviewService } from "@/services/interviews.service";
import { ClientService } from "@/services/clients.service";
import { ResponseService } from "@/services/responses.service";
import { useInterviews } from "@/contexts/interviews.context";
import Modal from "@/components/dashboard/Modal";
import { ArrowRight, Building, Folder, Gem, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

function Interviews() {
  const { interviews, interviewsLoading } = useInterviews();
  const { organization } = useOrganization();
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [allowedResponsesCount, setAllowedResponsesCount] =
    useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const router = useRouter();
  const hasCheckedPlanRef = useRef<boolean>(false);
  const orgFetchRef = useRef<string | null>(null);

  function InterviewsLoader() {
    return (
      <>
        <div className="flex flex-row">
          <div className="h-60 w-56 ml-1 mr-3 mt-3 flex-none animate-pulse rounded-xl bg-gray-300" />
          <div className="h-60 w-56 ml-1 mr-3  mt-3 flex-none animate-pulse rounded-xl bg-gray-300" />
          <div className="h-60 w-56 ml-1 mr-3 mt-3 flex-none animate-pulse rounded-xl bg-gray-300" />
        </div>
      </>
    );
  }

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        if (organization?.id) {
          if (orgFetchRef.current === organization.id) return;
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
      if (!organization?.id || !interviews) return;
      if (hasCheckedPlanRef.current) return;
      hasCheckedPlanRef.current = true;

      setLoading(true);
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
          if (currentPlan !== "free_trial_over") {
            setCurrentPlan("free_trial_over");
          }
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
        setLoading(false);
      }
    };

    fetchResponsesCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, interviews]);

  // No organization empty state
  if (!organization) {
    return (
      <main className="p-8 pt-0 ml-12 mr-auto rounded-md">
        <div className="flex flex-col items-center justify-center h-[80vh] max-w-md mx-auto text-center">
          <Folder className="h-20 w-20 text-gray-300 mb-6" />
          <h2 className="text-3xl font-semibold tracking-tight text-gray-700 mb-4">
            Create Your First Organisation
          </h2>
          <p className="text-gray-500 mb-8">
            Add an organisation to start creating interviews across your website.
          </p>
          <Button 
            className="bg-orange-600 hover:bg-orange-700 text-white rounded-full h-14 w-14 flex items-center justify-center"
            onClick={() => (document.querySelector('.cl-organizationSwitcherTrigger') as HTMLElement)?.click()}
          >
            <Plus size={24} />
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-8 pt-0 ml-12 mr-auto rounded-md">
      <div className="flex flex-col items-left">
        <h2 className="mr-2 text-2xl font-semibold tracking-tight mt-8">
          My Interviews
        </h2>
        <h3 className=" text-sm tracking-tight text-gray-600 font-medium ">
          Start getting responses now!
        </h3>
        <div className="relative flex items-center mt-1 flex-wrap">
          {currentPlan == "free_trial_over" ? (
            <Card className=" flex bg-gray-200 items-center border-dashed border-gray-700 border-2 hover:scale-105 ease-in-out duration-300 h-60 w-56 ml-1 mr-3 mt-4 rounded-xl shrink-0 overflow-hidden shadow-md">
              <CardContent className="flex items-center flex-col mx-auto">
                <div className="flex flex-col justify-center items-center w-full overflow-hidden">
                  <Plus size={90} strokeWidth={0.5} className="text-gray-700" />
                </div>
                <CardTitle className="p-0 text-md text-center">
                  You cannot create any more interviews unless you upgrade
                </CardTitle>
              </CardContent>
            </Card>
          ) : (
            <CreateInterviewCard />
          )}
          {interviewsLoading || loading ? (
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
              {interviews.map((item) => (
                <InterviewCard
                  id={item.id}
                  interviewerId={item.interviewer_id}
                  key={item.id}
                  name={item.name}
                  url={item.url ?? ""}
                  readableSlug={item.readable_slug}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default Interviews;
