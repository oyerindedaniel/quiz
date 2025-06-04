"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface TimeInputProps {
  value?: number; // Total seconds
  onChange?: (totalSeconds: number) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function TimeInput({
  value = 0,
  onChange,
  className = "",
  disabled = false,
  placeholder = "Set exam time limit",
}: TimeInputProps) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  const updateTotalTime = (
    newHours: number,
    newMinutes: number,
    newSeconds: number
  ) => {
    const total = newHours * 3600 + newMinutes * 60 + newSeconds;
    onChange?.(total);
  };

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
    updateTotalTime(newHours, minutes, seconds);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    updateTotalTime(hours, newMinutes, seconds);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSeconds = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    updateTotalTime(hours, minutes, newSeconds);
  };

  const formatDisplayTime = () => {
    if (hours === 0 && minutes === 0 && seconds === 0) {
      return "No time limit";
    }

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(" ") || "0s";
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center space-x-2">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
            Hours
          </label>
          <Input
            type="number"
            min="0"
            max="23"
            value={hours || ""}
            onChange={handleHoursChange}
            placeholder="0"
            className="text-center font-mono text-brand-700"
            disabled={disabled}
            required
          />
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
            Minutes
          </label>
          <Input
            type="number"
            min="0"
            max="59"
            value={minutes || ""}
            onChange={handleMinutesChange}
            placeholder="0"
            className="text-center font-mono text-brand-700"
            disabled={disabled}
            required
          />
        </div>

        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600 uppercase tracking-wide block mb-1">
            Seconds
          </label>
          <Input
            type="number"
            min="0"
            max="59"
            value={seconds || ""}
            onChange={handleSecondsChange}
            placeholder="0"
            className="text-center font-mono text-brand-700"
            disabled={disabled}
            required
          />
        </div>
      </div>

      <div className="bg-brand-50 rounded-lg p-3 border border-brand-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-brand-700">
            Exam Duration:
          </span>
          <span className="text-sm font-mono text-brand-900 bg-white px-2 py-1 rounded border">
            {formatDisplayTime()}
          </span>
        </div>
        {value > 0 && (
          <p className="text-xs text-brand-600 mt-1">
            ⏰ Quiz will auto-submit when time expires
          </p>
        )}
        {value > 43200 && ( // More than 12 hours
          <p className="text-xs text-incorrect-600 mt-1">
            ⚠️ Maximum exam duration is 12 hours
          </p>
        )}
      </div>
    </div>
  );
}
