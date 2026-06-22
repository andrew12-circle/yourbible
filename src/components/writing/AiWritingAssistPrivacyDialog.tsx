import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AiWritingAssistPrivacyDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Turn on AI writing assist?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-left">
            <span className="block">
              While this is on, text you write in the journal — including personal entries — is sent to our AI provider
              for light spelling and grammar polish.
            </span>
            <span className="block">
              Dictation formatting stays on your device. End-to-end encrypted entries are still ciphertext on our servers,
              but the polish step sees plaintext while you write.
            </span>
            <span className="block font-medium text-foreground">
              You can turn this off anytime in Settings.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Keep off</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Turn on</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
