import { useEffect, RefObject } from "react";

/**
 * Custom hook that triggers a callback when clicking outside of the referenced element
 * @param ref - React ref object pointing to the element
 * @param handler - Callback function to execute when clicking outside
 * @param enabled - Whether the hook is enabled (default: true)
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent) => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler(event);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, handler, enabled]);
}
