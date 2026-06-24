import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/clerk-react";

interface HeroProps {
  onKnowMore?: () => void;
  onSignUp?: () => void;
}

function Hero({ onKnowMore, onSignUp }: HeroProps) {
  const [titleNumber, setTitleNumber] = useState(0);
  const { isSignedIn } = useAuth();

  const titles = useMemo(
    () => ["AI Tutoring", "Voice Learning", "Smart Documents", "Personalized Education", "Interactive Study"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full relative overflow-hidden bg-gradient-to-b from-gray-50 via-white to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900">
      {/* Animated gradient background - hidden on mobile, visible on desktop */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute -inset-[10px] opacity-50">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-400 dark:bg-blue-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-400 dark:bg-purple-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply dark:mix-blend-normal filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>
      </div>
      
      <div className="container mx-auto relative z-10">
        <div className="flex gap-8 py-32 md:py-24 lg:py-32 items-center justify-center flex-col">
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-6xl lg:text-6xl max-w-2xl tracking-tighter text-center font-regular">
              <span className="text-gray-900 dark:text-white">Your AI-Powered Study & Dataset Platform</span>
              <br />
              <span className="text-3xl md:text-4xl text-gray-700 dark:text-gray-300">Featuring</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute font-semibold bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 bg-clip-text text-transparent"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-gray-600 dark:text-gray-400 max-w-2xl text-center">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Create JSONL training datasets from your documents instantly - free for students and developers.</span>
              {" "}Plus AI-powered tutoring, voice conversations, intelligent document analysis, and personalized learning.
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Button 
              type="button"
              size="lg" 
              className="gap-4 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950" 
              variant="outline"
              onClick={onKnowMore}
            >
              Know More <MoveRight className="w-4 h-4" />
            </Button>
            <Button 
              type="button"
              size="lg" 
              className="gap-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg font-medium"
              onClick={onSignUp}
            >
              {isSignedIn ? "Back to Dashboard" : "Sign Up"} <UserPlus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
