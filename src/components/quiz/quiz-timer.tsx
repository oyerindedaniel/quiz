"use client";

import { useState, useEffect } from "react";
import { Clock, Timer, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/utils/lib";

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

  const formatTimeWithLabels = (
    seconds: number
  ): {
    hours: string;
    minutes: string;
    seconds: string;
  } => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return {
      hours: hours.toString().padStart(2, "0"),
      minutes: minutes.toString().padStart(2, "0"),
      seconds: secs.toString().padStart(2, "0"),
    };
  };

  const totalElapsed = previousElapsedTime + currentSessionTime;
  const displayTime = timeLimit
    ? Math.max(0, timeLimit - totalElapsed)
    : totalElapsed;

  const isCountdown = !!timeLimit;
  const isLowTime = isCountdown && displayTime < 300; // Less than 5 minutes
  const isCriticalTime = isCountdown && displayTime < 60; // Less than 1 minute
  const timeExpired = isCountdown && displayTime === 0;

  const timeDisplay = formatTimeWithLabels(displayTime);

  // Determine the styling based on time state
  const getTimerStyle = () => {
    if (timeExpired) {
      return {
        bg: "bg-incorrect-100",
        border: "border-incorrect-300",
        text: "text-incorrect-800",
        icon: "text-incorrect-600",
      };
    }
    if (isCriticalTime) {
      return {
        bg: "bg-incorrect-50",
        border: "border-incorrect-200",
        text: "text-incorrect-700",
        icon: "text-incorrect-500",
      };
    }
    if (isLowTime) {
      return {
        bg: "bg-pending-50",
        border: "border-pending-200",
        text: "text-pending-700",
        icon: "text-pending-500",
      };
    }
    return {
      bg: "bg-brand-50",
      border: "border-brand-200",
      text: "text-brand-800",
      icon: "text-brand-600",
    };
  };

  const style = getTimerStyle();

  const getProgressPercentage = (): number => {
    if (!timeLimit) return 0;
    return Math.max(0, (displayTime / timeLimit) * 100);
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className={cn("w-full max-w-sm", className)}>
      <div
        className={cn(
          "rounded-lg border p-4 space-y-3 font-sans transition-all duration-200",
          style.bg,
          style.border
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCountdown ? (
              <Timer className={cn("h-4 w-4", style.icon)} />
            ) : (
              <Clock className={cn("h-4 w-4", style.icon)} />
            )}
            <span className={cn("text-sm font-semibold", style.text)}>
              {isCountdown ? "Time Remaining" : "Time Elapsed"}
            </span>
          </div>

          {previousElapsedTime > 0 && (
            <div className="flex items-center gap-1">
              <RotateCcw className="h-3 w-3 text-brand-500" />
              <span className="text-xs text-brand-600 font-sans">Resumed</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center space-x-1">
          <div className="flex items-center space-x-1">
            <span className={cn("text-2xl font-mono font-bold", style.text)}>
              {timeDisplay.hours}
            </span>
            <span className={cn("text-sm font-semibold", style.text)}>h</span>
          </div>
          <span className={cn("text-2xl font-mono font-bold", style.text)}>
            :
          </span>
          <div className="flex items-center space-x-1">
            <span className={cn("text-2xl font-mono font-bold", style.text)}>
              {timeDisplay.minutes}
            </span>
            <span className={cn("text-sm font-semibold", style.text)}>m</span>
          </div>
          <span className={cn("text-2xl font-mono font-bold", style.text)}>
            :
          </span>
          <div className="flex items-center space-x-1">
            <span className={cn("text-2xl font-mono font-bold", style.text)}>
              {timeDisplay.seconds}
            </span>
            <span className={cn("text-sm font-semibold", style.text)}>s</span>
          </div>
        </div>

        {/* Progress Bar (only for countdown) */}
        {isCountdown && timeLimit && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-1000 ease-linear",
                  isCriticalTime
                    ? "bg-incorrect-500"
                    : isLowTime
                    ? "bg-pending-500"
                    : "bg-brand-500"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs font-sans">
              <span className={style.text}>Total: {formatTime(timeLimit)}</span>
              <span className={style.text}>
                {Math.round(progressPercentage)}% remaining
              </span>
            </div>
          </div>
        )}

        {/* Warning Messages */}
        {timeExpired && (
          <div className="flex items-center gap-2 p-2 bg-incorrect-100 rounded border border-incorrect-200">
            <AlertTriangle className="h-4 w-4 text-incorrect-600" />
            <span className="text-sm font-semibold text-incorrect-700 font-sans">
              Time Expired!
            </span>
          </div>
        )}

        {isCriticalTime && !timeExpired && (
          <div className="flex items-center gap-2 p-2 bg-incorrect-50 rounded border border-incorrect-200">
            <AlertTriangle className="h-4 w-4 text-incorrect-600" />
            <span className="text-sm font-semibold text-incorrect-700 font-sans">
              Less than 1 minute remaining!
            </span>
          </div>
        )}

        {isLowTime && !isCriticalTime && (
          <div className="flex items-center gap-2 p-2 bg-pending-50 rounded border border-pending-200">
            <AlertTriangle className="h-4 w-4 text-pending-600" />
            <span className="text-sm font-semibold text-pending-700 font-sans">
              5 minutes remaining
            </span>
          </div>
        )}

        {/* Additional Info for Elapsed Time */}
        {!isCountdown && previousElapsedTime > 0 && (
          <div className="text-xs text-brand-600 text-center font-sans">
            Previous session: {formatTime(previousElapsedTime)} • Current:{" "}
            {formatTime(currentSessionTime)}
          </div>
        )}
      </div>
    </div>
  );
}
