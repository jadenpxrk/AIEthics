import ExtMessage, { MessageType } from "@/entrypoints/types";

import { browser } from "wxt/browser";

/**
 * Service for handling message communication between extension components
 */
export class MessageService {
  /**
   * Send a message to the background script
   * @param messageType Type of message
   * @param content Optional content to include
   * @returns Response from the background
   */
  static async sendToBackground(
    messageType: MessageType,
    content?: string
  ): Promise<any> {
    const message = new ExtMessage(messageType);
    if (content) {
      message.content = content;
    }

    return browser.runtime.sendMessage(message);
  }

  /**
   * Send a message to a specific tab
   * @param tabId Target tab ID
   * @param messageType Type of message
   * @param content Optional content to include
   * @returns Response from the tab
   */
  static async sendToTab(
    tabId: number,
    messageType: MessageType,
    content?: string
  ): Promise<any> {
    const message = new ExtMessage(messageType);
    if (content) {
      message.content = content;
    }

    return browser.tabs.sendMessage(tabId, message);
  }

  /**
   * Send a message to all active tabs
   * @param messageType Type of message
   * @param content Optional content to include
   * @returns Array of responses from tabs
   */
  static async sendToAllActiveTabs(
    messageType: MessageType,
    content?: string
  ): Promise<any[]> {
    const message = new ExtMessage(messageType);
    if (content) {
      message.content = content;
    }

    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const responses: any[] = [];

    for (const tab of tabs) {
      if (tab.id) {
        try {
          const response = await browser.tabs.sendMessage(tab.id, message);
          responses.push(response);
        } catch (error) {
          console.error(`Error sending message to tab ${tab.id}:`, error);
        }
      }
    }

    return responses;
  }
}
