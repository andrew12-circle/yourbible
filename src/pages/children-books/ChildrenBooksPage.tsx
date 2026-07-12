import { useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { ChildrenBookReader } from "@/components/children-books/ChildrenBookReader";
import {
  CHILDREN_BOOKS,
  DEFAULT_CHILDREN_BOOK_SLUG,
  findChildrenBook,
} from "@/lib/children-books/storybook";

export default function ChildrenBooksPage() {
  const { user, profile, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const { bookSlug } = useParams<{ bookSlug?: string }>();
  const navigate = useNavigate();
  const book = findChildrenBook(bookSlug);
  const invalidSlug = Boolean(bookSlug && !book);
  const selectedBook = book ?? CHILDREN_BOOKS[0]!;

  const handleSelectBook = useCallback(
    (slug: string) => {
      navigate(`/children-books/${slug}`);
    },
    [navigate],
  );

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;
  if (invalidSlug) return <Navigate to={`/children-books/${DEFAULT_CHILDREN_BOOK_SLUG}`} replace />;

  return (
    <ChildrenBookReader
      books={CHILDREN_BOOKS}
      book={selectedBook}
      showHubShell={showHubShell}
      onSelectBook={handleSelectBook}
    />
  );
}
