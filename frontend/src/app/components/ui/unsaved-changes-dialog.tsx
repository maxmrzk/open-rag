import { AlertTriangle } from "lucide-react";

interface UnsavedChangesDialogProps {
  /** Name of the component being left */
  fromName?: string;
  /** Name of the component being navigated to (optional) */
  toName?: string;
  onDiscard: () => void;
  onKeepEditing: () => void;
}

/**
 * Inline dark-mode modal that appears when the user tries to navigate away
 * from a component with unsaved edits.
 */
export function UnsavedChangesDialog({
  fromName,
  toName,
  onDiscard,
  onKeepEditing,
}: UnsavedChangesDialogProps) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onKeepEditing}
    >
      {/* Frosted-glass overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Dialog card */}
      <div
        className="relative z-10 w-[420px] rounded-xl border border-[#30363d] bg-[#161b22] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-[3px] w-full rounded-t-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] text-white">Unsaved changes</h3>
              <p className="mt-1 text-[12px] text-[#8b949e] leading-relaxed">
                {fromName ? (
                  <>
                    You have unsaved edits in{" "}
                    <span className="text-amber-400 font-medium">
                      {fromName}
                    </span>
                    .{" "}
                  </>
                ) : (
                  "You have unsaved edits. "
                )}
                {toName ? (
                  <>
                    If you switch to{" "}
                    <span className="text-white">{toName}</span>, your changes
                    will be lost.
                  </>
                ) : (
                  "Leaving now will discard them."
                )}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="my-5 border-t border-[#21262d]" />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onKeepEditing}
              className="px-4 py-2 rounded-lg text-[13px] text-[#c9d1d9] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#484f58] transition-all"
            >
              Keep editing
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 rounded-lg text-[13px] text-white bg-red-600/80 hover:bg-red-500 border border-red-500/40 hover:border-red-400/60 transition-all"
            >
              Discard changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
