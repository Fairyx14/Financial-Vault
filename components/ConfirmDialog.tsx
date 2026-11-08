"use client";

import { useEffect, useRef } from "react";
import styles from "./Vault.module.css";

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  request: ConfirmRequest | null;
  onClose: () => void;
}

/**
 * In-page confirmation dialog.
 *
 * We avoid window.confirm(): many mobile and in-app browsers block it and
 * silently return false, so destructive actions would never go through.
 * The native <dialog> element gives us focus trapping, Escape to cancel
 * and a backdrop for free.
 */
export default function ConfirmDialog({ request, onClose }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onClose={onClose}
      // A tap on the backdrop (outside the panel) cancels.
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      {request && (
        <div className={styles.dialogPanel}>
          <h2 id="confirm-title" className={styles.dialogTitle}>
            {request.title}
          </h2>
          <p id="confirm-message" className={styles.dialogText}>
            {request.message}
          </p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.buttonSecondary} onClick={close} autoFocus>
              Cancel
            </button>
            <button
              type="button"
              className={styles.buttonDangerSolid}
              onClick={() => {
                request.onConfirm();
                close();
              }}
            >
              {request.confirmLabel}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
