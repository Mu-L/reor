import React, { useState, useEffect, useRef } from "react";

import { MessageStreamEvent } from "@anthropic-ai/sdk/resources";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { Editor } from "@tiptap/react";
import { ChatCompletionChunk } from "openai/resources/chat/completions";
import { FaMagic } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { ChatHistory } from "../Chat/Chat";
import { formatOpenAIMessageContentIntoString } from "../Chat/utils";
import { useOutsideClick } from "../Chat/hooks/use-outside-click";
import { HighlightData } from "../Editor/HighlightExtension";
interface WritingAssistantProps {
  editor: Editor | null;
  highlightData: HighlightData;
  currentChatHistory: ChatHistory | undefined;
  setCurrentChatHistory: React.Dispatch<
    React.SetStateAction<ChatHistory | undefined>
  >;
}

const WritingAssistant: React.FC<WritingAssistantProps> = ({
  editor,
  highlightData,
  currentChatHistory,
  setCurrentChatHistory,
}) => {
  const [loadingResponse, setLoadingResponse] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isOptionsVisible, setIsOptionsVisible] = useState<boolean>(false);
  const [prevPrompt, setPrevPrompt] = useState<string>("");
  const markdownContainerRef = useRef(null);
  const optionsContainerRef = useRef(null);
  const hasValidMessages = currentChatHistory?.displayableChatHistory.some(
    (msg) => msg.role === "assistant"
  );
  const lastAssistantMessage = currentChatHistory?.displayableChatHistory
    .filter((msg) => msg.role === "assistant")
    .pop();

  useOutsideClick(markdownContainerRef, () => {
    setCurrentChatHistory(undefined);
  });
  useOutsideClick(optionsContainerRef, () => {
    setIsOptionsVisible(false);
  });

  useEffect(() => {
    if (hasValidMessages) {
      setIsOptionsVisible(false);
    }
  }, [hasValidMessages]);

  const copyToClipboard = () => {
    if (
      !editor ||
      !currentChatHistory ||
      currentChatHistory.displayableChatHistory.length === 0
    ) {
      console.error("No chat history available for copying.");
      return;
    }
    const llmResponse =
      currentChatHistory.displayableChatHistory[
        currentChatHistory.displayableChatHistory.length - 1
      ];

    const copiedText = llmResponse.visibleContent
      ? llmResponse.visibleContent
      : formatOpenAIMessageContentIntoString(llmResponse.content);

    if (copiedText) {
      navigator.clipboard
        .writeText(copiedText)
        .then(() => {
          console.log("Text copied to clipboard successfully!");
        })
        .catch((err) => {
          console.error("Failed to copy text: ", err);
        });
    }
  };

  const insertAfterHighlightedText = () => {
    if (
      !editor ||
      !currentChatHistory ||
      currentChatHistory.displayableChatHistory.length === 0
    ) {
      console.error("No chat history available for insertion.");
      return;
    }

    const llmResponse =
      currentChatHistory.displayableChatHistory[
        currentChatHistory.displayableChatHistory.length - 1
      ];

    const insertionText = llmResponse.visibleContent
      ? llmResponse.visibleContent
      : formatOpenAIMessageContentIntoString(llmResponse.content);

    editor.view.focus();

    const { from, to } = editor.state.selection;
    const endOfSelection = Math.max(from, to);

    editor
      .chain()
      .focus()
      .setTextSelection(endOfSelection)
      .insertContent("\n" + insertionText)
      .run();

    setCurrentChatHistory(undefined);
  };

  const replaceHighlightedText = () => {
    if (
      !editor ||
      !currentChatHistory ||
      currentChatHistory.displayableChatHistory.length === 0
    ) {
      console.error("No chat history available for replacement.");
      return;
    }

    const llmResponse =
      currentChatHistory.displayableChatHistory[
        currentChatHistory.displayableChatHistory.length - 1
      ];

    const replacementText = llmResponse.visibleContent
      ? llmResponse.visibleContent
      : formatOpenAIMessageContentIntoString(llmResponse.content);

    if (replacementText) {
      editor
        .chain()
        .focus()
        .deleteSelection()
        .insertContent(replacementText)
        .run();
    }

    setCurrentChatHistory(undefined);
  };

  const handleOption = async (option: string, customPromptInput?: string) => {
    const selectedText = highlightData.text;
    if (!selectedText.trim()) return;

    let prompt = "";

    switch (option) {
      case "simplify":
        prompt = `The following text in triple quotes below has already been written:
"""
${selectedText}
"""
Simplify and condense the writing. Do not return anything other than the simplified writing. Do not wrap responses in quotes.`;
        break;
      case "copy-editor":
        prompt = `Act as a copy editor. Go through the text in triple quotes below. Edit it for spelling mistakes, grammar issues, punctuation, and generally for readability and flow. Format the text into appropriately sized paragraphs. Make your best effort.
 
""" ${selectedText} """
Return only the edited text. Do not wrap your response in quotes. Do not offer anything else other than the edited text in the response. Do not translate the text. If in doubt, or you can't make edits, just return the original text.`;
        break;
      case "takeaways":
        prompt = `My notes are below in triple quotes:
""" ${selectedText} """
Write a markdown list (using dashes) of key takeaways from my notes. Write at least 3 items, but write more if the text requires it. Be very detailed and don't leave any information out. Do not wrap responses in quotes.`;
        break;
      case "custom":
        prompt =
          `The user has given the following instructions(in triple #) for processing the text selected(in triple quotes): ` +
          `### ` +
          customPromptInput +
          ` ###` +
          "\n" +
          `  """ ${selectedText} """`;
        break;
    }
    setPrevPrompt(prompt);
    await getLLMResponse(prompt, currentChatHistory);
  };

  const getLLMResponse = async (
    prompt: string,
    chatHistory: ChatHistory | undefined
  ) => {
    const defaultLLMName = await window.llm.getDefaultLLMName();
    const llmConfigs = await window.llm.getLLMConfigs();

    const currentModelConfig = llmConfigs.find(
      (config) => config.modelName === defaultLLMName
    );
    if (!currentModelConfig) {
      throw new Error(`No model config found for model: ${defaultLLMName}`);
    }

    try {
      if (loadingResponse) return;
      setLoadingResponse(true);
      if (!chatHistory?.id) {
        const chatID = Date.now().toString();
        chatHistory = {
          id: chatID,
          displayableChatHistory: [],
        };
      }
      setCurrentChatHistory(chatHistory);
      chatHistory.displayableChatHistory.push({
        role: "user",
        content: prompt,
        messageType: "success",
        context: [],
      });

      await window.llm.streamingLLMResponse(
        defaultLLMName,
        currentModelConfig,
        false,
        chatHistory
      );
    } catch (error) {
      console.error(error);
    }
    setLoadingResponse(false);
  };

  const appendNewContentToMessageHistory = (
    chatID: string,
    newContent: string,
    newMessageType: "success" | "error"
  ) => {
    setCurrentChatHistory((prev) => {
      if (chatID !== prev?.id) return prev;
      const newDisplayableHistory = prev.displayableChatHistory;
      if (newDisplayableHistory.length > 0) {
        const lastMessage =
          newDisplayableHistory[newDisplayableHistory.length - 1];

        if (lastMessage.role === "assistant") {
          lastMessage.content += newContent; // Append new content with a space
          lastMessage.messageType = newMessageType;
        } else {
          newDisplayableHistory.push({
            role: "assistant",
            content: newContent,
            messageType: newMessageType,
            context: [],
          });
        }
      } else {
        newDisplayableHistory.push({
          role: "assistant",
          content: newContent,
          messageType: newMessageType,
          context: [],
        });
      }
      return {
        id: prev.id,
        displayableChatHistory: newDisplayableHistory,
        openAIChatHistory: newDisplayableHistory.map((message) => {
          return {
            role: message.role,
            content: message.content,
          };
        }),
      };
    });
  };

  useEffect(() => {
    const handleOpenAIChunk = (
      receivedChatID: string,
      chunk: ChatCompletionChunk
    ) => {
      const newContent = chunk.choices[0].delta.content ?? "";
      if (newContent) {
        appendNewContentToMessageHistory(receivedChatID, newContent, "success");
      }
    };

    const handleAnthropicChunk = (
      receivedChatID: string,
      chunk: MessageStreamEvent
    ) => {
      const newContent =
        chunk.type === "content_block_delta" ? chunk.delta.text : "";
      if (newContent) {
        appendNewContentToMessageHistory(receivedChatID, newContent, "success");
      }
    };

    const removeOpenAITokenStreamListener = window.ipcRenderer.receive(
      "openAITokenStream",
      handleOpenAIChunk
    );

    const removeAnthropicTokenStreamListener = window.ipcRenderer.receive(
      "anthropicTokenStream",
      handleAnthropicChunk
    );

    return () => {
      removeOpenAITokenStreamListener();
      removeAnthropicTokenStreamListener();
    };
  }, []);

  if (!highlightData.position) return null;

  return (
    <div>
      <button
        style={{
          top: `${highlightData.position.top}px`,
          left: `${highlightData.position.left + 30}px`,
          zIndex: 50,
        }}
        className="absolute flex size-7 cursor-pointer items-center justify-center rounded-full border-none bg-gray-200 text-gray-600 shadow-md hover:bg-gray-300"
        aria-label="Writing Assistant button"
        onClick={() => {
          setIsOptionsVisible(true);
        }}
      >
        <FaMagic />
      </button>
      {!hasValidMessages && isOptionsVisible && (
        <div
          ref={optionsContainerRef}
          style={{
            top: highlightData.position.top,
            left: highlightData.position.left,
          }}
          className="absolute z-50 w-96 rounded-md border border-gray-300 bg-white p-2.5"
        >
          <TextField
            type="text"
            variant="outlined"
            size="small"
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value);
            }}
            placeholder="Ask AI anything..."
            className="mb-2.5 w-full p-1" // TailwindCSS classes for styling
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleOption("custom", customPrompt);
              }
            }}
          />
          <div className="max-h-36 overflow-y-auto">
            <Button
              onClick={() => handleOption("simplify")}
              className="mb-1 block w-full"
              style={{ textTransform: "none" }}
            >
              Simplify and condense the writing
            </Button>
            <Button
              onClick={() => handleOption("copy-editor")}
              className="mb-1 block w-full"
              style={{ textTransform: "none" }}
            >
              Fix spelling and grammar
            </Button>
            <Button
              onClick={() => handleOption("takeaways")}
              className="mb-1 block w-full"
              style={{ textTransform: "none" }}
            >
              List key Takeaways
            </Button>
          </div>
        </div>
      )}
      {hasValidMessages && (
        <div
          ref={markdownContainerRef}
          className="absolute z-50 rounded-lg border border-gray-300 bg-white p-2.5 shadow-md"
          style={{
            top: highlightData.position.top,
            left: highlightData.position.left,
            width: "385px",
          }}
        >
          {lastAssistantMessage && (
            <ReactMarkdown
              rehypePlugins={[rehypeRaw]}
              className={`markdown-content break-words rounded-md p-1 ${
                lastAssistantMessage.messageType === "error"
                  ? "bg-red-100 text-red-800"
                  : lastAssistantMessage.role === "assistant"
                    ? "bg-neutral-200 text-black"
                    : "bg-blue-100 text-blue-800"
              }`}
            >
              {lastAssistantMessage.visibleContent
                ? lastAssistantMessage.visibleContent
                : formatOpenAIMessageContentIntoString(
                    lastAssistantMessage.content
                  )}
            </ReactMarkdown>
          )}
          <div className="mt-2 flex justify-between">
            <button
              className="mr-1 flex cursor-pointer items-center rounded-md border-0 bg-blue-100 px-2.5 py-1"
              onClick={() => {
                getLLMResponse(prevPrompt, currentChatHistory);
              }}
            >
              Re-run
            </button>
            <button
              className="mr-1 flex cursor-pointer items-center rounded-md border-0 bg-blue-100 px-2.5 py-1"
              onClick={() => {
                insertAfterHighlightedText();
              }}
            >
              Insert
            </button>
            <button
              className="mr-1 flex cursor-pointer items-center rounded-md border-0 bg-blue-100 px-2.5 py-1"
              onClick={() => {
                copyToClipboard();
              }}
            >
              Copy
            </button>
            <button
              className="flex cursor-pointer items-center rounded-md border-0 bg-indigo-700 px-2.5 py-1 text-white"
              onClick={() => {
                replaceHighlightedText();
              }}
            >
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WritingAssistant;
