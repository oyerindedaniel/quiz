"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface QuizTimerProps {
  startTime?: number;
  timeLimit?: number; // in seconds - if provided, counts down from this limit
  previousElapsedTime?: number; // in seconds - time already spent in previous sessions
  className?: string;
  onTimeUpdate?: (remainingTime: number) => void;
}

export function QuizTimer({
  startTime,
  timeLimit,
  previousElapsedTime = 0,
  className = "",
  onTimeUpdate,
}: QuizTimerProps) {
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const actualStartTime = startTime || Date.now();

  useEffect(() => {
    const timer = setInterval(() => {
      const currentSessionElapsed = Math.floor(
        (Date.now() - actualStartTime) / 1000
      );
      setCurrentSessionTime(currentSessionElapsed);

      if (timeLimit && onTimeUpdate) {
        const totalElapsed = previousElapsedTime + currentSessionElapsed;
        const remaining = Math.max(0, timeLimit - totalElapsed);
        onTimeUpdate(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [actualStartTime, timeLimit, previousElapsedTime, onTimeUpdate]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const totalElapsed = previousElapsedTime + currentSessionTime;
  const displayTime = timeLimit
    ? Math.max(0, timeLimit - totalElapsed)
    : totalElapsed;

  const isCountdown = !!timeLimit;
  const isLowTime = isCountdown && displayTime < 300; // Less than 5 minutes

  return (
    <div
      className={`flex items-center space-x-2 ${
        isLowTime ? "text-incorrect-600" : "text-gray-600"
      } ${className}`}
    >
      <Clock className="w-5 h-5" />
      <span className="font-mono text-sm">
        {isCountdown && "⏰ "}
        {formatTime(displayTime)}
      </span>
      {previousElapsedTime > 0 && (
        <span className="text-xs text-gray-500">(resumed)</span>
      )}
    </div>
  );
}
