import { useCallback, useEffect, useRef, useState } from 'react';
import type { AntiCheatEvent } from '@colformly/types';

export interface UseAntiCheatOptions {
  /** Activates listeners when true (e.g. during an active exam) */
  enabled: boolean;
  /** Maximum tab switches before auto-flag callback fires */
  maxTabSwitches?: number;
  /** Callback fired on every violation */
  onViolation?: (event: AntiCheatEvent, stats: { tabSwitchCount: number; fullscreenExits: number }) => void;
  /** Callback fired when threshold is exceeded */
  onFlagged?: (events: AntiCheatEvent[]) => void;
}

export interface UseAntiCheatResult {
  isFullscreen: boolean;
  tabSwitchCount: number;
  fullscreenExits: number;
  events: AntiCheatEvent[];
  isFlagged: boolean;
  enterFullscreen: () => Promise<boolean>;
  exitFullscreen: () => Promise<void>;
}

/**
 * Exam Anti-Cheat Guard for Colformly Student Portal:
 * - Tracks tab switching via Document.visibilityState & window blur
 * - Disables context menus (right-click), copy/cut/paste, and DevTools hotkeys
 * - Enforces and monitors Fullscreen API compliance
 */
export function useAntiCheat({
  enabled,
  maxTabSwitches = 3,
  onViolation,
  onFlagged,
}: UseAntiCheatOptions): UseAntiCheatResult {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false,
  );
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [events, setEvents] = useState<AntiCheatEvent[]>([]);
  const [isFlagged, setIsFlagged] = useState(false);

  const statsRef = useRef({ tabSwitchCount: 0, fullscreenExits: 0 });
  const eventsRef = useRef<AntiCheatEvent[]>([]);

  const recordViolation = useCallback(
    (type: AntiCheatEvent['type'], details?: string) => {
      const event: AntiCheatEvent = {
        type,
        timestamp: new Date().toISOString(),
        details,
      };

      if (type === 'TAB_SWITCH') {
        statsRef.current.tabSwitchCount += 1;
        setTabSwitchCount(statsRef.current.tabSwitchCount);
      } else if (type === 'FULLSCREEN_EXIT') {
        statsRef.current.fullscreenExits += 1;
        setFullscreenExits(statsRef.current.fullscreenExits);
      }

      const nextEvents = [...eventsRef.current, event];
      eventsRef.current = nextEvents;
      setEvents(nextEvents);

      onViolation?.(event, { ...statsRef.current });

      if (statsRef.current.tabSwitchCount >= maxTabSwitches && !isFlagged) {
        setIsFlagged(true);
        onFlagged?.(nextEvents);
      }
    },
    [maxTabSwitches, onViolation, onFlagged, isFlagged],
  );

  const enterFullscreen = useCallback(async (): Promise<boolean> => {
    if (typeof document === 'undefined') return false;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setIsFullscreen(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exitFullscreen = useCallback(async (): Promise<void> => {
    if (typeof document === 'undefined') return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('TAB_SWITCH', 'Document visibility became hidden');
      }
    };

    const handleBlur = () => {
      if (document.visibilityState === 'visible') {
        recordViolation('WINDOW_BLUR', 'Browser window lost focus');
      }
    };

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        recordViolation('FULLSCREEN_EXIT', 'Exited fullscreen during active exam');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation('CONTEXT_MENU', 'Blocked right-click context menu');
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      recordViolation('COPY_ATTEMPT', `Blocked clipboard event: ${e.type}`);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isDevTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && key === 'u');

      if (isDevTools) {
        e.preventDefault();
        recordViolation('DEVTOOLS_ATTEMPT', `Blocked shortcut: ${e.key}`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, recordViolation]);

  return {
    isFullscreen,
    tabSwitchCount,
    fullscreenExits,
    events,
    isFlagged,
    enterFullscreen,
    exitFullscreen,
  };
}
