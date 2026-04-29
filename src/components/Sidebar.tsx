import { Plus, Trash2, MessageSquare } from "lucide-react";
import { useStore } from "../store";

interface SidebarProps {
  className?: string;
  onNewChat: () => void;
}

export function Sidebar({ className, onNewChat }: SidebarProps) {
  const { chats, activeChatId, selectChat, deleteChat, models } = useStore();

  const sortedChats = Object.values(chats).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      deleteChat(id);
    }
  };

  return (
    <div
      className={`w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col ${className || ""}`}
    >
      <div className="p-4 border-b border-zinc-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {sortedChats.length === 0 ? (
          <p className="text-zinc-500 text-sm text-center py-4">No chats yet</p>
        ) : (
          sortedChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer mb-1 ${
                activeChatId === chat.id
                  ? "bg-zinc-800 border border-zinc-700"
                  : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare
                  size={14}
                  className="text-zinc-500 flex-shrink-0"
                />
                <span className="text-sm text-zinc-300 truncate">
                  {chat.title}
                </span>
              </div>
              <button
                onClick={(e) => handleDelete(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-800">
        <div className="text-xs text-zinc-500">
          {models.length} model{models.length !== 1 ? "s" : ""} available
        </div>
      </div>
    </div>
  );
}
