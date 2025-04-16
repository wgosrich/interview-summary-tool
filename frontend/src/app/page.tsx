"use client";
import { useState, useRef, useEffect } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import BurnesLogo from "@/images/burnes_logo";
import { Document, Packer, Paragraph, TextRun } from "docx";

export default function Home() {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPanel) {
        setShowPanel(false);
      }
      if (e.key === "Tab" && !showPanel) {
        e.preventDefault();
        setShowPanel(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPanel]);
  const [sessions, setSessions] = useState<{ id: number; name: string }[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);

  const fetchSessions = async () => {
    try {
      const response = await fetch("http://localhost:8000/get_sessions");
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

  const handleSaveSession = async () => {
    try {
      const saveResponse = await fetch("http://localhost:8000/save_session", {
        method: "POST",
      });

      if (!saveResponse.ok) {
        if (saveResponse.statusText === "Session already in progress") {
          alert("Press new session to reset system.");
        } else {
          console.error("Failed to save session.");
        }
      } else {
        const data = await saveResponse.json();
        console.log("Session saved:", data.session_id);
      }
    } catch (saveError) {
      console.error("Error saving session:", saveError);
    }
  };

  const handleSubmit = async () => {
    if (!transcriptFile || !recordingFile) {
      alert("Please upload both transcript and recording files.");
      return;
    }

    const formData = new FormData();
    formData.append("transcript", transcriptFile);
    formData.append("recording", recordingFile);

    try {
      setSummary("");
      setLoading(true);

      const response = await fetch("http://localhost:8000/summarize", {
        method: "POST",
        body: formData,
      });

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
        setSummary((prev) => prev + chunk);
      }

      setShowChat(true);
      setShowSuccess(true);
      handleSaveSession();
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
    if (!chatInput.trim()) return;
    const userMessage = `You: ${chatInput}`;
    setChatMessages((prev) => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput("");

    try {
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to connect to chat backend.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantMessage = "Assistant: ";

      // Add a placeholder message to avoid UI jump
      setChatMessages((prev) => [...prev, assistantMessage]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage += chunk;
        setChatMessages((prev) => [...prev.slice(0, -1), assistantMessage]);
      }

      // save session after chat
      handleSaveSession();
    } catch (error) {
      console.error("Chat streaming error:", error);
      alert("Error while streaming chat response.");
    }
  };

  const loadSession = async (sessionId: number) => {
    try {
      const response = await fetch(
        `http://localhost:8000/load_session/${sessionId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCurrentSessionId(data.session_id);
        setSummary(data.summary);
        const loadedMessages = (data.messages || []).slice(3);
        const formattedMessages = loadedMessages.map(
          (msg: { role: string; content: string }) => {
            return msg.role === "user"
              ? `You: ${msg.content}`
              : `Assistant: ${msg.content}`;
          }
        );
        setChatMessages(formattedMessages);
        setShowChat(true);
      } else {
        console.error("Failed to load session");
      }
    } catch (error) {
      console.error("Error loading session:", error);
    }
  };

  return (
    <div className="h-screen font-sans bg-slate-100 dark:bg-slate-600 py-10 px-6 sm:px-8 lg:px-16">
      <div
        className={`fixed top-0 left-1/2 transform -translate-x-1/2 transition-transform duration-500 ease-in-out z-50 ${
          showSuccess
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
        className={`fixed top-0 left-0 h-full w-56 bg-white dark:bg-slate-800 shadow-lg p-6 z-40 transform transition-transform duration-300 ${
          showPanel ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => {
            setShowPanel(!showPanel);
            if (!showPanel) fetchSessions();
          }}
          className="absolute top-4 right-[-50px] bg-blue-600 text-white w-10 h-10 rounded-full shadow-lg hover:bg-blue-700 flex items-center justify-center"
          title={showPanel ? "Hide Panel" : "Show Panel"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={showPanel ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
        <div className="flex items-start justify-start mb-4 w-full">
          <BurnesLogo />
        </div>
        <button
          onClick={async () => {
            try {
              const response = await fetch(
                "http://localhost:8000/new_session",
                {
                  method: "POST",
                }
              );
              if (response.ok) {
                setTranscriptFile(null);
                setRecordingFile(null);
                setSummary("");
                setShowChat(false);
                setChatInput("");
                setChatMessages([]);
                setCurrentSessionId(null);
                await fetchSessions();
              } else {
                console.error("Failed to create new session.");
              }
            } catch (error) {
              console.error("Error creating new session:", error);
            }
          }}
          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 mb-4 font-semibold"
        >
          + New Session
        </button>
        <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">
          Sessions
        </h2>
        <div
          className="overflow-y-auto h-[calc(100vh-260px)] pr-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <ul className="space-y-1 text-slate-800 dark:text-slate-100">
            {[...sessions].reverse().map((session) => (
              <li
                key={session.id}
                className="flex justify-between items-center truncate group"
              >
                <span
                  className="cursor-pointer flex-1 truncate text-sm hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded"
                  onClick={() => loadSession(session.id)}
                >
                  {session.name}
                </span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const response = await fetch(
                        `http://localhost:8000/delete_session/${session.id}`,
                        {
                          method: "DELETE",
                        }
                      );
                      if (response.ok) {
                        if (session.id === currentSessionId) {
                          const newSessionRes = await fetch(
                            "http://localhost:8000/new_session",
                            { method: "POST" }
                          );
                          if (newSessionRes.ok) {
                            setTranscriptFile(null);
                            setRecordingFile(null);
                            setSummary("");
                            setShowChat(false);
                            setChatInput("");
                            setChatMessages([]);
                            setCurrentSessionId(null);
                            await fetchSessions();
                          }
                        }
                        fetchSessions();
                      } else {
                        console.error("Failed to delete session");
                      }
                    } catch (error) {
                      console.error("Error deleting session:", error);
                    }
                  }}
                  className="text-red-600 hover:text-red-800 ml-2 text-sm font-bold"
                  title="Delete session"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={`max-w-screen-xl mx-auto flex gap-10 py-1 h-full transition-all duration-700 ease-in-out ${
          showChat
            ? "flex-col lg:flex-row"
            : "flex-col items-center justify-center"
        }`}
      >
        <div className="lg:w-1/2 h-full">
          <div
            className={`relative bg-slate-50 dark:bg-slate-700 p-8 shadow rounded-lg transition-all duration-500 flex flex-col h-full ${
              loading ? "animate-[pulse-border_2s_infinite]" : ""
            }`}
          >
            <div className="relative flex justify-between items-center w-full mb-6">
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                  Interview Summary
                </h1>
              </div>
              <div
                className={`ml-auto flex gap-2 ${
                  summary === "" ? "hidden" : ""
                }`}
              >
                <button
                  onClick={() => navigator.clipboard.writeText(summary)}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
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
                          children: summary.split("\n").map(
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
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
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
            </div>
            <div
              className="overflow-y-auto flex-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {!summary && (
                <>
                  <div className="flex justify-center gap-6 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <label className="block text-md font-semibold text-slate-800 dark:text-slate-100 mb-1">
                        Transcript (.docx)
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
                        Recording (.mp4)
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
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-2 px-4 mt-6 bg-blue-600 text-slate-100 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-bold"
                  >
                    {loading ? "Generating summary..." : "Generate Summary"}
                  </button>
                </>
              )}
              {summary && (
                <div className="prose prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2 dark:prose-invert max-w-none bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">
                  <div className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg px-6 py-3">
                    <MarkdownPreview
                      source={summary}
                      style={{ backgroundColor: "transparent" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showChat && (
          <div className="lg:w-1/2 h-full overflow-hidden bg-white dark:bg-slate-800 p-8 rounded-lg shadow flex flex-col">
            <h2 className="text-2xl font-semibold mb-5 text-slate-800 dark:text-slate-100 text-center">
              Chat with Assistant
            </h2>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto scrollbar-none mb-4 bg-slate-100 dark:bg-slate-700 p-4 rounded-lg flex flex-col-reverse gap-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {[...chatMessages].reverse().map((msg, idx) => {
                const isUser = msg.startsWith("You:");
                const messageText = msg
                  .replace(/^You:\s*/, "")
                  .replace(/^Assistant:\s*/, "");

                return (
                  <div
                    key={idx}
                    className={`flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`inline-block px-4 py-2 rounded-lg text-sm max-w-[90%] ${
                        isUser
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
                            margin: 0, // normalize spacing
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
          </div>
        )}
      </div>
    </div>
  );
}
