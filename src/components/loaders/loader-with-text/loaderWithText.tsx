import { CircularProgress } from "@nextui-org/progress";

function LoaderWithText() {
  return (
    <div className="relative flex flex-col items-center justify-center h-screen">
      <CircularProgress
        classNames={{
          base: "animate-spin",
          svg: "w-36 h-36 ",
          indicator: "stroke-orange-600",
          track: "stroke-orange-200",
        }}
        strokeWidth={2}
        disableAnimation={true}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-center text-lg font-medium">Loading</span>
      </div>
    </div>
  );
}

export default LoaderWithText;
