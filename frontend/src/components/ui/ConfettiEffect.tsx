"use client";
import { useEffect, useState } from "react";
import Confetti from "react-confetti";

export default function ConfettiEffect() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // Wait for client to mount to access window
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({ width: window.innerWidth, height: window.innerHeight });
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  if (dimensions.width === 0) return null;

  return (
    <Confetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={800}
      gravity={0.12}
      initialVelocityY={20}
      colors={['#D4AF37', '#08043D', '#008148', '#FFD700', '#F0C75E']}
      style={{ zIndex: 99999, position: "fixed", top: 0, left: 0, pointerEvents: "none" }}
    />
  );
}
