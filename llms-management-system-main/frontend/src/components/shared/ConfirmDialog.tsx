"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * Re-render reasoning:
 * ConfirmDialog is a controlled dialog component. Local pending and open states
 * are managed cleanly so only the active modal subtree is affected during action execution.
 */

export interface ConfirmDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback invoked when the open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog headline title */
  title: string;
  /** Dialog descriptive text or explanatory JSX */
  description: React.ReactNode;
  /** Primary action label. Defaults to "Confirm" (or "Delete" when destructive) */
  confirmLabel?: string;
  /** Cancel action label. Defaults to "Cancel" */
  cancelLabel?: string;
  /** Action handler invoked on confirmation */
  onConfirm: () => void | Promise<void>;
  /** Whether the async confirmation action is in-flight */
  isPending?: boolean;
  /** Whether the action is destructive (applies destructive button styling) */
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isPending = false,
  destructive = false,
}: ConfirmDialogProps) {
  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    await onConfirm();
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        // Prevent closing the dialog while the confirmation mutation is in progress
        if (!isPending) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>

          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={isPending}
            onClick={handleConfirm}
            className="gap-2"
          >
            {isPending && <Spinner className="size-4 animate-spin text-current" />}
            {confirmLabel ?? (destructive ? "Delete" : "Confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
