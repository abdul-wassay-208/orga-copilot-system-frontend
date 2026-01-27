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
import { Link } from "react-router-dom";

interface DeleteChatModalProps {
  isOpen: boolean;
  chatTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteChatModal({
  isOpen,
  chatTitle,
  onClose,
  onConfirm,
}: DeleteChatModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-left">Delete chat?</AlertDialogTitle>
          <AlertDialogDescription className="text-left pt-2">
            This will delete <strong className="font-semibold text-foreground">{chatTitle}</strong>.
            <span className="text-xs text-muted-foreground mt-2 block">
              Visit{" "}
              <Link
                to="/settings"
                className="underline hover:text-foreground transition-colors"
                onClick={onClose}
              >
                settings
              </Link>{" "}
              to delete any memories saved during this chat.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-end">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
