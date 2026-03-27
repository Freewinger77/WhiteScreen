import styles from "./loader.module.css";
import Image from "next/image";
import { AnimatedLoader } from "@/components/loaders";

function LoaderWithLogo() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full animate-fadeIn">
      <Image
        src="/loading-time.png"
        alt="logo"
        width={180}
        height={180}
        className="object-cover object-center mb-6"
      />
      <AnimatedLoader size="md" text="Generating questions..." />
    </div>
  );
}

export default LoaderWithLogo;
