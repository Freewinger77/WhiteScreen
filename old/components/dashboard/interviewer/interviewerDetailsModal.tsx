import Image from "next/image";
import { CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import ReactAudioPlayer from "react-audio-player";
import { Interviewer } from "@/types/interviewer";
import { useState } from "react";

interface Props {
  interviewer: Interviewer | undefined;
}

function InterviewerDetailsModal({ interviewer }: Props) {
  const [empathyValue, setEmpathyValue] = useState((interviewer?.empathy || 10) / 10);
  const [rapportValue, setRapportValue] = useState((interviewer?.rapport || 10) / 10);
  const [explorationValue, setExplorationValue] = useState((interviewer?.exploration || 10) / 10);
  const [speedValue, setSpeedValue] = useState((interviewer?.speed || 10) / 10);

  return (
    <div className="text-center w-[40rem]">
      <CardTitle className="text-3xl text mt-0 p-0 font-semibold ">
        {interviewer?.name}
      </CardTitle>
      <div className="mt-1 p-2 flex flex-col justify-center items-center">
        <div className="flex flex-row justify-center space-x-10 items-center">
          <div className=" flex items-center justify-center border-4 overflow-hidden border-gray-500 rounded-xl h-48 w-44">
            <Image
              src={interviewer?.image || ""}
              alt="Picture of the interviewer"
              width={180}
              height={30}
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm leading-relaxed  mt-0 whitespace-normal w-[25rem] text-justify">
              {interviewer?.description}
            </p>
            {interviewer?.audio && (
              <ReactAudioPlayer src={`/audio/${interviewer.audio}`} controls />
            )}
          </div>
        </div>
        <h3 className="text-mg m-0 p-0 mt-5 ml-0 font-medium">
          Interviewer Settings:
        </h3>
        <div className="flex flex-row space-x-14 justify-center items-start">
          <div className=" mt-2 flex flex-col justify-start items-start">
            <div className="flex flex-row justify-between items-center mb-2">
              <h4 className="w-20 text-left">Empathy</h4>
              <div className="w-40 space-x-3 ml-3 flex justify-between items-center">
                <Slider
                  value={[empathyValue]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => setEmpathyValue(value[0])}
                />
                <span className="w-8 text-left">
                  {empathyValue}
                </span>
              </div>
            </div>
            <div className="flex flex-row justify-between items-center ">
              <h4 className="w-20 text-left">Rapport</h4>
              <div className="w-40 space-x-3 ml-3 flex justify-between items-center">
                <Slider
                  value={[rapportValue]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => setRapportValue(value[0])}
                />
                <span className="w-8 text-left">
                  {rapportValue}
                </span>
              </div>
            </div>
          </div>
          <div className=" mt-2 flex flex-col justify-start items-start">
            <div className="flex flex-row justify-between items-center mb-2">
              <h4 className="w-20 text-left">Exploration</h4>
              <div className="w-40 space-x-3 ml-3 flex justify-between items-center">
                <Slider
                  value={[explorationValue]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => setExplorationValue(value[0])}
                />
                <span className="w-8 text-left">
                  {explorationValue}
                </span>
              </div>
            </div>
            <div className="flex flex-row justify-between items-center ">
              <h4 className="w-20 text-left">Speed</h4>
              <div className="w-40 space-x-3 ml-3 flex justify-between items-center">
                <Slider
                  value={[speedValue]}
                  max={1}
                  step={0.1}
                  onValueChange={(value) => setSpeedValue(value[0])}
                />
                <span className="w-8 text-left">
                  {speedValue}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InterviewerDetailsModal;
