"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [recordingFile, setRecordingFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);

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
    } catch (error) {
      console.error("Streaming error:", error);
      alert("Error while streaming summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-600 py-10 px-6 sm:px-8 lg:px-16">
      <div className="max-w-3xl mx-auto bg-slate-50 dark:bg-slate-700 p-8 shadow rounded-lg">
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
                className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-full"
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
                className="cursor-pointer bg-blue-100 text-blue-600 hover:bg-blue-200 font-bold py-2 px-4 rounded-full"
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
          className="w-full py-2 px-4 mt-6 bg-blue-600 text-slate-100 rounded-full hover:bg-blue-700 transition disabled:opacity-50 font-bold"
        >
          {loading ? "Generating summary..." : "Generate Summary"}
        </button>

        {summary && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Summary</h2>
            <div className="prose prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 dark:prose-invert max-w-none bg-slate-100 dark:bg-slate-700 px-6 py-4 rounded-md text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}