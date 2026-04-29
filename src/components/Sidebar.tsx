import { Plus, Trash2, MessageSquare } from "lucide-react";
import { useStore } from "../store";

interface SidebarProps {
  onNewChat: () => void;
}

export function Sidebar({ onNewChat }: SidebarProps) {
  const { chats, activeChatId, selectChat, deleteChat, models } = useStore();

  const sortedChats = Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("¿Eliminar este chat?")) deleteChat(id);
  };

  return (
    <div className="w-60 bg-gray-100 dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col shrink-0">
      <div className="p-3 border-b border-gray-200 dark:border-zinc-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus size={15} />
          Nuevo chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sortedChats.length === 0 ? (
          <p className="text-gray-400 dark:text-zinc-500 text-xs text-center py-6">Sin chats</p>
        ) : (
          sortedChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => selectChat(chat.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer ${
                activeChatId === chat.id
                  ? "bg-white dark:bg-zinc-800 shadow-sm border border-gray-200 dark:border-zinc-700"
                  : "hover:bg-gray-200/60 dark:hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare size={13} className="text-gray-400 dark:text-zinc-500 shrink-0" />
                <span className="text-sm text-gray-700 dark:text-zinc-300 truncate">{chat.title}</span>
              </div>
              <button
                onClick={(e) => handleDelete(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 rounded transition-opacity"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-zinc-800">
        <p className="text-xs text-gray-400 dark:text-zinc-500">
          {models.length} modelo{models.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
