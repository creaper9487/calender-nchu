"use client";

import { animate } from "animejs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [goMeeting, setGoMeeting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const handleMouseEnter = () => {
    if (!buttonRef.current) return;
    animate(buttonRef.current, {
      scale: 1.1,
      duration: 200,
      easing: "easeOutCubic",
    });
  };

  const handleMouseLeave = () => {
    if (!buttonRef.current) return;
    animate(buttonRef.current, {
      scale: 1.0,
      duration: 200,
      easing: "easeOutCubic",
    });
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setGoMeeting(true);
      const roof = document.querySelector<HTMLElement>(".rooftop");
      if (roof) roof.style.opacity = "0";
      return;
    }

    const animation = animate(".rooftop", {
      translateY: [0, -30],
      opacity: [1, 0],
      duration: 1000,
      easing: "linear",
      autoplay: false,
    });

    const pinContainer = document.querySelector(".pin-container");
    if (!pinContainer) return;

    let rafId = 0;
    let pending = false;

    const tick = () => {
      pending = false;
      const rect = pinContainer.getBoundingClientRect();
      const scrollTop = -rect.top;
      const animationDistance = window.innerHeight * 0.5;

      if (scrollTop < 0) {
        animation.seek(0);
      } else if (scrollTop <= animationDistance) {
        animation.seek(animation.duration * (scrollTop / animationDistance));
      } else {
        animation.seek(animation.duration);
        setGoMeeting(true);
      }
    };

    const onScroll = () => {
      if (pending) return;
      pending = true;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    tick();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="h-[200vh] relative pin-container">
      <div className="sticky top-0 h-screen w-full">
        <div className="min-h-screen p-8 flex flex-col md:flex-row">
          <div className="flex-1 items-center flex flex-col justify-center">
            <h1 className="text-2xl font-bold">中興夠咪亭</h1>
            <h3 className="text-lg mt-4">
              和你要咪的每個他
              <span
                className={
                  goMeeting
                    ? "inline-block opacity-0 -translate-x-2 transition-all duration-500"
                    : "inline-block opacity-100 px-4 transition-all duration-500"
                }
              >
                ......
              </span>
              <span
                className={`text-3xl inline-block transition-all duration-500 ${
                  goMeeting
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 translate-x-2"
                }`}
              >
                一起夠咪亭！
              </span>
            </h3>
            <button
              type="button"
              ref={buttonRef}
              aria-hidden={!goMeeting}
              tabIndex={goMeeting ? 0 : -1}
              className={`mt-8 px-4 py-2 border-b-yellow-400 border-t-blue-700 border-2 rounded-2xl text-black text-2xl font-bold cursor-pointer transition-all duration-500 ${
                goMeeting
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-4 scale-95 pointer-events-none"
              }`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={() => router.push("/startup")}
            >
              快咪起來
            </button>
          </div>
          <div className="flex-1 relative flex items-center justify-center w-full h-full">
            <div className="relative flex items-center justify-center">
              <Image
                src="/house.png"
                alt="夠咪亭建築"
                width={300}
                height={300}
                priority
                className="building z-0"
              />
              <Image
                src="/roof.png"
                alt=""
                width={300}
                height={100}
                priority
                className="rooftop z-10 absolute top-0 left-1/2 -translate-x-1/2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
