"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<string[]>([]);

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
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          assistantMessage,
        ]);
      }
    } catch (error) {
      console.error("Chat streaming error:", error);
      alert("Error while streaming chat response.");
    }
  };

  return (
    <div className="min-h-screen font-sans bg-slate-100 dark:bg-slate-600 py-10 px-6 sm:px-8 lg:px-16">
      <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row gap-10">
        <div className="lg:w-1/2 bg-slate-50 dark:bg-slate-700 p-8 shadow rounded-lg">
          <h1 className="text-2xl font-semibold mb-6 text-center text-slate-800 dark:text-slate-100">
            Interview Summarizer
          </h1>

          <div className="flex justify-center gap-6 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Transcript (.docx)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".docx"
                  id="transcriptUpload"
                  className="hidden"
                  onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="transcriptUpload"
                  className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg"
                >
                  Choose File
                </label>
                <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                  {transcriptFile ? transcriptFile.name : "No file chosen"}
                </span>
              </div>
            </div>

            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                Recording (.mp4)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".mp4"
                  id="recordingUpload"
                  className="hidden"
                  onChange={(e) => setRecordingFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="recordingUpload"
                  className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-lg"
                >
                  Choose File
                </label>
                <span className="text-slate-800 dark:text-slate-100 text-sm font-medium">
                  {recordingFile ? recordingFile.name : "No file chosen"}
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

          {summary && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Summary</h2>
              <div className="prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 dark:prose-invert max-w-none bg-slate-100 dark:bg-slate-700 px-6 py-4 rounded-lg text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {showChat && (
          <div className="lg:w-1/2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100 text-center">Chat with Assistant</h2>
            {chatMessages.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2 mb-4 bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                {chatMessages.map((msg, idx) => {
                  const isUser = msg.startsWith("You:");
                  const messageText = msg.replace(/^You:\s*/, "").replace(/^Assistant:\s*/, "");
                  return (
                    <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <div className={`inline-block px-4 py-2 rounded-lg text-sm max-w-[90%] ${
                        isUser
                          ? "bg-blue-600 text-white rounded-lg"
                          : "bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-white rounded-lg"
                      }`}>
                        {isUser ? (
                          messageText
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {messageText}
                          </ReactMarkdown>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center antialiased"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}