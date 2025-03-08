import ExtMessage from "../types";
import { MessageHandler } from "@/entrypoints/messages/MessageFacade";
import { MessageService } from "@/services/message-service";

export class ClickExtIconMsgHandler implements MessageHandler {
  async handleMsg(message: ExtMessage): Promise<void> {
    try {
      // Send the click icon message to all active tabs using our service
      await MessageService.sendToAllActiveTabs(
        message.messageType,
        message.content
      );
    } catch (error) {
      console.error("Error handling clickExtIcon message:", error);
    }
  }
}
