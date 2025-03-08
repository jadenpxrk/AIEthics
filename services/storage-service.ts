import { browser } from "wxt/browser";

/**
 * Service for handling browser storage operations
 */
export class StorageService {
  /**
   * Get an item from storage
   * @param key The key to get
   * @returns The value or undefined if not found
   */
  static async getItem<T>(key: string): Promise<T | undefined> {
    try {
      const result = await browser.storage.local.get(key);
      return result[key] as T | undefined;
    } catch (error) {
      console.error(`Error getting item from storage [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Set an item in storage
   * @param key The key to set
   * @param value The value to store
   */
  static async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const item = { [key]: value };
      await browser.storage.local.set(item);
    } catch (error) {
      console.error(`Error setting item in storage [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Remove an item from storage
   * @param key The key to remove
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await browser.storage.local.remove(key);
    } catch (error) {
      console.error(`Error removing item from storage [${key}]:`, error);
      throw error;
    }
  }

  /**
   * Get all items from storage
   * @returns All storage items
   */
  static async getAllItems(): Promise<Record<string, unknown>> {
    try {
      return await browser.storage.local.get();
    } catch (error) {
      console.error("Error getting all items from storage:", error);
      throw error;
    }
  }

  /**
   * Clear all storage
   */
  static async clearAll(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error("Error clearing storage:", error);
      throw error;
    }
  }
}
