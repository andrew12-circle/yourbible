import { myAiWelcomeGreeting } from "@/lib/myai/welcomeGreeting";
import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
  className?: string;
};

export default function MyAiWelcomeHero({ displayName, className }: Props) {
  return (
    <div className={cn("flex w-full flex-col items-center justify-center px-4", className)}>
      <h1 className="max-w-xl text-center text-[1.75rem] font-normal leading-snug tracking-tight text-foreground sm:text-[2rem]">
        {myAiWelcomeGreeting(displayName)}
      </h1>
    </div>
  );
}
