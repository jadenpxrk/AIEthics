import ExtMessage, { MessageType } from "@/entrypoints/types";

import { ClickExtIconMsgHandler } from "./ClickExtIconMsgHandler";
import { ThemeChangeMsgHandler } from "./ThemeChangeMsgHandler";

export interface MessageHandler {
  handleMsg(message: ExtMessage): Promise<void>;
}

const handlers: Map<MessageType, MessageHandler> = new Map<
  MessageType,
  MessageHandler
>();
handlers.set(MessageType.clickExtIcon, new ClickExtIconMsgHandler());
handlers.set(MessageType.changeTheme, new ThemeChangeMsgHandler());

export default async function handleMessage(
  message: ExtMessage
): Promise<void> {
  const handler = handlers.get(message.messageType);
  if (handler) {
    try {
      await handler.handleMsg(message);
    } catch (error) {
      console.error(
        `Error handling message type ${message.messageType}:`,
        error
      );
    }
  } else {
    console.log(`Unsupported messageType: ${message.messageType}`);
  }
}
