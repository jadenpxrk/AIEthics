import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StorageService } from "@/services/storage-service";

// constants
const API_KEY_STORAGE_KEY = "geminiApiKey";

export function ApiKeySettings() {
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const savedApiKey = await StorageService.getItem<string>(
          API_KEY_STORAGE_KEY
        );
        if (savedApiKey) {
          setApiKey(savedApiKey);
          setIsSaved(true);
        }
      } catch (error) {
        console.error("Error loading API key:", error);
      }
    };
    loadApiKey();
  }, []);

  const handleSave = async () => {
    try {
      await StorageService.setItem(API_KEY_STORAGE_KEY, apiKey);
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving API key:", error);
    }
  };

  const handleClear = async () => {
    try {
      await StorageService.removeItem(API_KEY_STORAGE_KEY);
      setApiKey("");
      setIsSaved(false);
    } catch (error) {
      console.error("Error clearing API key:", error);
    }
  };

  return (
    <Card>
      <div className="space-y-1.5 p-6 pb-3">
        <h3 className="font-semibold text-left text-base">Gemini API Key</h3>
      </div>
      <div className="p-6 pt-2 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Enter your Gemini API key"
          />
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSave} disabled={!apiKey || isSaved}>
            {isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={!apiKey && !isSaved}
          >
            Clear
          </Button>
        </div>
      </div>
    </Card>
  );
}
