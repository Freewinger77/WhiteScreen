"use client";

import { useInterviews } from "@/contexts/interviews.context";
import { useEffect, useState, useRef } from "react";
import Call from "@/components/call";
import VideoInterviewExperience from "@/components/call/VideoInterviewExperience";
import Image from "next/image";
import { ArrowUpRightSquareIcon } from "lucide-react";
import { Interview } from "@/types/interview";
import lottie from "lottie-web";

// Feature flag for new video experience
const USE_NEW_VIDEO_EXPERIENCE = true;

type Props = {
  params: {
    interviewId: string;
  };
};

type PopupProps = {
  title: string;
  description: string;
  image: string;
};

// New Lottie loader component - waits for animation to load before showing
function LottieLoader() {
  const lottieRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (lottieRef.current && !animationRef.current) {
      animationRef.current = lottie.loadAnimation({
        container: lottieRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/35984/LEGO_loader_chrisgannon.json'
      });
      animationRef.current.setSpeed(3.24);
      
      // Wait for animation data to be ready
      animationRef.current.addEventListener('data_ready', () => {
        setIsReady(true);
      });
    }
    
    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <div className={`text-center transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <div ref={lottieRef} className="w-64 h-64 mx-auto" />
        <p className="text-gray-500 mt-4 animate-pulse">Loading your interview...</p>
      </div>
    </div>
  );
}

function PopUpMessage({ title, description, image }: PopupProps) {
  return (
    <div className="bg-white rounded-md absolute -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 md:w-[80%] w-[90%]">
      <div className="h-[88vh] content-center rounded-lg border-2 border-b-4 border-r-4 border-black font-bold transition-all  md:block dark:border-white ">
        <div className="flex flex-col items-center justify-center my-auto">
          <Image
            src={image}
            alt="Graphic"
            width={200}
            height={200}
            className="mb-4"
          />
          <h1 className="text-md font-medium mb-2">{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <a
        className="flex flex-row justify-center align-middle mt-3"
        href="https://rapidscreen.my/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="text-center text-md font-semibold mr-2">
          Powered by{" "}
          <span className="font-bold">
            <span className="text-orange-500">Rapid</span><span className="text-gray-400">Screen</span>
          </span>
        </div>
        <ArrowUpRightSquareIcon className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />
      </a>
    </div>
  );
}

function InterviewInterface({ params }: Props) {
  const [interview, setInterview] = useState<Interview>();
  const [isActive, setIsActive] = useState(true);
  const { getInterviewById } = useInterviews();
  const [interviewNotFound, setInterviewNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (interview) {
      setIsActive(interview?.is_active === true);
    }
  }, [interview, params.interviewId]);

  useEffect(() => {
    const fetchinterview = async () => {
      try {
        const response = await getInterviewById(params.interviewId);
        if (response) {
          setInterview(response);
          document.title = response.name;
        } else {
          setInterviewNotFound(true);
        }
      } catch (error) {
        console.error(error);
        setInterviewNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchinterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show Lottie loader while fetching interview data
  if (USE_NEW_VIDEO_EXPERIENCE && isLoading) {
    return (
      <div>
        <div className="hidden md:block">
          <LottieLoader />
        </div>
        <div className="md:hidden">
          <LottieLoader />
        </div>
      </div>
    );
  }

  // Interview not found
  if (USE_NEW_VIDEO_EXPERIENCE && interviewNotFound) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="text-center bg-white/70 backdrop-blur-xl rounded-3xl p-10 max-w-md border border-white/50 shadow-2xl">
          <Image
            src="/invalid-url.png"
            alt="Invalid URL"
            width={150}
            height={150}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Invalid URL</h1>
          <p className="text-gray-600">The interview link you&apos;re trying to access is invalid. Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // Interview not active
  if (USE_NEW_VIDEO_EXPERIENCE && interview && !isActive) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100">
        <div className="text-center bg-white/70 backdrop-blur-xl rounded-3xl p-10 max-w-md border border-white/50 shadow-2xl">
          <Image
            src="/closed.png"
            alt="Closed"
            width={150}
            height={150}
            className="mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Interview Unavailable</h1>
          <p className="text-gray-600">We are not currently accepting responses. Please contact the sender for more information.</p>
        </div>
      </div>
    );
  }

  // Use new video experience
  if (USE_NEW_VIDEO_EXPERIENCE && interview && isActive) {
    return (
      <div>
        <div className="hidden md:block">
          <VideoInterviewExperience 
            interview={interview}
            interviewerName="James"
            interviewerAvatar="/interviewers/Alex.png"
          />
        </div>
        <div className="md:hidden flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-gray-100">
          <div className="px-6 text-center bg-white/70 backdrop-blur-xl rounded-3xl p-8 mx-4 border border-white/50 shadow-2xl">
            <p className="text-gray-900 text-xl font-semibold mb-4">
              {interview?.name}
            </p>
            <p className="text-gray-600 mb-6">
              Please use a PC or laptop for the best interview experience.
            </p>
            <p className="text-gray-400 text-sm">
              Powered by{" "}
              <a
                className="font-bold"
                href="https://rapidscreen.my/"
                target="_blank"
              >
                <span className="text-orange-500">Rapid</span><span className="text-gray-400">Screen</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to old experience
  return (
    <div>
      <div className="hidden md:block p-8 mx-auto form-container">
        {!interview ? (
          interviewNotFound ? (
            <PopUpMessage
              title="Invalid URL"
              description="The interview link you're trying to access is invalid. Please check the URL and try again."
              image="/invalid-url.png"
            />
          ) : (
            <LottieLoader />
          )
        ) : !isActive ? (
          <PopUpMessage
            title="Interview Is Unavailable"
            description="We are not currently accepting responses. Please contact the sender for more information."
            image="/closed.png"
          />
        ) : (
          <Call interview={interview} />
        )}
      </div>
      <div className=" md:hidden flex flex-col items-center md:h-[0px] justify-center  my-auto">
        <div className="mt-48 px-3">
          <p className="text-center my-5 text-md font-semibold">
            {interview?.name}
          </p>
          <p className="text-center text-gray-600 my-5">
            Please use a PC to respond to the interview. Apologies for any
            inconvenience caused.{" "}
          </p>
        </div>
        <div className="text-center text-md font-semibold mr-2 my-5">
          Powered by{" "}
          <a
            className="font-bold underline"
            href="https://rapidscreen.my/"
            target="_blank"
          >
            <span className="text-orange-500">Rapid</span><span className="text-gray-400">Screen</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export default InterviewInterface;
