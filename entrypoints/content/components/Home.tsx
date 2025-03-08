import * as pdfjsLib from "pdfjs-dist";

import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Globe, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { browser } from "wxt/browser";
import remarkGfm from "remark-gfm";

// setup pdf worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// token limits for gemini
const MAX_TOKENS = 1048576;
const CHARS_PER_TOKEN = 4;

interface ChatMessage {
  content: string;
  isUser: boolean;
  timestamp: number;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  url: string;
  lastUpdated: number;
}

interface ChatProps {
  resetKey: number;
}

// Define supported languages for the UI
interface LanguageOption {
  code: string;
  name: string;
}

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "auto", name: "Auto (Same as document)" },
  { code: "en", name: "English" },
  { code: "es", name: "Spanish (Español)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "ar", name: "Arabic (العربية)" },
];

// Map language codes to full names for use in prompts
const LANGUAGE_NAMES: Record<string, string> = {
  auto: "the same language as the document",
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
};

// Define a simpler version of Select for our use case
const LanguageSelector = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="relative flex items-center">
      <div className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
        <Globe className="h-3 w-3" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none outline-none cursor-pointer appearance-none pr-4"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export function Home({ resetKey }: ChatProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pageContent, setPageContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [contentTruncated, setContentTruncated] = useState(false);
  const [truncationPercentage, setTruncationPercentage] = useState(0);
  const [outputLanguage, setOutputLanguage] = useState<string>("auto"); // Default to auto (same as document)
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const focusTextarea = useCallback(() => {
    // focus on textarea when ready
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    });
  }, []);

  // focus when loaded
  useEffect(() => {
    focusTextarea();
  }, [focusTextarea]);

  // get api key from storage
  useEffect(() => {
    const loadApiKey = async () => {
      const data = await browser.storage.local.get("geminiApiKey");
      // make sure we have a valid key
      if (data && data.geminiApiKey && typeof data.geminiApiKey === "string") {
        setApiKey(data.geminiApiKey);
      }
    };
    loadApiKey();
  }, []);

  // setup chat session
  useEffect(() => {
    const initializeChat = async () => {
      const allStorage = await browser.storage.local.get();
      const currentUrl = window.location.href;
      const chatKeys = Object.keys(allStorage).filter((key) =>
        key.startsWith("chat_")
      );

      if (resetKey > 0) {
        // clear previous chats for this url if reset requested
        const deletePromises = chatKeys.map(async (key) => {
          const session = allStorage[key] as ChatSession;
          if (session.url === currentUrl) {
            await browser.storage.local.remove(key);
          }
        });
        await Promise.all(deletePromises);

        // start fresh session
        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);
        setMessages([]);
        await getPageContent();

        const newSession: ChatSession = {
          id: newSessionId,
          messages: [],
          url: currentUrl,
          lastUpdated: Date.now(),
        };
        await browser.storage.local.set({
          [`chat_${newSessionId}`]: newSession,
        });
      } else {
        // find most recent chat for this url
        let mostRecentSession: ChatSession | null = null;
        let mostRecentTime = 0;

        for (const key of chatKeys) {
          const session = allStorage[key] as ChatSession;
          if (
            session.url === currentUrl &&
            session.lastUpdated > mostRecentTime
          ) {
            mostRecentSession = session;
            mostRecentTime = session.lastUpdated;
          }
        }

        if (mostRecentSession) {
          // load existing chat
          setSessionId(mostRecentSession.id);
          setMessages(mostRecentSession.messages);
          await getPageContent();
        } else {
          // create new chat
          const newSessionId = crypto.randomUUID();
          setSessionId(newSessionId);
          setMessages([]);
          await getPageContent();

          const newSession: ChatSession = {
            id: newSessionId,
            messages: [],
            url: currentUrl,
            lastUpdated: Date.now(),
          };
          await browser.storage.local.set({
            [`chat_${newSessionId}`]: newSession,
          });
        }
      }

      // focus after setup
      focusTextarea();
    };

    initializeChat();
  }, [resetKey, focusTextarea]);

  // save messages to storage
  useEffect(() => {
    const saveMessages = async () => {
      if (sessionId) {
        const session: ChatSession = {
          id: sessionId,
          messages,
          url: window.location.href,
          lastUpdated: Date.now(),
        };
        await browser.storage.local.set({ [`chat_${sessionId}`]: session });
      }
    };

    saveMessages();
  }, [messages, sessionId]);

  // make textarea grow with content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const adjustHeight = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener("input", adjustHeight);
    adjustHeight(); // initial size

    return () => textarea.removeEventListener("input", adjustHeight);
  }, [message]);

  // quick token count estimate
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  };

  // trim text to fit token limit
  const truncateToTokenLimit = (
    text: string
  ): { text: string; percentage: number } => {
    const estimatedTokens = estimateTokens(text);

    if (estimatedTokens <= MAX_TOKENS) {
      return { text, percentage: 100 };
    }

    // keep what fits
    const charsToKeep = MAX_TOKENS * CHARS_PER_TOKEN;
    const truncatedText = text.slice(0, charsToKeep);
    const percentage = Math.floor((charsToKeep / text.length) * 100);

    return { text: truncatedText, percentage };
  };

  // scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // auto-scroll when new content appears
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage, scrollToBottom]);

  const extractPdfContent = async (pdfUrl: string): Promise<string> => {
    try {
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      let textContent = "";

      // extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        textContent += strings.join(" ") + "\n";
      }

      return textContent;
    } catch (error) {
      console.error("Error extracting PDF content:", error);
      return "";
    }
  };

  const getPageContent = async () => {
    const url = window.location.href;
    let content = "";
    const contentType = url.toLowerCase().endsWith(".pdf") ? "PDF" : "webpage";

    if (contentType === "PDF") {
      // get pdf text
      content = await extractPdfContent(url);
      console.log("Scraped PDF content:", {
        contentLength: content.length,
        preview: content.slice(0, 200) + "...",
        url: url,
      });
    } else {
      // get webpage text
      content = document.body.innerText;
      console.log("Scraped webpage content:", {
        contentLength: content.length,
        preview: content.slice(0, 200) + "...",
        url: url,
      });
    }

    // check if we need to truncate
    const estimatedTokens = estimateTokens(content);
    if (estimatedTokens > MAX_TOKENS) {
      const { text: truncatedContent, percentage } =
        truncateToTokenLimit(content);
      setContentTruncated(true);
      setTruncationPercentage(percentage);
      setPageContent(truncatedContent);

      console.log(`${contentType} content truncated:`, {
        originalLength: content.length,
        truncatedLength: truncatedContent.length,
        originalTokens: estimatedTokens,
        truncatedTokens: MAX_TOKENS,
        percentageKept: percentage,
      });
    } else {
      setContentTruncated(false);
      setPageContent(content);
    }
  };

  useEffect(() => {
    getPageContent();
  }, []);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;
    if (!apiKey) return; // skip if no api key

    // add user message
    const userMessage: ChatMessage = {
      content: message,
      isUser: true,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingMessage("");

    try {
      // setup gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // format previous messages
      const chatHistory = messages
        .map((msg) => `${msg.isUser ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n");

      // check if url contains terms-related keywords
      const url = window.location.href.toLowerCase();

      // setup prompt
      const contentTypeLabel = window.location.href
        .toLowerCase()
        .endsWith(".pdf")
        ? "PDF"
        : "webpage";

      let promptContext = `Context: The following is the content of the ${contentTypeLabel} that the user is viewing:`;

      if (contentTruncated) {
        promptContext += ` (note: only the first ${truncationPercentage}% could be processed due to length)`;
      }

      // Get the requested output language name
      const requestedLanguage =
        LANGUAGE_NAMES[outputLanguage] || LANGUAGE_NAMES.auto;

      // prompt eng
      // THIS IS ASSUMING THEY ARE ON A TOS PAGE
      let systemPrompt = "";
      systemPrompt = `You are a helpful assistant specializing in analyzing Terms of Service, Privacy Policies, and other legal agreements for users. 
Your goal is to help users understand the pros and cons of what they're agreeing to in a clear, structured way.

IMPORTANT LANGUAGE INSTRUCTION: First detect the language of the document. The user has requested that you respond in ${requestedLanguage}.${
        outputLanguage === "auto"
          ? " This means you should respond in the same language as the document."
          : " REGARDLESS of the document's original language, you MUST provide your entire response in " +
            requestedLanguage +
            " only."
      }

When analyzing terms, always organize your response into two clear sections:

PROS:
- List benefits to the user
- User rights that are clearly protected
- Fair or standard terms that are user-friendly
- Transparency in data handling or business practices
- Any particularly favorable terms compared to industry standards

CONS:
- Potential risks or downsides for users
- Limitations on user rights or restrictive clauses
- How user data may be collected, used, or shared in ways users might not expect
- Any unusual, one-sided, or potentially concerning clauses
- Terms that limit liability or user recourse

Be honest and transparent - present a balanced view without being alarmist. Focus on helping users make an informed decision.
Format both pros and cons as bullet lists for clarity.

${
  outputLanguage === "auto"
    ? `
If responding in a non-English language, use the appropriate section titles:
- Spanish: "VENTAJAS" and "DESVENTAJAS"
- French: "AVANTAGES" and "INCONVÉNIENTS"
- German: "VORTEILE" and "NACHTEILE"
- Italian: "VANTAGGI" and "SVANTAGGI"
- Portuguese: "VANTAGENS" and "DESVANTAGENS"
- Chinese: "优点" and "缺点"
- Japanese: "メリット" and "デメリット"
- Korean: "장점" and "단점"
- Russian: "ПРЕИМУЩЕСТВА" and "НЕДОСТАТКИ"
- Arabic: "الإيجابيات" and "السلبيات"
`
    : `
Always use the English section titles "PROS" and "CONS" regardless of the document language when responding in English, or the appropriate titles for the selected language.
`
}

If there is nothing about the page that appears to be a Terms of Service or related legal document, respond in ${requestedLanguage}, stating that you don't see any Terms of Service to analyze.`;

      const prompt =
        `${systemPrompt}\n\n` +
        `${promptContext}\n\n${pageContent}\n\n` +
        `Previous conversation:\n${chatHistory}\n\n` +
        `User's request: ${
          message.trim() ||
          "Please analyze this Terms of Service document and provide the pros and cons."
        }\n\n` +
        `Analyze the ${contentTypeLabel} content carefully. If this is a Terms of Service, Privacy Policy, or similar legal document, provide a balanced analysis of the pros and cons as specified in your instructions. Take into account any previous conversation context if relevant. You MUST respond in ${requestedLanguage}${
          outputLanguage !== "auto"
            ? " even if the document is in a different language"
            : ""
        }.`;

      // get streaming response
      const result = await model.generateContentStream(prompt);

      let fullResponse = "";
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        setStreamingMessage(fullResponse);
      }

      // add to messages when done
      const botMessage: ChatMessage = {
        content: fullResponse,
        isUser: false,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      const errorMessage: ChatMessage = {
        content:
          "Error processing your request. The error was: " +
          (error as Error).message,
        isUser: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingMessage(""); // clear streaming message
      setMessage("");
      // focus back on input
      focusTextarea();
    }
  };

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-col justify-center items-start gap-2 px-4 pt-3 pb-4">
        <LanguageSelector value={outputLanguage} onChange={setOutputLanguage} />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <ScrollArea
          className="flex-1"
          ref={scrollAreaRef}
          onWheel={(e) => {
            const scrollContainer = scrollAreaRef.current?.querySelector(
              "[data-radix-scroll-area-viewport]"
            );
            if (scrollContainer) {
              const { scrollTop, scrollHeight, clientHeight } =
                scrollContainer as HTMLElement;
              const isAtTop = scrollTop <= 0;
              const isAtBottom =
                Math.abs(scrollHeight - scrollTop - clientHeight) < 1;

              // Only let events propagate if we're at boundaries
              if (
                !((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0))
              ) {
                e.stopPropagation();
                e.preventDefault();
              }
            }
          }}
        >
          <div className="space-y-4 p-4">
            {!apiKey && (
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  Please set your Gemini API key in the settings to start
                  chatting. Click the settings icon (⚙️) in the top right to
                  configure your API key.
                </p>
              </div>
            )}
            {contentTruncated && messages.length === 0 && (
              <div className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ The{" "}
                  {window.location.href.toLowerCase().endsWith(".pdf")
                    ? "PDF"
                    : "webpage"}{" "}
                  content was too long to process completely. Only the first{" "}
                  {truncationPercentage}% was read.
                </p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`${
                  msg.isUser ? "bg-muted" : "bg-transparent"
                } p-4 rounded-lg w-[calc(400px-32px-36px)] max-w-[calc(400px-32px-36px)]`}
              >
                <div
                  className={`text-sm prose prose-sm w-[calc(400px-32px-36px))] max-w-[calc(400px-32px-36px)] break-words overflow-wrap-anywhere ${
                    msg.isUser ? "prose-invert" : ""
                  }`}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {streamingMessage && (
              <div className="p-4 rounded-lg w-[calc(400px-32px-36px)] max-w-[calc(400px-32px-36px)]">
                <div className="text-sm prose prose-sm w-[calc(400px-32px-36px))] max-w-[calc(400px-32px-36px)] break-words overflow-wrap-anywhere">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingMessage}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {isLoading && !streamingMessage && (
              <div className="p-4 text-sm text-muted-foreground animate-pulse">
                Thinking...
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4 flex flex-row justify-between items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              apiKey
                ? `Ask a question or press Enter for pros/cons in ${
                    outputLanguage === "auto"
                      ? "the document's language"
                      : LANGUAGE_NAMES[outputLanguage]
                  }...`
                : "Please set your API key in settings first"
            }
            value={message}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setMessage(e.target.value)
            }
            onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter") {
                if (!e.shiftKey && !isLoading) {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleSend();
                }
              }
            }}
            className="flex-1 min-h-[80px] max-h-[calc((100dvh-48px-32px-56px)/6)] overflow-y-auto resize-none"
            rows={1}
            disabled={isLoading || !apiKey}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={isLoading || !apiKey}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
