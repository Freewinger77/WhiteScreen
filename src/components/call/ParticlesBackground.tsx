"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

const ParticlesBackground = () => {
  const [init, setInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: "#070825",
        },
      },
      fpsLimit: 60,
      particles: {
        number: {
          value: 355,
          density: {
            enable: true,
            width: 789,
            height: 789,
          },
        },
        color: {
          value: "#ffffff",
        },
        shape: {
          type: "circle",
        },
        opacity: {
          value: { min: 0, max: 0.49 },
          animation: {
            enable: true,
            speed: 0.25,
            startValue: "random",
            sync: false,
          },
        },
        size: {
          value: { min: 0, max: 2 },
          animation: {
            enable: true,
            speed: 0.333,
            startValue: "random",
            sync: false,
          },
        },
        links: {
          enable: false,
        },
        move: {
          enable: true,
          speed: 0.1,
          direction: "none",
          random: true,
          straight: false,
          outModes: {
            default: "out",
          },
        },
      },
      interactivity: {
        detectsOn: "canvas",
        events: {
          onHover: {
            enable: true,
            mode: "bubble",
          },
          onClick: {
            enable: true,
            mode: "push",
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          bubble: {
            distance: 83.9,
            size: 1,
            duration: 3,
            opacity: 1,
          },
          push: {
            quantity: 4,
          },
        },
      },
      detectRetina: true,
    }),
    []
  );

  if (!init) {
    return (
      <div 
        className="fixed inset-0 z-0" 
        style={{ backgroundColor: "#070825" }} 
      />
    );
  }

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="fixed inset-0 z-0"
    />
  );
};

export default ParticlesBackground;

