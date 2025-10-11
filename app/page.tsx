'use client';

import Image from 'next/image';
import { animate } from 'animejs';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [goMeeting, setGoMeeting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();


  //---------咪起來
  // Hover animation functions
  const handleMouseEnter = () => {
    if (buttonRef.current) {
      animate(buttonRef.current, {
        scale: 1.1, // Scale to 110%
        duration: 200, // Faster response - 200ms
        easing: 'easeOutCubic', // Smoother easing
        begin: () => {
          // Optimize rendering during animation
          if (buttonRef.current) {
            buttonRef.current.style.willChange = 'transform';
            buttonRef.current.style.backfaceVisibility = 'hidden';
            buttonRef.current.style.perspective = '1000px';
          }
        }
      });
    }
  };

  const handleMouseLeave = () => {
    if (buttonRef.current) {
      animate(buttonRef.current, {
        scale: 1.0, // Scale back to normal (100%)
        duration: 200, // Faster response - 200ms  
        easing: 'easeOutCubic', // Smoother easing
        complete: () => {
          // Clean up optimization after animation
          if (buttonRef.current) {
            buttonRef.current.style.willChange = 'auto';
          }
        }
      });
    }
  };
//-----------------
  useEffect(() => {
    const animation = animate('.rooftop', {
      translateY: [0, -30],
      opacity: [1, 0],
      duration: 1000, // This is arbitrary, seeking will override it
      easing: 'linear', // Linear easing for direct scroll correlation
      autoplay: false,
    });

    const pinContainer = document.querySelector('.pin-container');
    if (!pinContainer) return;

    const scrollListener = () => {
      const rect = pinContainer.getBoundingClientRect();
      // scrollTop is the amount of the pinContainer that has been scrolled past
      const scrollTop = -rect.top;
      
      // The animation should finish after scrolling 50vh
      const animationDistance = window.innerHeight * 0.5;

      if (scrollTop >= 0 && scrollTop <= animationDistance) {
        // Calculate progress (0 to 1)
        const progress = scrollTop / animationDistance;
        animation.seek(animation.duration * progress);
      } else if (scrollTop < 0) {
        // Before the sticky section
        animation.seek(0);
      } else {
        // After the sticky section
        animation.seek(animation.duration);
        setGoMeeting(true);
      }
    };

    window.addEventListener('scroll', scrollListener);

    // Cleanup listener on component unmount
    return () => {
      window.removeEventListener('scroll', scrollListener);
    };
  }, []); // Empty dependency array ensures this runs only once

  return (
    <>
      {/* Pin container: h-[150vh] to pin for 50vh of scrolling */}
      <div className="h-[200vh] relative pin-container">
        <div className="sticky top-0 h-screen w-full">
          <div className="min-h-screen p-8 flex flex-row">
            <div className='flex-1 items-center flex flex-col justify-center'>
              <h1 className="text-2xl font-bold transition-all duration-500 ease-in-out">中興夠咪亭</h1>
              <h3 className="text-lg mt-4 transition-all duration-500 ease-in-out">
                和你要咪的每個他
                <span className={goMeeting ? 'inline-block opacity-0 transform -translate-x-2 transition-all duration-500 ease-in-out' : 'inline-block opacity-100 px-4 transform translate-x-0 transition-all duration-500 ease-in-out'}>
                  ......
                </span>
                <span className={`text-3xl ${goMeeting ? 'inline-block opacity-100 transform translate-x-0 transition-all duration-500 ease-in-out' : 'inline-block opacity-0 transform translate-x-2 transition-all duration-500 ease-in-out'}`}>
                  一起夠咪亭！
                </span>
              </h3>
              <button 
                ref={buttonRef}
                className={`mt-8 px-4 py-2 border-b-yellow-400 border-t-blue-700 border-2 rounded-2xl text-black text-2xl font-bold cursor-pointer antialiased ${
                  goMeeting 
                    ? 'opacity-100 translate-y-0 scale-100 transition-all duration-500 ease-in-out' 
                    : 'opacity-0 translate-y-4 scale-95 pointer-events-none transition-all duration-500 ease-in-out'
                }`}
                style={{
                  transform: 'translateZ(0)', // Force hardware acceleration
                  WebkitFontSmoothing: 'antialiased', // Better font rendering
                  MozOsxFontSmoothing: 'grayscale'    // Better font rendering on Firefox
                }} 
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={() => {
                  // Handle button click
                  router.push('/startup');
                }}
              >
                快咪起來
              </button>
            </div>
            <div className='flex-1 relative flex items-center justify-center w-full h-full'>
              <div className='relative flex items-center justify-center'>
                <Image
                  src="/house.png"
                  alt="Description of image"
                  width={300}
                  height={300}
                  className='building z-0'
                />
                <Image
                  src="/roof.png"
                  alt="Description of image"
                  width={300}
                  height={100}
                  className='rooftop z-10 absolute top-0 left-1/2 transform -translate-x-1/2'
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='h-screen bg-gray-200'> {/* Added bg color for visibility */}
        <h2 className="text-2xl p-8">Second Screen</h2>
      </div>
    </>
  );
}