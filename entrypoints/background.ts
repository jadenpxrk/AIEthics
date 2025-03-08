import ExtMessage, { MessageType } from "@/entrypoints/types.ts";

import { browser } from "wxt/browser";
import handleMessage from "@/entrypoints/messages/MessageFacade";

export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id }); // background.js

  // @ts-ignore
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error: any) => console.error(error));

  // extension toggle
  const toggleExtension = async (tab: any) => {
    if (tab && tab.id) {
      const message: ExtMessage = new ExtMessage(MessageType.clickExtIcon);
      await handleMessage(message);
    }
  };

  // monitor the event from extension icon click
  browser.action.onClicked.addListener((tab) => {
    console.log("click icon");
    console.log(tab);
    toggleExtension(tab);
  });

  // handle messages using our MessageFacade
  browser.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse: (message: unknown) => void) => {
      console.log("background received message:", message);

      // Type check to ensure message is an ExtMessage
      if (message && typeof message === "object" && "messageType" in message) {
        const extMessage = message as ExtMessage;

        // Create a promise to handle the message
        const handlePromise = async () => {
          try {
            await handleMessage(extMessage);
            sendResponse(true);
          } catch (error) {
            console.error("Error handling message in background:", error);
            sendResponse(false);
          }
        };

        // Start handling the message asynchronously
        void handlePromise();

        // Return true to indicate we'll call sendResponse asynchronously
        return true;
      }

      // Return undefined for unrecognized messages (instead of false)
      return undefined;
    }
  );
});
