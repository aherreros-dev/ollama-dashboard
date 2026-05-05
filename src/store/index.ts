import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Chat, ChatMessage, ChatOptions, OllamaModel } from "../api/types";
import { DEFAULT_OPTIONS } from "../api/types";

export type Theme = "auto" | "light" | "dark";

interface AppState {
  models: OllamaModel[];
  activeChatId: string | null;
  chats: Record<string, Chat>;
  defaultOptions: ChatOptions;
  theme: Theme;

  setTheme: (theme: Theme) => void;
  setModels: (models: OllamaModel[]) => void;
  newChat: (model?: string, systemPrompt?: string) => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  appendMessage: (chatId: string, message: ChatMessage) => void;
  updateLastAssistant: (chatId: string, content: string) => void;
  setChatModel: (chatId: string, model: string) => void;
  setChatOptions: (chatId: string, options: Partial<ChatOptions>) => void;
  setChatSystem: (chatId: string, systemPrompt: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      models: [],
      activeChatId: null,
      chats: {},
      defaultOptions: DEFAULT_OPTIONS,
      theme: "auto",

      setTheme: (theme) => set({ theme }),
      setModels: (models) => set({ models }),

      newChat: (model, systemPrompt) => {
        const id = crypto.randomUUID();
        const models = get().models;
        const defaultModel = model || models[0]?.name || "gemma4:e2b";

        const newChat: Chat = {
          id,
          title: "New Chat",
          model: defaultModel,
          systemPrompt: systemPrompt || "",
          options: { ...DEFAULT_OPTIONS },
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((state) => ({
          chats: { ...state.chats, [id]: newChat },
          activeChatId: id,
        }));

        return id;
      },

      selectChat: (id) => set({ activeChatId: id }),

      deleteChat: (id) => {
        set((state) => {
          const { [id]: _, ...rest } = state.chats;
          return {
            chats: rest,
            activeChatId: state.activeChatId === id ? null : state.activeChatId,
          };
        });
      },

      renameChat: (id, title) => {
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              title,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      appendMessage: (chatId, message) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          const isFirstUser =
            chat.messages.filter((m) => m.role === "user").length === 0 &&
            message.role === "user";

          let title = chat.title;
          if (isFirstUser && chat.title === "New Chat") {
            title =
              message.content.slice(0, 40) +
              (message.content.length > 40 ? "..." : "");
          }

          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...chat,
                title,
                messages: [...chat.messages, message],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateLastAssistant: (chatId, content) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          const messages = [...chat.messages];
          const lastIndex = messages.length - 1;

          if (lastIndex >= 0 && messages[lastIndex].role === "assistant") {
            messages[lastIndex] = { ...messages[lastIndex], content };
          } else {
            messages.push({ role: "assistant", content });
          }

          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...chat,
                messages,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setChatModel: (chatId, model) => {
        set((state) => ({
          chats: {
            ...state.chats,
            [chatId]: {
              ...state.chats[chatId],
              model,
              updatedAt: Date.now(),
            },
          },
        }));
      },

      setChatOptions: (chatId, options) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...chat,
                options: { ...chat.options, ...options },
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      setChatSystem: (chatId, systemPrompt) => {
        set((state) => {
          const chat = state.chats[chatId];
          if (!chat) return state;

          return {
            chats: {
              ...state.chats,
              [chatId]: {
                ...chat,
                systemPrompt,
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
    }),
    {
      name: "ollama-dash-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        chats: state.chats,
        activeChatId: state.activeChatId,
        theme: state.theme,
      }),
    },
  ),
);
