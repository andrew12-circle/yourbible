import {
  LUMEN_WELCOME_CONTRAST,
  LUMEN_WELCOME_DIFFERENTIATORS,
  LUMEN_WELCOME_EXPLAINER_LEAD,
} from "@/lib/myai/welcomeExplainer";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function MyAiWelcomeExplainer({ className }: Props) {
  return (
    <div className={cn("mx-auto w-full max-w-lg px-2", className)}>
      <p className="text-center text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
        {LUMEN_WELCOME_EXPLAINER_LEAD}
      </p>

      <ul className="mt-5 space-y-3.5">
        {LUMEN_WELCOME_DIFFERENTIATORS.map((item) => (
          <li
            key={item.title}
            className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-3.5 py-3 dark:border-amber-400/20 dark:bg-amber-400/[0.06]"
          >
            <p className="text-[13px] font-semibold leading-snug tracking-tight text-foreground">{item.title}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-center text-[12.5px] leading-relaxed text-muted-foreground/85">{LUMEN_WELCOME_CONTRAST}</p>
    </div>
  );
}
