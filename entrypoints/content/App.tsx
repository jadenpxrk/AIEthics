import "./App.module.css";
import "../../assets/main.css";

import ExtMessage, { MessageType } from "@/entrypoints/types";
import { MouseEvent, useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import Header from "@/entrypoints/content/components/Header";
import { Home } from "@/entrypoints/content/components/Home";
import { SettingsPage } from "@/entrypoints/content/components/Settings";
import { SidebarType } from "@/entrypoints/types/navigation";
import { browser } from "wxt/browser";
import { useTheme } from "@/components/theme-provider";

// storage keys
const POSITION_STORAGE_KEY = "sidebar_position";
const PIN_STATE_STORAGE_KEY = "sidebar_pinned";

export default () => {
  const [showContent, setShowContent] = useState(false);
  const [sidebarType, setSidebarType] = useState<SidebarType>(SidebarType.home);
  const [title, setTitle] = useState(
    SidebarType.home.charAt(0).toUpperCase() + SidebarType.home.slice(1)
  );
  const { theme, toggleTheme } = useTheme();
  const [resetCounter, setResetCounter] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(
    window.innerHeight - 48
  );

  // dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // pin state
  const [isPinned, setIsPinned] = useState(false);

  // load saved position and pin state
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const result = await browser.storage.local.get([
          POSITION_STORAGE_KEY,
          PIN_STATE_STORAGE_KEY,
        ]);

        // set pin states first
        const isPinnedState =
          result[PIN_STATE_STORAGE_KEY] !== undefined
            ? Boolean(result[PIN_STATE_STORAGE_KEY])
            : false;

        setIsPinned(isPinnedState);

        // calc the correct position based on pin state
        if (isPinnedState) {
          // if pinned, calculate the correct position
          const savedPos = result[POSITION_STORAGE_KEY] as {
            x: number;
            y: number;
          };
          setPosition({
            x: typeof savedPos.x === "number" ? savedPos.x : 24,
            y: typeof savedPos.y === "number" ? savedPos.y : 24,
          });
        } else {
          // otherwise reset to default position
          setPosition({ x: 24, y: 24 });
        }
      } catch (error) {
        console.error("Error loading saved position:", error);
      }
    };

    loadSavedState();
  }, []);

  // save position when it changes, but only if pinned
  useEffect(() => {
    const savePosition = async () => {
      try {
        // Only save position if pinned
        if (isPinned) {
          await browser.storage.local.set({
            [POSITION_STORAGE_KEY]: position,
          });
        } else {
          // If not pinned, remove saved position
          await browser.storage.local.remove(POSITION_STORAGE_KEY);
        }
      } catch (error) {
        console.error("Error saving position:", error);
      }
    };

    savePosition();
  }, [position, isPinned]);

  // save pin state when it changes
  useEffect(() => {
    const savePinState = async () => {
      try {
        await browser.storage.local.set({
          [PIN_STATE_STORAGE_KEY]: isPinned,
        });
      } catch (error) {
        console.error("Error saving pin state:", error);
      }
    };

    savePinState();
  }, [isPinned]);

  // close button
  const handleClose = () => {
    setShowContent(false);

    // reset position to default if not pinned
    if (!isPinned) {
      setPosition({ x: 24, y: 24 });
    }
  };

  // toggle pin/unpin
  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    // remove immediate position reset - let it stay where it is when unpinned
  };

  // mouse down event and dragging
  const handleMouseDown = (e: MouseEvent) => {
    if (isPinned) return; // Don't allow dragging when pinned

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  // actual dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // should not go out of bounds
    const maxX = window.innerWidth - 400; // 400 is the width of the window
    const maxY = window.innerHeight - 100;

    setPosition({
      x: Math.min(Math.max(0, newX), maxX),
      y: Math.min(Math.max(0, newY), maxY),
    });
  };

  // handle mouse up event to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // add event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove as any);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove as any);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // update position when window is resized if pinned
  useEffect(() => {
    const handleResize = () => {
      if (isPinned) {
        // keep the sidebar at the same position but ensure it's not off-screen
        const maxX = window.innerWidth - 400;
        if (position.x > maxX) {
          setPosition({
            x: maxX,
            y: position.y,
          });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isPinned, position]);

  // focus textarea when content becomes visible using requestAnimationFrame for reliable timing
  useEffect(() => {
    if (showContent && sidebarType === SidebarType.home) {
      // use requestAnimationFrame for reliable focus after DOM is rendered
      requestAnimationFrame(() => {
        // wait for next frame to ensure DOM is updated
        requestAnimationFrame(() => {
          const textarea = document.querySelector(
            ".normal-case textarea"
          ) as HTMLTextAreaElement;
          if (textarea) {
            // the component's own focus mechanism will handle this,
            // but this is an extra safety measure
            textarea.focus();
          }
        });
      });
    }
  }, [showContent, sidebarType]);

  // update height when window resizes
  useEffect(() => {
    const updateHeight = () => {
      setContainerHeight(window.innerHeight - 48);
    };

    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  function domLoaded() {
    console.log("dom loaded");
  }

  useEffect(() => {
    if (document.readyState === "complete") {
      console.log("dom complete");
      domLoaded();
    } else {
      window.addEventListener("load", () => {
        console.log("content load:");
        console.log(window.location.href);
        domLoaded();
      });
    }

    browser.runtime.onMessage.addListener((message: unknown) => {
      // type guard
      if (
        !message ||
        typeof message !== "object" ||
        !("messageType" in message)
      ) {
        return undefined;
      }

      const extMessage = message as ExtMessage;
      console.log("content:");
      console.log(extMessage);

      if (extMessage.messageType == MessageType.clickExtIcon) {
        setShowContent(true);

        // handle positioning when reopening
        if (isPinned) {
          // if pinned, we keep the current position
        } else {
          // if not pinned, reset to default
          setPosition({ x: 24, y: 24 });
        }
      } else if (extMessage.messageType == MessageType.changeTheme) {
        toggleTheme(extMessage.content);
      }

      // return undefined for all cases
      return undefined;
    });
  }, [isPinned]);

  return (
    <div className={`${theme} normal-case`}>
      {showContent && (
        <Card
          className={`fixed z-[1000000000000] rounded-2xl overflow-hidden border border-border shadow-xl ${
            isPinned ? "transition-all duration-300" : ""
          }`}
          style={{
            top: `${position.y}px`,
            left: `${position.x}px`,
            height: "calc(100dvh - 48px)",
            // visbug
            width: "400px",
            maxWidth: "400px",
          }}
        >
          <div className="h-[calc(100dvh-48px)] w-full z-[1000000000000] flex flex-col overflow-hidden">
            <div
              onMouseDown={handleMouseDown}
              className={`h-2 w-full z-[1000000000000] bg-background ${
                isPinned
                  ? "cursor-default"
                  : "cursor-grab active:cursor-grabbing"
              } flex items-center justify-center`}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            <div
              className="h-[calc(100dvh-48px)] w-full z-[1000000000000] flex flex-col overflow-hidden"
              ref={chatContainerRef}
              onWheel={(e) => {
                // simplified wheel event handler
                const target = e.target as HTMLElement;

                // find the closest scrollable parent
                let scrollableParent = target;
                while (
                  scrollableParent &&
                  chatContainerRef.current?.contains(scrollableParent)
                ) {
                  if (
                    scrollableParent.scrollHeight >
                    scrollableParent.clientHeight
                  ) {
                    // found a scrollable element, check if we're at boundaries
                    const isAtTop = scrollableParent.scrollTop <= 0;
                    const isAtBottom =
                      Math.abs(
                        scrollableParent.scrollHeight -
                          scrollableParent.scrollTop -
                          scrollableParent.clientHeight
                      ) < 1;

                    // only let the event propagate if we're at boundaries
                    if (
                      !(
                        (isAtTop && e.deltaY < 0) ||
                        (isAtBottom && e.deltaY > 0)
                      )
                    ) {
                      // we're not at the boundary in the scroll direction, so stop propagation
                      e.stopPropagation();
                      return;
                    }

                    // we're at a boundary, so let the event propagate to the next scrollable parent
                    break;
                  }

                  scrollableParent =
                    scrollableParent.parentElement as HTMLElement;
                }

                // if we reach here, we either didn't find a scrollable parent or we're at the boundaries
                // of all scrollable parents, so let the event propagate to the page
              }}
            >
              {/* drag handle height + border height */}
              <Header
                title={title}
                sidebarType={sidebarType}
                onClose={handleClose}
                isPinned={isPinned}
                onTogglePin={handleTogglePin}
                onNavChange={(type: SidebarType) => {
                  if (type === SidebarType.newChat) {
                    setResetCounter((prev) => prev + 1);
                    setSidebarType(SidebarType.home);
                    setTitle(
                      SidebarType.home.charAt(0).toUpperCase() +
                        SidebarType.home.slice(1)
                    );
                  } else {
                    setSidebarType(type);
                    setTitle(type.charAt(0).toUpperCase() + type.slice(1));
                  }
                }}
              />
              <main className="grid h-full gap-4 p-4 flex-1 overflow-y-auto overflow-x-hidden">
                {sidebarType === SidebarType.home && (
                  <Home resetKey={resetCounter} />
                )}
                {sidebarType === SidebarType.settings && <SettingsPage />}
              </main>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
