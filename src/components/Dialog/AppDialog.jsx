import { useEffect, useRef, useId } from 'react';
import './AppDialog.css';

export default function AppDialog({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'OK',
  destructive = false
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="ll-dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={event => {
        event.preventDefault();
        (onCancel || onConfirm)();
      }}
    >
      <span className="ll-dialog-flower">❀</span>
      <h2 id={titleId}>{title}</h2>
      <p id={messageId}>{message}</p>

      <div className="ll-dialog-actions">
        {onCancel && (
          <button
            type="button"
            className="ll-dialog-cancel"
            onClick={onCancel}
            autoFocus
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          className={destructive
            ? 'll-dialog-delete'
            : 'll-dialog-confirm'}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
