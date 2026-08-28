import { useEffect, useState } from "react";
import { myAiWelcomeGreeting } from "@/lib/myai/welcomeGreeting";
import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
  className?: string;
};

export default function MyAiWelcomeHero({ displayName, className }: Props) {
  const [greeting, setGreeting] = useState(() => myAiWelcomeGreeting(displayName));

  useEffect(() => {
    setGreeting(myAiWelcomeGreeting(displayName));
  }, [displayName]);

  return (
    <div className={cn("flex w-full flex-col items-center justify-center px-4", className)}>
      <h1 className="max-w-xl text-center font-sans text-[1.5rem] font-normal leading-tight tracking-tight text-foreground sm:text-[2rem] sm:leading-snug">
        {greeting}
      </h1>
    </div>
  );
}
