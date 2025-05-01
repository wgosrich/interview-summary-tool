"use client";
import { useState, useRef, useEffect } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import BurnesLogo from "@/images/burnes_logo";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function Home() {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [additionalContextFiles, setAdditionalContextFiles] = useState<File[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [summaryDownloaded, setSummaryDownloaded] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [sessions, setSessions] = useState<
    { id: number; name: string; creator_id: number }[]
  >([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [subscribeSessionId, setSubscribeSessionId] = useState<string>("");
  const [chats, setChats] = useState<{ id: number; name: string }[]>([]);
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [newChatName, setNewChatName] = useState("");
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false);
  const chatDropdownRef = useRef<HTMLDivElement | null>(null);
  const createChatRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  const [selectedSessionInfo, setSelectedSessionInfo] = useState<{ id: number; creator_id: number, name: string } | null>(
    null
  );
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [sessionIDCopied, setSessionIDCopied] = useState(false);
  const [sessionRemoved, setSessionRemoved] = useState(false);
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [tab, setTab] = useState("newSummary");
  const [allSessions, setAllSessions] = useState<
    { id: number; name: string }[]
  >([]);
  const [searchSessionInput, setSearchSessionInput] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [revisionWindow, setRevisionWindow] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [infoPopupOpen, setInfoPopupOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const infoPopupRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmRef = useRef<HTMLDivElement | null>(null);
  const [renamePopupOpen, setRenamePopupOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");
  const [sessionRenamed, setSessionRenamed] = useState(false);
  const renamePopupRef = useRef<HTMLDivElement | null>(null);
  const [textContextPopupOpen, setTextContextPopupOpen] = useState(false);
  const [additionalTextContext, setAdditionalTextContext] = useState("");
  const textContextPopupRef = useRef<HTMLDivElement | null>(null);
  const [chatContextMenu, setChatContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [selectedChatInfo, setSelectedChatInfo] = useState<{ id: number, name: string } | null>(null);
  const [renameChatPopupOpen, setRenameChatPopupOpen] = useState(false);
  const [chatRenamed, setChatRenamed] = useState(false);
  const [chatDeleted, setChatDeleted] = useState(false);
  const renameChatPopupRef = useRef<HTMLDivElement | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const fetchSessions = async () => {
    if (!currentUserId) {
      console.error("No current user ID found");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/get_sessions/${currentUserId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        console.error("Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
    }
  };

  const fetchAllSessions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_all_sessions`);
      if (response.ok) {
        const data = await response.json();
        setAllSessions(data);

        // If we have sessions but no current session, set the first one
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
        }
      } else {
        console.error("Failed to fetch all sessions");
      }
    } catch (error) {
      console.error("Error fetching all sessions:", error);
    }
  };

  useEffect(() => {
    fetchAllSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPanel) {
        setShowPanel(false);
        setContextMenu(null);
      }
      if (e.key === "Tab" && !showPanel) {
        e.preventDefault();
        fetchSessions();
        setShowPanel(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Side panel elements
      const sidePanel = document.getElementById("side-panel");
      const sidePanelButton = document.querySelector(".absolute.top-4.right-\\[-55px\\]");
      const contextMenuEl = document.querySelector(".context-menu");

      // Profile menu elements
      const profileMenuEl = document.querySelector(".profile-menu");
      const profileButtonEl = document.querySelector(".profile-button");

      // Check if click is outside side panel and its button
      if (
        showPanel &&
        sidePanel &&
        !sidePanel.contains(e.target as Node) &&
        sidePanelButton &&
        !sidePanelButton.contains(e.target as Node) &&
        (!contextMenuEl || !contextMenuEl.contains(e.target as Node)) &&
        (!renamePopupRef.current || !renamePopupRef.current.contains(e.target as Node))
      ) {
        setShowPanel(false);
        setContextMenu(null);
      }

      // Check if click is outside profile menu and its button
      if (
        profileMenuOpen &&
        profileMenuEl &&
        !profileMenuEl.contains(e.target as Node) &&
        profileButtonEl &&
        !profileButtonEl.contains(e.target as Node)
      ) {
        setProfileMenuOpen(false);
      }

      // Check if click is outside dropdown
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }

      // Check if click is outside info popup
      if (
        infoPopupOpen &&
        infoPopupRef.current &&
        !infoPopupRef.current.contains(e.target as Node)
      ) {
        setInfoPopupOpen(false);
      }

      // Check if click is outside delete confirmation popup
      if (
        deleteConfirmOpen &&
        deleteConfirmRef.current &&
        !deleteConfirmRef.current.contains(e.target as Node)
      ) {
        setDeleteConfirmOpen(false);
        setSelectedSessionInfo(null);
      }

      // Check if click is outside rename popup
      if (
        renamePopupOpen &&
        renamePopupRef.current &&
        !renamePopupRef.current.contains(e.target as Node)
      ) {
        setRenamePopupOpen(false);
        setNewSessionName("");
      }

      // Check if click is outside chat dropdown
      if (
        chatDropdownOpen &&
        chatDropdownRef.current &&
        !chatDropdownRef.current.contains(e.target as Node)
      ) {
        setChatDropdownOpen(false);
      }

      // Check if click is outside create chat popup
      if (
        createChatOpen &&
        createChatRef.current &&
        !createChatRef.current.contains(e.target as Node)
      ) {
        setCreateChatOpen(false);
        setNewChatName("");
      }

      // Check if click is outside rename chat popup
      if (
        renameChatPopupOpen &&
        renameChatPopupRef.current &&
        !renameChatPopupRef.current.contains(e.target as Node)
      ) {
        setRenameChatPopupOpen(false);
        setNewChatName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPanel, profileMenuOpen, dropdownOpen, infoPopupOpen, deleteConfirmOpen, renamePopupOpen, chatDropdownOpen, createChatOpen, renameChatPopupOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const contextMenuEl = document.querySelector(".context-menu");
      if (contextMenuEl && !contextMenuEl.contains(e.target as Node)) {
        setContextMenu(null);
        setSelectedSessionInfo(null);
      }

      const chatContextMenuEl = document.querySelector(".chat-context-menu");
      if (chatContextMenuEl && !chatContextMenuEl.contains(e.target as Node)) {
        setChatContextMenu(null);
        setSelectedChatInfo(null);
      }
    };
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  useEffect(() => {
    const savedSessionId = localStorage.getItem("currentSessionId");
    const savedSummary = localStorage.getItem("summary");
    const savedMessages = localStorage.getItem("chatMessages");
    const savedShowChat = localStorage.getItem("showChat");
    const storedUserId = localStorage.getItem("user_id");
    const storedUsername = localStorage.getItem("username");
    const savedChatId = localStorage.getItem("currentChatId");

    if (savedSessionId) setCurrentSessionId(Number(savedSessionId));
    if (savedSummary) setSummary(savedSummary);
    if (savedMessages) setChatMessages(JSON.parse(savedMessages));
    if (savedShowChat) setShowChat(JSON.parse(savedShowChat));
    if (storedUserId) {
      setCurrentUserId(Number(storedUserId));
      setLoggedIn(true);
    }
    if (storedUsername) setUsername(storedUsername);
    if (savedChatId) setCurrentChatId(Number(savedChatId));
    const savedTab = localStorage.getItem("selectedTab");
    if (savedTab) setTab(savedTab);

    setInitializing(false); // done initializing
  }, []);

  useEffect(() => {
    if (currentSessionId !== null) {
      localStorage.setItem("currentSessionId", currentSessionId.toString());
    }
  }, [currentSessionId]);

  useEffect(() => {
    if (currentChatId !== null) {
      localStorage.setItem("currentChatId", currentChatId.toString());
    }
  }, [currentChatId]);

  useEffect(() => {
    localStorage.setItem("summary", summary);
  }, [summary]);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    localStorage.setItem("showChat", JSON.stringify(showChat));
  }, [showChat]);

  useEffect(() => {
    localStorage.setItem("selectedTab", tab);
  }, [tab]);

  useEffect(() => {
    if (currentSessionId) {
      fetchChats(currentSessionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  const fetchChats = async (sessionId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_chats/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setChats(data);
        // If we don't have a current chat ID, set it to the first chat (likely the default)
        if (!currentChatId && data.length > 0) {
          setCurrentChatId(data[0].id);
        } else if (currentChatId) {
          // Check if the currentChatId exists in the returned chats
          const chatExists = data.some((chat: { id: number }) => chat.id === currentChatId);
          if (!chatExists && data.length > 0) {
            // If not, reset to the first available chat
            setCurrentChatId(data[0].id);
          }
        }
      } else {
        console.error("Failed to fetch chats");
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const handleRevise = async (request: string) => {
    if (!summary) {
      alert("Please generate a summary first.");
      return;
    }

    setLoading(true);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/revise/${currentSessionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: request,
        }),
      }
    );

    if (!response.ok || !response.body) {
      throw new Error("Failed to connect to backend.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    setSummary("");

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      const chunk = decoder.decode(value, { stream: true });

      setSummary((prev) => prev + chunk);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!transcriptFile || !recordingFile) {
      alert("Please upload both transcript and recording files.");
      return;
    }

    const formData = new FormData();
    formData.append("transcript", transcriptFile);
    formData.append("recording", recordingFile);

    // Add additional context files if any
    additionalContextFiles.forEach(file => {
      formData.append("additional_context", file);
    });

    // Add the text context if provided
    if (additionalTextContext.trim()) {
      // Create a Blob from the text content with PDF MIME type
      const textBlob = new Blob([additionalTextContext], { type: 'application/pdf' });
      // Append it as a PDF file
      formData.append("additional_context", textBlob, "additional_context.pdf");

      // clear the text context
      setAdditionalTextContext("");
    }

    try {
      setSummary("");
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/summarize/${currentUserId}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to backend.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });

        const metaMatch = chunk.match(/\[SESSION_META::(.*)\]/);
        if (metaMatch) {
          const meta = JSON.parse(metaMatch[1]);
          setCurrentSessionId(meta.id);
          setCurrentChatId(meta.chat_id);
          const formattedMessages = meta.messages
            .filter((msg: { role: string; content: string }) => msg.role !== "system")
            .map((msg: { role: string; content: string }) => ({
              role: msg.role,
              content: msg.content
            }));
          setChatMessages(formattedMessages);
          continue;
        }

        setSummary((prev) => prev + chunk);
      }

      setShowChat(true);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Streaming error:", error);
      alert("Error while streaming summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !currentChatId) return;

    // Add user message to chat in a consistent format
    const userMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMessage]);

    const currentInput = chatInput;
    setChatInput("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/chat/${currentSessionId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: currentInput,
            chat_id: currentChatId
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to chat backend.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let accumulatedContent = "";

      // Add a placeholder message that will be updated with streaming content
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        // Update the assistant message with new content
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: accumulatedContent }
        ]);
      }
    } catch (error) {
      console.error("Chat streaming error:", error);
      alert("Error while streaming chat response.");
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/load_session/${sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(data.session_id);
        setSummary(data.summary);

        // Set the current chat to the default chat or first available
        if (data.chats && data.chats.length > 0) {
          setChats(data.chats);
          const defaultChat = data.chats.find((c: { name: string }) => c.name === "default");
          if (defaultChat) {
            setCurrentChatId(defaultChat.id);
          } else {
            setCurrentChatId(data.chats[0].id);
          }

          // Load the messages for the selected chat, ensuring they're in object format
          if (data.messages && Array.isArray(data.messages)) {
            const formattedMessages = data.messages
              .filter((msg: any) => msg.role !== "system")
              .map((msg: any) => {
                // Ensure proper object format
                if (typeof msg === 'object' && msg.role && typeof msg.content === 'string') {
                  return { role: msg.role, content: msg.content };
                }
                // Convert any non-conforming messages to a standard format
                return {
                  role: 'unknown',
                  content: typeof msg === 'object' ? JSON.stringify(msg) : String(msg || '')
                };
              });
            setChatMessages(formattedMessages);
          } else {
            setChatMessages([]);
          }
        } else {
          setChatMessages([]);
          setCurrentChatId(null);
        }

        setShowChat(true);
      } else {
        console.error("Failed to load session");
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  const loadChat = async (chatId: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/load_chat/${chatId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.messages) {
          // Ensure all messages have role and content properties
          const formattedMessages = data.messages.map((msg: any) => {
            // If it's already a properly formatted object, use it as is
            if (typeof msg === 'object' && msg.role && typeof msg.content === 'string') {
              return msg;
            }

            // For any other format, create a default structure
            // This is a fallback that should rarely be needed if API returns proper format
            return {
              role: 'unknown',
              content: typeof msg === 'object' ? JSON.stringify(msg) : String(msg || '')
            };
          });

          // Filter out system messages before setting
          setChatMessages(formattedMessages.filter((msg: { role: string; content: string }) => msg.role !== "system"));
          setCurrentChatId(chatId);
          setShowChat(true);
        }
      } else {
        console.error("Failed to load chat");
      }
    } catch (error) {
      console.error("Error loading chat:", error);
    }
  };

  const createNewChat = async () => {
    if (!currentSessionId || !newChatName.trim()) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create_chat/${currentSessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newChatName.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Close the create chat popup and reset the input
        setCreateChatOpen(false);
        setNewChatName("");

        // Fetch the new chat data
        const chatResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/load_chat/${data.chat_id}`);
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();

          // Update the chats list
          fetchChats(currentSessionId);

          // Set the current chat to the new one
          setCurrentChatId(data.chat_id);

          // Set chat messages and show the chat
          setChatMessages((chatData.messages || [])
            .filter((msg: { role: string; content: any }) => msg.role !== 'system')
            .map((msg: { role: string; content: any }) => ({
              role: msg.role,
              content: typeof msg.content === 'object' ? JSON.stringify(msg.content) : String(msg.content || '')
            })));
          setShowChat(true);
        }
      } else {
        console.error("Failed to create new chat");
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  const deleteChat = async (chatId: number) => {
    if (!currentSessionId) return;
    // Don't allow deleting the last chat in a session
    if (chats.length <= 1) {
      alert("Cannot delete the last chat in a session. Please create a new chat first.");
      return;
    }
    // temp fix
    // Don't allow deleting the default chat
    const chatToDelete = chats.find(chat => chat.id === chatId);
    if (chatToDelete && chatToDelete.name === "default") {
      alert("Cannot delete the default chat. Please create and use another chat if needed.");
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete_chat/${chatId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // If the deleted chat is the current one, clear the UI
        if (chatId === currentChatId) {
          // Find the first available chat ID from the list, or set to null if none exist
          const firstAvailableChat = chats.find(chat => chat.id !== chatId);
          setCurrentChatId(firstAvailableChat ? firstAvailableChat.id : null);
          if (firstAvailableChat) {
            loadChat(firstAvailableChat.id);
          } else {
            // If no chats remain, clear the UI
            setChatMessages([]);
            setShowChat(false);
          }
        }

        // Refresh the chat list
        fetchChats(currentSessionId);

        // Show success message
        setChatDeleted(true);
        setTimeout(() => {
          setChatDeleted(false);
        }, 3000);
      } else {
        console.error("Failed to delete chat");
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    }
  };

  const renameChat = async (chatId: number, newName: string) => {
    if (!newName.trim() || !currentSessionId) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rename_chat/${chatId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (response.ok) {
        // Refresh the chat list
        fetchChats(currentSessionId);

        // Show success message
        setChatRenamed(true);
        setTimeout(() => {
          setChatRenamed(false);
        }, 3000);
      } else {
        console.error("Failed to rename chat");
      }
    } catch (error) {
      console.error("Error renaming chat:", error);
    }
  };

  if (initializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 dark:bg-slate-600">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-6 w-6 text-blue-600"
            style={{ animationDuration: "0.5s" }}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              className="opacity-75"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              d="M12 4a8 8 0 018 8"
            />
          </svg>
          <p className="text-slate-800 dark:text-slate-100 font-semibold text-sm">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-600">
        <div className="bg-white dark:bg-slate-700 p-8 rounded-lg shadow-lg w-80 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-center text-slate-800 dark:text-white">
            Login to FAIR
          </h2>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100"
            placeholder="Enter your username"
          />
          <button
            onClick={async () => {
              if (!username.trim()) return;
              setLoginLoading(true);
              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ username }),
                });
                if (response.ok) {
                  const data = await response.json();
                  localStorage.setItem("user_id", data.user_id);
                  localStorage.setItem("username", username);
                  setCurrentUserId(data.user_id);
                  setShowPanel(false); // force it to be closed on login
                  setLoggedIn(true);
                } else {
                  alert("Login failed.");
                }
              } catch (error) {
                console.error("Login error:", error);
                alert("Login error.");
              } finally {
                setLoginLoading(false);
              }
            }}
            disabled={loginLoading}
            className="bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-bold disabled:opacity-50"
          >
            {loginLoading ? "Logging in..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen font-sans bg-slate-100 dark:bg-slate-600 py-5 px-6 sm:px-8 lg:px-16">
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${subscribed
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Subscribed to Session Successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${sessionRemoved
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Session Removed Successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${sessionDeleted
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Session Deleted Successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${sessionIDCopied
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Session ID Copied!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${sessionRenamed
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Session Renamed Successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${showSuccess
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Summary generated successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${summaryCopied
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Summary copied successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${summaryDownloaded
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Summary downloaded successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${chatRenamed
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Chat Renamed Successfully!
      </div>
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${chatDeleted
          ? "translate-y-6 opacity-100"
          : "-translate-y-full opacity-0"
          } bg-green-100 text-green-800 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-1`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={4}
          className="h-5 w-5 text-green-800"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        Chat Deleted Successfully!
      </div>
      <div
        id="side-panel"
        className={`fixed top-0 left-0 h-full w-56 bg-white dark:bg-slate-800 shadow-lg p-6 z-40 transform transition-transform duration-300 ${showPanel ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <button
          onClick={() => {
            setShowPanel(!showPanel);
            if (!showPanel) fetchSessions();
          }}
          className="absolute top-4 right-[-55px] bg-blue-600 text-white w-10 h-10 rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
          title={showPanel ? "Hide Panel" : "Show Panel"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <div className="flex items-start justify-start mb-4 w-full">
          <BurnesLogo />
        </div>
        <button
          onClick={async () => {
            setShowPanel(false);
            setTranscriptFile(null);
            setRecordingFile(null);
            setAdditionalContextFiles([]);
            setSummary("");
            setShowChat(false);
            setChatInput("");
            setChatMessages([]);
            setCurrentSessionId(null);
            setTab("newSummary");
            setRevisionWindow(false);
            setRevisionRequest("");
            localStorage.clear();
          }}
          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 mb-4 font-semibold"
        >
          <span className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Session
          </span>
        </button>
        <div className="flex flex-col gap-1 h-1/2">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            My Sessions
          </h2>
          <div
            className="overflow-y-auto h-[calc(100vh)] pr-1"
            style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
          >
            <ul className="space-y-1 text-slate-800 dark:text-slate-100">
              {[...sessions].reverse().map(
                (session) =>
                  session.creator_id === currentUserId && (
                    <li
                      key={session.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedSessionInfo({
                          id: session.id,
                          creator_id: session.creator_id,
                          name: session.name
                        });
                        setContextMenu({
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                        });
                      }}
                      className={`flex justify-between items-center truncate group cursor-pointer ${session.id === currentSessionId
                        ? "bg-gray-300 dark:bg-gray-900 rounded-lg"
                        : ""
                        }`}
                    >
                      <span
                        className={`flex-1 truncate text-sm p-2 rounded-lg ${session.id !== currentSessionId
                          ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                          : ""
                          }`}
                        onClick={() => {
                          loadSession(session.id);
                          setShowPanel(false);
                        }}
                      >
                        {session.name.split(":")[1]?.trim() || session.name}
                      </span>
                    </li>
                  )
              )}
            </ul>
          </div>
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-100">
            Subscribed Sessions
          </h2>
          <div
            className="overflow-y-auto h-[calc(100vh-400px)] pr-1"
            style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
          >
            <ul className="space-y-1 text-slate-800 dark:text-slate-100">
              {[...sessions].reverse().map(
                (session) =>
                  session.creator_id !== currentUserId && (
                    <li
                      key={session.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedSessionInfo({
                          id: session.id,
                          creator_id: session.creator_id,
                          name: session.name
                        });
                        setContextMenu({
                          mouseX: e.clientX,
                          mouseY: e.clientY,
                        });
                      }}
                      className={`flex justify-between items-center truncate group cursor-pointer ${session.id === currentSessionId
                        ? "bg-gray-300 dark:bg-gray-900 rounded-lg"
                        : ""
                        }`}
                    >
                      <span
                        className={`flex-1 truncate text-sm p-2 rounded-lg ${session.id !== currentSessionId
                          ? "hover:bg-gray-100 dark:hover:bg-gray-700"
                          : ""
                          }`}
                        onClick={() => {
                          loadSession(session.id);
                          setShowPanel(false);
                        }}
                      >
                        {session.name.split(":")[1]?.trim() || session.name}
                      </span>
                    </li>
                  )
              )}
            </ul>
          </div>
        </div>
      </div>
      <div
        className={`max-w-screen-xl mx-auto flex gap-10 h-full transition-all duration-700 ease-in-out ${showChat
          ? "flex-col lg:flex-row"
          : "flex-col items-center justify-center"
          }`}
      >
        {loggedIn && (
          <div className="absolute top-4 right-6 z-50">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="profile-button w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shadow-md"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </button>

            {profileMenuOpen && (
              <div className="profile-menu absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2 z-50">
                <div className="text-center px-4 py-1 text-sm font-semibold text-slate-800 dark:text-white">
                  {username}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                <button
                  onClick={() => {
                    setLoggedIn(false);
                    setCurrentUserId(null);
                    setUsername("");
                    setTranscriptFile(null);
                    setRecordingFile(null);
                    setAdditionalContextFiles([]);
                    setSummary("");
                    setShowChat(false);
                    setChatInput("");
                    setChatMessages([]);
                    setCurrentSessionId(null);
                    setRevisionWindow(false);
                    setRevisionRequest("");
                    setTab("newSummary");
                    setProfileMenuOpen(false);
                    localStorage.clear();
                  }}
                  className="w-full text-left px-4 py-2 text-sm font-semibold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
                >
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-4 w-4 mr-2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="lg:w-1/2 h-full">
          <div
            className={`relative bg-white dark:bg-slate-800 p-8 shadow rounded-lg transition-all duration-500 flex flex-col h-full ${loading ? "animate-[pulse-border_2s_infinite]" : ""
              }`}
          >
            <div
              className={`relative flex justify-between items-center w-full mb-6`}
            >
              {summary && (
                <div>
                  <button
                    onClick={() => {
                      setRevisionWindow(!revisionWindow);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm font-semibold"
                  >
                    Revise
                  </button>
                </div>
              )}
              {summary && (
                <div className="absolute left-1/2 transform -translate-x-1/2">
                  <h1
                    className={`font-semibold text-slate-800 dark:text-slate-100 text-2xl`}
                  >
                    Interview Summary
                  </h1>
                </div>
              )}
              {!summary && (
                <div className="text-center px-6 py-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-4">
                    Fast AI-Assisted
                    <br />
                    Investigation & Review
                  </h1>
                  <div className="text-left max-w-2xl mx-auto text-slate-600 dark:text-white text-lg space-y-4">
                    <p>
                      <strong>FAIR</strong> makes it easy to get the most out of
                      your interviews by offering concise but thorough summaries
                      alongside an AI assistant to identify key case details and
                      explore them further.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        <strong>Generate a New Summary</strong>: Upload the
                        interview transcript, audio or video recording, and any
                        relevant documentation.
                      </li>
                      <li>
                        <strong>Add an Existing Summary</strong>: Subscribe to a
                        session by selecting the interviewee&apos;s name.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
              {summary && (
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        "The following summary was generated with AI:\n\n" +
                        "Session ID: " + currentSessionId + "\n\n" +
                        summary
                      );
                      setSummaryCopied(true);
                      setTimeout(() => {
                        setSummaryCopied(false);
                      }, 3000);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
                    title="Copy"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-3 w-3"
                    >
                      <path d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                  </button>
                  <button
                    onClick={async () => {
                      const doc = new Document({
                        sections: [
                          {
                            properties: {},
                            children: (
                              "The following summary was generated with AI:\n\n" +
                              "Session ID: " + currentSessionId + "\n\n" +
                              summary
                            )
                              .split("\n")
                              .map(
                                (line) =>
                                  new Paragraph({
                                    children: [new TextRun(line)],
                                  })
                              ),
                          },
                        ],
                      });

                      const blob = await Packer.toBlob(doc);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "summary.docx";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);

                      setSummaryDownloaded(true);
                      setTimeout(() => {
                        setSummaryDownloaded(false);
                      }, 3000);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
                    title="Download"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-3 w-3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div
              className="overflow-y-auto flex-1"
              style={{ scrollbarWidth: "thin", msOverflowStyle: "auto" }}
            >
              {!summary && (
                <>
                  <div className="">
                    <div className="flex border-b border-slate-300 dark:border-slate-600">
                      <button
                        onClick={() => setTab("newSummary")}
                        className={`flex-1 px-4 py-2 font-semibold ${tab === "newSummary"
                          ? "border-b-2 border-blue-600 text-blue-600"
                          : "text-slate-600 dark:text-slate-100"
                          }`}
                      >
                        Generate New Summary
                      </button>
                      <button
                        onClick={() => {
                          setTab("existingSummary");
                          fetchAllSessions(); // make sure dropdown will be up to date
                        }}
                        className={`flex-1 px-4 py-2 font-semibold ${tab === "existingSummary"
                          ? "border-b-2 border-blue-600 text-blue-600"
                          : "text-slate-600 dark:text-slate-100"
                          }`}
                      >
                        Add Existing Summary
                      </button>
                    </div>
                    <div className="mt-2 bg-slate-100 dark:bg-slate-700 p-4 rounded-lg text-slate-800 dark:text-slate-100 flex-1 overflow-y-auto">
                      {tab === "newSummary" ? (
                        <div className="flex justify-center gap-6 flex-wrap">
                          <div className="flex-1 min-w-[220px]">
                            <label className="block text-md font-semibold text-slate-800 dark:text-slate-100 mb-1">
                              Transcript (.docx) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept=".docx"
                                id="transcriptUpload"
                                className="hidden"
                                onChange={(e) =>
                                  setTranscriptFile(e.target.files?.[0] || null)
                                }
                              />
                              <label
                                htmlFor="transcriptUpload"
                                className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg"
                              >
                                Choose File
                              </label>
                              <span className="text-slate-800 dark:text-slate-100 text-sm font-light">
                                {transcriptFile
                                  ? transcriptFile.name
                                  : "No file chosen"}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[220px]">
                            <label className="block text-md font-semibold text-slate-800 dark:text-slate-100 mb-1">
                              Recording (.mp4) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="file"
                                accept=".mp4"
                                id="recordingUpload"
                                className="hidden"
                                onChange={(e) =>
                                  setRecordingFile(e.target.files?.[0] || null)
                                }
                              />
                              <label
                                htmlFor="recordingUpload"
                                className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg"
                              >
                                Choose File
                              </label>
                              <span className="text-slate-800 dark:text-slate-100 text-sm font-light">
                                {recordingFile
                                  ? recordingFile.name
                                  : "No file chosen"}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-[220px]">
                            <label className="block text-md font-semibold text-slate-800 dark:text-slate-100 mb-1">
                              Additional Context (.pdf) - Optional
                            </label>
                            <div className="flex gap-2 mb-2">
                              <div
                                className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-2 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition flex-1"
                                onClick={() => document.getElementById("contextUpload")?.click()}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const files = e.dataTransfer.files;
                                  if (files && files.length > 0) {
                                    const pdfFiles = Array.from(files).filter(file => file.name.toLowerCase().endsWith('.pdf'));
                                    if (pdfFiles.length > 0) {
                                      setAdditionalContextFiles(prev => [...prev, ...pdfFiles]);
                                      console.log("Files added via drop:", pdfFiles.map(f => f.name));
                                    }
                                  }
                                }}
                              >
                                <input
                                  type="file"
                                  accept=".pdf"
                                  id="contextUpload"
                                  className="hidden"
                                  onChange={(e) => {
                                    const files = e.target.files;
                                    if (files && files.length > 0) {
                                      const newFile = files[0];
                                      console.log("File selected:", newFile.name);
                                      setAdditionalContextFiles(prev => [...prev, newFile]);
                                      // Reset the input so the same file can be selected again
                                      e.target.value = '';
                                    }
                                  }}
                                />
                                <div className="flex flex-col items-center justify-center text-blue-600 dark:text-blue-400">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                  <p className="text-sm">Drag & drop PDF files here or click to browse</p>
                                </div>
                              </div>

                              <button
                                onClick={() => setTextContextPopupOpen(true)}
                                className="bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg flex items-center"
                                title="Add text context"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            </div>

                            {additionalContextFiles.length > 0 && (
                              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                {additionalContextFiles.map((file, index) => {
                                  console.log(`Rendering file ${index}:`, file?.name);
                                  return (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-slate-600 rounded shadow-sm">
                                      <div className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs truncate max-w-[150px]" title={file?.name || ""}>
                                          {file?.name || "Unknown file"}
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setAdditionalContextFiles(prev => prev.filter((_, i) => i !== index));
                                        }}
                                        className="text-gray-500 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-bold"
                          >
                            {loading
                              ? "Generating summary..."
                              : "Generate Summary"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-5 mt-5 py-1 h-full w-full">
                          <input
                            type="number"
                            placeholder="Session ID"
                            value={subscribeSessionId}
                            onChange={(e) =>
                              setSubscribeSessionId(e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                          />

                          <div className="relative" ref={dropdownRef}>
                            <div
                              onClick={() => setDropdownOpen(!dropdownOpen)}
                              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white cursor-pointer flex justify-between items-center"
                            >
                              <input
                                type="text"
                                placeholder="Search or select a session"
                                value={searchSessionInput}
                                onChange={(e) => {
                                  setSearchSessionInput(e.target.value);
                                  if (!dropdownOpen) setDropdownOpen(true);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDropdownOpen(true);
                                }}
                                className="bg-transparent border-none outline-none w-full text-slate-800 dark:text-white"
                              />
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d={dropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                                />
                              </svg>
                            </div>

                            {dropdownOpen && (
                              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {allSessions
                                  .filter(
                                    (session) =>
                                      !sessions.some(
                                        (userSession) => userSession.id === session.id
                                      ) &&
                                      session.name.toLowerCase().includes(searchSessionInput.toLowerCase())
                                  )
                                  .map((session) => (
                                    <div
                                      key={session.id}
                                      className="px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer text-slate-800 dark:text-white"
                                      onClick={() => {
                                        setSubscribeSessionId(session.id.toString());
                                        setSearchSessionInput(session.name);
                                        setDropdownOpen(false);
                                      }}
                                    >
                                      {session.name}
                                    </div>
                                  ))}
                                {allSessions.filter(
                                  (session) =>
                                    !sessions.some(
                                      (userSession) => userSession.id === session.id
                                    ) &&
                                    session.name.toLowerCase().includes(searchSessionInput.toLowerCase())
                                ).length === 0 && (
                                    <div className="px-2 py-1 text-slate-500 dark:text-slate-400">
                                      No matching sessions
                                    </div>
                                  )}
                              </div>
                            )}
                          </div>

                          <button
                            onClick={async () => {
                              if (!subscribeSessionId || !currentUserId) return;
                              if (Number(subscribeSessionId) <= 0) {
                                alert("Invalid session ID.");
                                return;
                              }
                              if (
                                sessions.some(
                                  (s) => s.id === Number(subscribeSessionId)
                                )
                              ) {
                                alert(
                                  "You are already subscribed to this session."
                                );
                                return;
                              }
                              try {
                                const response = await fetch(
                                  `${process.env.NEXT_PUBLIC_API_URL}/subscribe/${currentUserId}/${Number(
                                    subscribeSessionId
                                  )}`,
                                  {
                                    method: "POST",
                                  }
                                );
                                if (response.ok) {
                                  fetchSessions();
                                } else {
                                  console.error(
                                    "Failed to subscribe to session"
                                  );
                                }
                              } catch (error) {
                                console.error(
                                  "Error subscribing to session:",
                                  error
                                );
                              } finally {
                                setSubscribeSessionId("");
                                setSearchSessionInput("");
                                setSubscribed(true);
                                setTimeout(() => {
                                  setSubscribed(false);
                                }, 3000);
                              }
                            }}
                            className="w-full px-3 py-2 bg-blue-600 text-white text-base font-bold rounded-lg hover:bg-blue-700"
                          >
                            Subscribe
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {summary && (
                <div
                  className={`transition-all duration-700 ease-in-out ${summary
                    ? "opacity-100 max-h-[1000px]"
                    : "opacity-0 max-h-0 overflow-hidden"
                    }`}
                >
                  <div className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-6 py-3">
                    <MarkdownPreview
                      source={summary}
                      style={{
                        backgroundColor: "transparent",
                        color: isDarkMode ? "white" : "black",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showChat && (
          <div className="lg:w-1/2 h-full overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-lg shadow flex flex-col relative">
            <div className="relative flex mb-5">
              {/* Absolute positioned chat dropdown */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10" ref={chatDropdownRef}>
                <button
                  onClick={() => setChatDropdownOpen(!chatDropdownOpen)}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 font-semibold"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.862 9.862 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <span className="max-w-[120px] truncate font-semibold">
                    {chats.find(chat => chat.id === currentChatId)?.name || "Chat"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={chatDropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                    />
                  </svg>
                </button>

                {chatDropdownOpen && (
                  <div className="absolute z-50 left-0 mt-1 w-48 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {chats.map(chat => (
                      <button
                        key={chat.id}
                        className={`w-full text-left px-3 py-2 hover:bg-blue-50 dark:hover:bg-slate-600 ${chat.id === currentChatId ? "bg-blue-50 dark:bg-slate-600" : ""
                          }`}
                        onClick={() => {
                          loadChat(chat.id);
                          setChatDropdownOpen(false);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setSelectedChatInfo({
                            id: chat.id,
                            name: chat.name
                          });
                          setChatContextMenu({
                            mouseX: e.clientX,
                            mouseY: e.clientY,
                          });
                        }}
                      >
                        <span className="truncate font-medium text-slate-800 dark:text-white">
                          {chat.name}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-slate-200 dark:border-slate-600 my-1"></div>
                    <button
                      className="w-full text-left px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-600 flex items-center font-semibold"
                      onClick={() => {
                        setChatDropdownOpen(false);
                        setCreateChatOpen(true);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      New Chat
                    </button>
                  </div>
                )}
              </div>

              {/* Centered title */}
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 w-full text-center">
                Chat with Assistant
              </h2>
            </div>

            {/* Rest of the chat UI remains the same */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto scrollbar-none mb-4 bg-slate-100 dark:bg-slate-700 p-4 rounded-lg flex flex-col-reverse gap-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {[...chatMessages].reverse().map((msg, idx) => {
                const isUser = msg.role === 'user';
                const messageText = msg.content || '';

                return (
                  <div
                    key={idx}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg text-sm max-w-[90%] ${isUser
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white"
                        }`}
                    >
                      {isUser ? (
                        messageText
                      ) : (
                        <MarkdownPreview
                          source={messageText}
                          style={{
                            backgroundColor: "transparent",
                            margin: 0,
                            color: isDarkMode ? "white" : "black",
                            fontSize: "0.875rem", // Tailwind's text-sm equivalent
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleChatSubmit();
                  }
                }}
                className="flex-1 rounded-lg px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100"
                placeholder="Message FAIR"
              />
              <button
                onClick={handleChatSubmit}
                className="bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center antialiased"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
            {revisionWindow && (
              <div className="absolute inset-0 bg-white dark:bg-slate-800 bg-opacity-40 z-10 flex items-center justify-center rounded-lg">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-full h-full relative z-20">
                  <div className="relative mb-3">
                    <button
                      onClick={() => {
                        handleRevise("revert to original summary");
                        setRevisionWindow(false);
                        setRevisionRequest("");
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-700"
                      title="Revert to Original"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setInfoPopupOpen(true)}
                      className="absolute right-0 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700"
                      title="Prompt Writing Tips"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        className="h-6 w-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <h1 className="font-semibold text-slate-800 dark:text-slate-100 text-2xl text-center py-2">
                      Request a Revision
                    </h1>
                  </div>
                  <textarea
                    placeholder="Enter your revision request here..."
                    className="w-full h-32 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-4"
                    onChange={(e) => setRevisionRequest(e.target.value)}
                    value={revisionRequest}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      className="font-semibold px-4 py-2 bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                      onClick={() => {
                        setRevisionWindow(false);
                        setRevisionRequest("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                      onClick={() => {
                        handleRevise(revisionRequest);
                        setRevisionWindow(false);
                        setRevisionRequest("");
                      }}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {contextMenu && (
        <div
          className="context-menu absolute z-50 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-xs font-semibold flex flex-col space-y-0.5 p-1"
          style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
        >
          <button
            className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
            onClick={() => {
              navigator.clipboard.writeText(
                selectedSessionInfo
                  ? selectedSessionInfo.id.toString()
                  : "No Session ID"
              );
              setSessionIDCopied(true);
              setTimeout(() => {
                setSessionIDCopied(false);
              }, 3000);
            }}
          >
            Copy ID
          </button>
          {selectedSessionInfo && selectedSessionInfo.creator_id === currentUserId && (
            <button className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
              onClick={() => {
                setRenamePopupOpen(true);
                setContextMenu(null);
              }}>
              Rename
            </button>
          )}
          <button
            className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
            onClick={async () => {
              if (selectedSessionInfo !== null) {
                try {
                  const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/unsubscribe/${currentUserId}/${selectedSessionInfo.id}`,
                    { method: "DELETE" }
                  );
                  if (response.ok) {
                    if (selectedSessionInfo.id === currentSessionId) {
                      setTranscriptFile(null);
                      setRecordingFile(null);
                      setAdditionalContextFiles([]);
                      setSummary("");
                      setShowChat(false);
                      setChatInput("");
                      setChatMessages([]);
                      setCurrentSessionId(null);
                    }
                    fetchSessions();
                  } else {
                    console.error("Failed to delete session");
                  }
                } catch (error) {
                  console.error("Error deleting session:", error);
                }
              }
              setContextMenu(null);
              setSessionRemoved(true);
              setTimeout(() => {
                setSessionRemoved(false);
              }, 3000);
            }}
          >
            Remove
          </button>
          {selectedSessionInfo && selectedSessionInfo.creator_id === currentUserId && (
            <button
              className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
              onClick={() => {
                setDeleteConfirmOpen(true);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50">
          <div ref={deleteConfirmRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Confirm Deletion</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Are you sure you want to delete this session? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="font-semibold px-4 py-2 bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setSelectedSessionInfo(null);
                }}
              >
                Cancel
              </button>
              <button
                className="font-semibold px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                onClick={async () => {
                  if (selectedSessionInfo !== null) {
                    try {
                      const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/delete_session/${selectedSessionInfo.id}`,
                        { method: "DELETE" }
                      );
                      if (response.ok) {
                        if (selectedSessionInfo.id === currentSessionId) {
                          setTranscriptFile(null);
                          setRecordingFile(null);
                          setAdditionalContextFiles([]);
                          setSummary("");
                          setShowChat(false);
                          setChatInput("");
                          setChatMessages([]);
                          setCurrentSessionId(null);
                        }
                        fetchSessions();
                      } else {
                        console.error("Failed to delete session");
                      }
                    } catch (error) {
                      console.error("Error deleting session:", error);
                    }
                  }
                  setDeleteConfirmOpen(false);
                  setSelectedSessionInfo(null);
                  setSessionDeleted(true);
                  setTimeout(() => {
                    setSessionDeleted(false);
                  }, 3000);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {infoPopupOpen && (
        <div className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50">
          <div ref={infoPopupRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">How to Write Effective Revision Prompts</h2>
              <button
                onClick={() => setInfoPopupOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="text-slate-700 dark:text-slate-300 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <p className="font-semibold">Writing effective prompts will yield better summaries. Here are some guidelines:</p>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Be Specific</h3>
                <p>Clearly state what aspects of the interview you want to focus on or improve in the summary.</p>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Please revise the summary to highlight the interviewee&apos;s statements about their work experience in healthcare.&quot;
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Specify Format</h3>
                <p>If you need a particular format, mention it explicitly.</p>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Restructure the summary as bullet points organized by topic area.&quot;
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Indicate Length</h3>
                <p>Mention if you need a shorter or more detailed summary.</p>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Please provide a more concise summary, around 250 words.&quot;
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Highlight Important Elements</h3>
                <p>Specify if certain parts of the interview need emphasis.</p>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Focus more on the timeline of events described between 15:30-20:45 in the recording.&quot;
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Express Tone Preferences</h3>
                <p>Indicate if you need a particular tone in the summary.</p>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Please use more objective language in describing the witness&apos;s account.&quot;
                </p>
              </div>

              <div>
                <h3 className="font-bold text-slate-800 dark:text-white mb-1">Sample Complete Prompt</h3>
                <p className="text-sm bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 italic">
                  &quot;Please revise the summary to create a chronological timeline of events described by the interviewee. Focus particularly on any discrepancies in their account of what happened on March 12th. Include direct quotes where relevant and keep the summary around 400-500 words.&quot;
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                onClick={() => setInfoPopupOpen(false)}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {renamePopupOpen && (
        <div className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50">
          <div ref={renamePopupRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Rename Session</h2>
              <button
                onClick={() => setRenamePopupOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <input
              type="text"
              placeholder={selectedSessionInfo?.name}
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-4"
            />

            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                onClick={() => {
                  if (selectedSessionInfo !== null && newSessionName.trim()) {
                    // Implement the logic to rename the session
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/rename_session/${selectedSessionInfo.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: newSessionName.trim() })
                    })
                      .then(response => {
                        if (response.ok) {
                          fetchSessions();
                          setSessionRenamed(true);
                          setTimeout(() => {
                            setSessionRenamed(false);
                          }, 3000);
                        } else {
                          console.error("Failed to rename session");
                        }
                      })
                      .catch(error => {
                        console.error("Error renaming session:", error);
                      });

                    setRenamePopupOpen(false);
                    setNewSessionName("");
                  }
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {textContextPopupOpen && (
        <div
          className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50"
          onClick={() => setTextContextPopupOpen(false)}
        >
          <div
            ref={textContextPopupRef}
            className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Add Text Context</h2>
              <button
                onClick={() => setTextContextPopupOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-slate-600 dark:text-slate-300 mb-2">
                Enter any additional context or notes that may be relevant to the interview:
              </p>
              <textarea
                value={additionalTextContext}
                onChange={(e) => setAdditionalTextContext(e.target.value)}
                className="w-full h-64 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                placeholder="Enter additional context, notes, or background information here..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 font-semibold"
                onClick={() => setTextContextPopupOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                onClick={() => setTextContextPopupOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Chat Popup */}
      {createChatOpen && (
        <div className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50">
          <div ref={createChatRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Create New Chat</h2>
            <input
              type="text"
              placeholder="Enter chat name"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setCreateChatOpen(false);
                  setNewChatName("");
                }}
                className="font-semibold px-3 py-1 bg-gray-300 dark:bg-gray-600 text-slate-800 dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={createNewChat}
                className="font-semibold px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Context Menu */}
      {chatContextMenu && (
        <div
          className="chat-context-menu absolute z-50 bg-white dark:bg-slate-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg text-xs font-semibold flex flex-col space-y-0.5 p-1"
          style={{ top: chatContextMenu.mouseY, left: chatContextMenu.mouseX }}
        >
          <button
            className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
            onClick={() => {
              setRenameChatPopupOpen(true);
              setChatContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="text-left px-4 py-1 hover:bg-blue-500 hover:text-white rounded-md"
            onClick={() => {
              if (selectedChatInfo) {
                // Don't allow deleting the default chat if it's the only one
                if (selectedChatInfo.name === "default" && chats.length === 1) {
                  alert("Cannot delete the default chat when it's the only one.");
                  setChatContextMenu(null);
                  setSelectedChatInfo(null);
                  return;
                }
                deleteChat(selectedChatInfo.id);
              }
              setChatContextMenu(null);
              setSelectedChatInfo(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Rename Chat Popup */}
      {renameChatPopupOpen && (
        <div className="fixed inset-0 backdrop-blur-xl bg-white/30 dark:bg-slate-900/30 flex items-center justify-center z-50">
          <div ref={renameChatPopupRef} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Rename Chat</h2>
              <button
                onClick={() => setRenameChatPopupOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <input
              type="text"
              placeholder={selectedChatInfo?.name}
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white mb-4"
            />

            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                onClick={() => {
                  if (selectedChatInfo !== null && newChatName.trim()) {
                    renameChat(selectedChatInfo.id, newChatName.trim());
                    setRenameChatPopupOpen(false);
                    setNewChatName("");
                  }
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
