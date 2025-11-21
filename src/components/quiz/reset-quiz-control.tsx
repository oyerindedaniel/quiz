"use client";

import { useEffect, useState } from "react";
import { IPCDatabaseService } from "@/lib/services/ipc-database-service";
import { toast } from "sonner";
import { cn } from "@/utils/lib";
import { Input } from "../ui/input";

type ResetQuizControlProps = {
  className?: string;
  /**
   * Optional custom label for the trigger button.
   * Example: <ResetQuizControl triggerLabel="Reset Attempts" />
   */
  triggerLabel?: string;
};

const STATIC_PASSPHRASE = "studentcodeandsubjectcode";

const ipcDb = new IPCDatabaseService();

export function ResetQuizControl({
  className,
  triggerLabel = "Reset Quiz Attempt",
}: ResetQuizControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showModalBody, setShowModalBody] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setShowModalBody(true));
    } else {
      setShowModalBody(false);
    }
  }, [isOpen]);

  const handleResetAttempt = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!studentCode.trim() || !subjectCode.trim()) {
      toast.error("Missing data", {
        description: "Provide both student code and subject code.",
      });
      return;
    }

    const expectedConfirmation = `${studentCode
      .trim()
      .toUpperCase()}${subjectCode.trim().toUpperCase()}`;

    if (
      confirmationInput.trim().toUpperCase() !== expectedConfirmation ||
      !expectedConfirmation
    ) {
      toast.error("Confirmation mismatch", {
        description:
          "Type the exact Student Code immediately followed by the Subject Code to confirm.",
      });
      return;
    }

    try {
      setIsProcessing(true);
      const result = await ipcDb.resetLocalQuizAttempts(
        studentCode.trim().toUpperCase(),
        subjectCode.trim().toUpperCase()
      );
      if (result.success) {
        toast.success("Quiz attempt reset", {
          description: "The student can now start the quiz afresh.",
        });
        setStudentCode("");
        setSubjectCode("");
        setConfirmationInput("");
        setIsOpen(false);
      } else {
        toast.error("Reset failed", {
          description: result.error || "Unable to reset attempt",
        });
      }
    } catch (error) {
      toast.error("Reset failed", {
        description:
          error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur hover:bg-white hover:shadow transition"
      >
        {triggerLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className={cn(
              "w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl transition-all duration-300 ease-out",
              showModalBody ? "scale-100 opacity-100" : "scale-95 opacity-0"
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-900">Reset Quiz Attempt</h3>
            <p className="text-sm text-slate-500 mb-4">
              Provide student and subject codes, then confirm by typing them
              together to clear attempts.
            </p>

            <form onSubmit={handleResetAttempt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Student Code
                </label>
                <Input
                  type="text"
                  value={studentCode}
                  onChange={(event) => setStudentCode(event.target.value)}
                  placeholder="e.g. JSS1_STU_005"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Subject Code
                </label>
                <Input
                  type="text"
                  value={subjectCode}
                  onChange={(event) => setSubjectCode(event.target.value)}
                  placeholder="e.g. JSS1_MATH"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                  Confirmation (Student Code + Subject Code)
                </label>
                <Input
                  type="text"
                  value={confirmationInput}
                  onChange={(event) => setConfirmationInput(event.target.value)}
                  placeholder="e.g. JSS1_STU_005JSS1_MATH"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Type the student code immediately followed by the subject code
                  (no spaces) to confirm.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setStudentCode("");
                    setSubjectCode("");
                    setConfirmationInput("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-red-700 transition disabled:opacity-60"
                >
                  {isProcessing ? "Resetting..." : "Reset Attempt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResetQuizControl;
