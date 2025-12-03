import { useState, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
export const useFlowState = () => {
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const openSwitcher = useCallback(() => setIsSwitcherOpen(true), []);
  const closeSwitcher = useCallback(() => setIsSwitcherOpen(false), []);
  const bindSuiteGesture = useDrag(
    ({ down, movement: [mx], direction: [dx], velocity: [vx] }) => {
      const trigger = vx > 0.2; // velocity threshold to trigger
      if (!down && trigger && Math.abs(mx) > 50) {
        if (dx > 0) { // Swiping right
          openSwitcher();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      // A two-finger gesture can be simulated by checking event.touches.length
      // but for desktop compatibility, we'll use a simple drag.
      // A more robust solution would check for `event.touches.length === 2` on touch devices.
    }
  );
  return {
    isSwitcherOpen,
    openSwitcher,
    closeSwitcher,
    bindSuiteGesture,
  };
};