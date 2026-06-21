import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { APP_NAME } from "@/lib/appBrand";

export function LegalPageLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10 pb-[max(2rem,var(--safe-area-inset-bottom))] pt-[max(2rem,var(--safe-area-inset-top))]">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/auth"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{APP_NAME} · Beta</p>
        <article className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
          {children}
        </article>
        <footer className="mt-12 pt-6 border-t text-xs text-muted-foreground flex gap-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
        </footer>
      </div>
    </div>
  );
}

export function SettingsLegalFooter() {
  return (
    <div className="pt-6 mt-6 border-t text-xs text-muted-foreground space-y-2">
      <p>
        <Link to="/privacy" className="hover:text-foreground underline-offset-2 hover:underline">Privacy Policy</Link>
        {" · "}
        <Link to="/terms" className="hover:text-foreground underline-offset-2 hover:underline">Terms of Service</Link>
      </p>
      <p className="text-[11px] leading-relaxed">
        {APP_NAME} is in private beta. Questions? Email{" "}
        <a href="mailto:support@beliefarchitecture.app" className="hover:text-foreground underline-offset-2 hover:underline">
          support@beliefarchitecture.app
        </a>
      </p>
    </div>
  );
}
