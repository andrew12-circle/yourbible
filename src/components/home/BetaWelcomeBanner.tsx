import { Link } from "react-router-dom";
import { BookOpen, Brain, NotebookPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/appBrand";
import { markBetaWelcomeShown } from "@/lib/beta/welcome";

export function BetaWelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  const dismiss = () => {
    markBetaWelcomeShown();
    onDismiss();
  };

  return (
    <div className="mx-4 mt-3 mb-1 rounded-2xl border border-gold/30 bg-gradient-to-br from-paper/90 to-paper/60 p-4 shadow-sm relative">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Welcome to beta</p>
      <p className="font-display text-lg text-leather pr-6 mb-3">Where would you like to start?</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button asChild variant="default" size="sm" className="rounded-xl justify-start gap-2 flex-1">
          <Link to="/read/contents" onClick={dismiss}>
            <BookOpen className="w-4 h-4 shrink-0" />
            Open the Reader
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-xl justify-start gap-2 flex-1">
          <Link to="/journal/new" onClick={dismiss}>
            <NotebookPen className="w-4 h-4 shrink-0" />
            Write a journal entry
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="rounded-xl justify-start gap-2 flex-1">
          <Link to="/my-ai" onClick={dismiss}>
            <Brain className="w-4 h-4 shrink-0" />
            Chat with My AI
          </Link>
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        {APP_NAME} has much more — Framework, habits, partner mode — but these three loops are the best place to begin.
      </p>
    </div>
  );
}
