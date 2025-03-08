import "./style.css";

import App from "./App";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";

export default defineContentScript({
  matches: ["<all_urls>", "file://*/*"],
  cssInjectionMode: "ui",
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: "language-learning-content-box",
      position: "inline",
      onMount: (container) => {
        console.log(container);

        // ductape workaround for enter starting a new line
        // add event listeners to the shadow root to prevent event bubbling
        const handleKeyEvent = (e: KeyboardEvent) => {
          // only stop propagation if the event target is within our shadow DOM
          // and it's not an Enter key (let the textarea handle that)
          if (container.contains(e.target as Node) && e.key !== "Enter") {
            // don't stop propagation for Tab key (to allow tabbing between elements)
            // and don't interfere with focus-related events
            if (e.key !== "Tab" && e.key !== "Escape") {
              e.stopPropagation();
            }
          }
        };

        // simple wheel event handler to prevent custom scrollbars from interfering
        const handleWheelEvent = (e: WheelEvent) => {
          if (container.contains(e.target as Node)) {
            // check if the event target is inside a scrollable element
            let target = e.target as HTMLElement;

            while (target && container.contains(target)) {
              // if we find a scrollable element, check if we need to handle scrolling
              if (target.scrollHeight > target.clientHeight) {
                const isAtTop = target.scrollTop <= 0;
                const isAtBottom =
                  Math.abs(
                    target.scrollHeight - target.scrollTop - target.clientHeight
                  ) < 1;

                // only let the event propagate up if we're at the boundaries and trying to scroll beyond
                if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
                  return; // Let the event propagate to parent page
                }

                // otherwise, prevent the default scroll behavior of the page
                e.stopPropagation();
                return;
              }

              target = target.parentElement as HTMLElement;
            }
          }
        };

        // add touch event handler for mobile devices
        const handleTouchMove = (e: TouchEvent) => {
          // only handle if touch started inside our container
          if (container.contains(e.target as Node)) {
            // just prevent propagation to avoid parent page scroll
            e.stopPropagation();
          }
        };

        // add capture phase listeners to ensure we handle events first
        container.addEventListener("keydown", handleKeyEvent, true);
        container.addEventListener("keyup", handleKeyEvent, true);
        container.addEventListener("keypress", handleKeyEvent, true);

        // add wheel event handler with capture to intercept before custom scroll libraries
        container.addEventListener("wheel", handleWheelEvent, {
          capture: true,
          passive: false,
        });
        container.addEventListener("touchmove", handleTouchMove, {
          capture: true,
          passive: false,
        });

        const root = ReactDOM.createRoot(container);
        root.render(
          <ThemeProvider>
            <App />
          </ThemeProvider>
        );

        return {
          unmount: () => {
            root.unmount();
            // clean up
            container.removeEventListener("keydown", handleKeyEvent, true);
            container.removeEventListener("keyup", handleKeyEvent, true);
            container.removeEventListener("keypress", handleKeyEvent, true);
            container.removeEventListener("wheel", handleWheelEvent, true);
            container.removeEventListener("touchmove", handleTouchMove, true);
          },
        };
      },
      onRemove: (instance) => {
        if (instance && typeof instance.unmount === "function") {
          instance.unmount();
        }
      },
    });

    ui.mount();
  },
});
