import { useCallback } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { needsOnboarding } from "@/lib/auth/onboardingGate";
import { ChildrenBookReader } from "@/components/children-books/ChildrenBookReader";
import { ChildrenBooksLibrary } from "@/components/children-books/ChildrenBooksLibrary";
import { CHILDREN_BOOKS, findChildrenBook } from "@/lib/children-books/storybook";

export default function ChildrenBooksPage() {
  const { user, profile, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const { bookSlug } = useParams<{ bookSlug?: string }>();
  const navigate = useNavigate();
  const book = findChildrenBook(bookSlug);
  const invalidSlug = Boolean(bookSlug && !book);

  const handleSelectBook = useCallback(
    (slug: string) => {
      navigate(`/children-books/${slug}`);
    },
    [navigate],
  );

  const handleBackToLibrary = useCallback(() => {
    navigate("/children-books");
  }, [navigate]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (needsOnboarding(profile)) return <Navigate to="/onboarding" replace />;
  if (invalidSlug) return <Navigate to="/children-books" replace />;

  if (!bookSlug || !book) {
    return (
      <ChildrenBooksLibrary
        books={CHILDREN_BOOKS}
        showHubShell={showHubShell}
        onSelectBook={handleSelectBook}
      />
    );
  }

  return (
    <ChildrenBookReader
      book={book}
      showHubShell={showHubShell}
      onBackToLibrary={handleBackToLibrary}
    />
  );
}
