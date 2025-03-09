import { GlowingEffect } from "./glowing-effect";
import { cn } from "../../lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("relative rounded-lg", className)}>
      <GlowingEffect
        spread={40}
        glow={true}
        disabled={false}
        proximity={64}
        inactiveZone={0.01}
        borderWidth={2}
      />
      <div className="relative bg-white/10 backdrop-blur-md overflow-hidden shadow rounded-lg border border-white/10">
        {children}
      </div>
    </div>
  );
}