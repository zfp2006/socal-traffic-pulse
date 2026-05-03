'use client';
import { useState, useEffect, useRef } from 'react';
import Dashboard from '../components/Dashboard'; 

export default function StoryWrapper() {
  const [activeScene, setActiveScene] = useState(0);
  
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLElement;
            setActiveScene(Number(target.dataset.scene));
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' }
    );

    sceneRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  // I've replaced the placeholders with real, working Unsplash URLs!
  const backgrounds = [
    'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url("/latrafi.jpg")', // Scene 0: LA Traffic Gridlock
    'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1494412651409-8963ce7935a7?q=80&w=2000")', // Scene 1: Port Cranes
    'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url("/portoflatrucks.webp")', // Scene 2: Warehouses
    'linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url("/stack.jpg'  // Scene 3: Freeway Interchange
  ];

  return (
    <div className="relative bg-black h-screen w-full overflow-y-auto overflow-x-hidden">
      
      {/* 2. STICKY BACKGROUND */}
      <div className="sticky top-0 h-screen w-full z-0 pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundImage: backgrounds[activeScene] || backgrounds[3],
            transform: `scale(${1 + activeScene * 0.02})` 
          }}
        />
      </div>

      {/* 3. SCROLLING TEXT LAYER (Notice the -mt-[100vh] is back to pull this over the sticky background) */}
      <div className="relative z-10 -mt-[100vh]">
        
        <div 
          ref={(el) => { sceneRefs.current[0] = el; }} 
          data-scene="0"
          className="h-screen flex flex-col items-center justify-center text-center p-4"
        >
          <h1 className="text-6xl md:text-9xl font-bold text-white mb-6 drop-shadow-lg tracking-tighter">SoCal</h1>
          <p className="text-xl md:text-3xl text-gray-200 mb-12 drop-shadow-md font-light">Where Commuters and Global Supply Chains Collide</p>
          <div className="animate-bounce text-white mt-10">
            <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Scroll to begin</p>
            ↓
          </div>
        </div>

        <div 
          ref={(el) => { sceneRefs.current[1] = el; }} 
          data-scene="1"
          className="min-h-screen flex items-center justify-start p-10 md:p-24"
        >
          <div className="bg-gray-900/80 backdrop-blur-md p-8 rounded-xl max-w-xl text-white border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-bold mb-4 text-blue-400">The nation's loading dock.</h2>
            <p className="text-lg leading-relaxed mb-6 text-gray-300">
              The San Pedro Bay port complex, comprising the neighboring Ports of Los Angeles and Long Beach, is the beating heart of American trade. It processes a staggering <strong>20 million TEUs</strong> (containers) annually.
            </p>
          </div>
        </div>

        <div 
          ref={(el) => { sceneRefs.current[2] = el; }} 
          data-scene="2"
          className="min-h-screen flex items-center justify-end p-10 md:p-24"
        >
          <div className="bg-gray-900/80 backdrop-blur-md p-8 rounded-xl max-w-xl text-white border border-gray-700 shadow-2xl">
            <h2 className="text-3xl font-bold mb-4 text-yellow-400">But those goods don't stay at the port.</h2>
            <p className="text-lg leading-relaxed mb-6 text-gray-300">
              Once unloaded, massive volumes of cargo are loaded directly onto heavy-duty diesel trucks headed for the sprawling, million-square-foot warehouses of the Inland Empire.
            </p>
          </div>
        </div>

        <div 
          ref={(el) => { sceneRefs.current[3] = el; }} 
          data-scene="3"
          className="min-h-screen flex items-center justify-center p-10 md:p-24"
        >
          <div className="bg-gray-900/90 backdrop-blur-md p-8 rounded-xl max-w-2xl text-center text-white border border-gray-700 shadow-2xl">
            <h2 className="text-4xl font-bold mb-4 text-red-500">Commuters vs. Cargo</h2>
            <p className="text-xl leading-relaxed mb-8 text-gray-300">
              This immense logistical engine operates on the exact same concrete infrastructure that millions of Angelenos use every day. Heavy freight traffic and passenger commuters are forced to mix, resulting in gridlock.
            </p>
          </div>
        </div>

      </div>

      {/* 4. THE DASHBOARD LAYER */}
      <div className="relative z-20 bg-gray-900 border-t-4 border-blue-500 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <Dashboard />
      </div>

    </div>
  );
}