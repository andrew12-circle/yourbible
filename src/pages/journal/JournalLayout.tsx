import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function JournalLayout({
  title,
  back = "/home",
  right,
  children,
}: {
  title: string;
  back?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Link
            to={back}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-display text-lg flex-1 truncate">{title}</h1>
          {right}
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">{children}</main>
    </div>
  );
}