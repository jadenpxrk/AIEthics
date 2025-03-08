import ExtMessage from "../types";
import { MessageHandler } from "@/entrypoints/messages/MessageFacade";
import { MessageService } from "@/services/message-service";

export class ThemeChangeMsgHandler implements MessageHandler {
  async handleMsg(message: ExtMessage): Promise<void> {
    try {
      // forward the theme change message to all active tabs using our service
      await MessageService.sendToAllActiveTabs(
        message.messageType,
        message.content
      );
    } catch (error) {
      console.error("Error handling changeTheme message:", error);
    }
  }
}
