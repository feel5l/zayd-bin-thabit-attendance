import { useEffect, useRef } from 'react';
import { AttendanceService } from '../services/attendanceService';

interface UseSessionTimeoutProps {
  timeoutMinutes?: number;
  onTimeout: () => void;
  isEnabled: boolean;
}

/**
 * useSessionTimeout
 * Automatically monitors user activity and logs out after inactivity
 * Highly optimized with refs to avoid re-render thrashing.
 */
export function useSessionTimeout({
  timeoutMinutes = 30,
  onTimeout,
  isEnabled
}: UseSessionTimeoutProps) {
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const timeoutMs = timeoutMinutes * 60 * 1000;

  useEffect(() => {
    if (!isEnabled) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      return;
    }

    const resetTimer = () => {
      lastActiveRef.current = Date.now();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    };

    resetTimer();

    // Throttled activity listener (at most once every 30 seconds)
    let lastStorageSync = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      lastActiveRef.current = now;
      if (now - lastStorageSync > 30000) {
        lastStorageSync = now;
        AttendanceService.updateLastActivity();
      }
      resetTimer();
    };

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Periodic safety check every 60 seconds
    checkIntervalRef.current = setInterval(() => {
      if (Date.now() - lastActiveRef.current > timeoutMs) {
        onTimeoutRef.current();
      }
    }, 60000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isEnabled, timeoutMs]);
}

