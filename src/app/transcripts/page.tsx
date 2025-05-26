"use client";

import { motion } from "framer-motion";
import { Clock, Copy, Download } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface TranscriptEntry {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptData {
  video_id: string;
  title?: string;
  transcript: TranscriptEntry[];
}

function TranscriptContent() {
  const searchParams = useSearchParams();
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTimestamp, setActiveTimestamp] = useState<number | null>(null);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  useEffect(() => {
    const videoId = searchParams.get("videoId");
    if (!videoId) {
      setError("No video ID provided");
      setIsLoading(false);
      return;
    }

    const fetchTranscript = async () => {
      try {
        const response = await fetch(
          `/api/transcript?url=https://www.youtube.com/watch?v=${videoId}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch transcript");
        }
        const data = await response.json();
        setTranscriptData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscript();
  }, [searchParams]);

  const copyToClipboard = () => {
    if (!transcriptData) return;
    const text = transcriptData.transcript.map((entry) => entry.text).join(" ");
    navigator.clipboard.writeText(text);
  };

  const downloadAsFile = (format: "txt" | "srt") => {
    if (!transcriptData) return;

    let content = "";
    const filename = `transcript_${transcriptData.video_id}.${format}`;

    if (format === "txt") {
      if (includeTimestamps) {
        content = transcriptData.transcript
          .map((entry) => {
            const timestamp = formatTime(entry.start);
            return `[${timestamp}] ${entry.text}`;
          })
          .join("\n");
      } else {
        content = transcriptData.transcript
          .map((entry) => entry.text)
          .join("\n");
      }
    } else if (format === "srt") {
      content = transcriptData.transcript
        .map((entry, index) => {
          const start = formatTime(entry.start);
          const end = formatTime(entry.start + entry.duration);
          return `${index + 1}\n${start} --> ${end}\n${entry.text}\n`;
        })
        .join("\n");
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms
      .toString()
      .padStart(3, "0")}`;
  };

  const seekToTime = (seconds: number) => {
    setActiveTimestamp(seconds);
    const iframe = document.querySelector("iframe");
    if (iframe) {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    );
  }

  if (!transcriptData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-xl">
          No transcript data available
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Video Section */}
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${transcriptData.video_id}?enablejsapi=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-xl"
              ></iframe>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {transcriptData.title || "Video Transcript"}
              </h1>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </button>
                <button
                  onClick={() => downloadAsFile("txt")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>TXT</span>
                </button>
                <button
                  onClick={() => downloadAsFile("srt")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>SRT</span>
                </button>
                <div className="flex items-center space-x-2 ml-2">
                  <button
                    onClick={() => setIncludeTimestamps(!includeTimestamps)}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                      includeTimestamps
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Include Timestamps</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transcript Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Transcript
              </h2>
            </div>
            <div className="h-[calc(100vh-16rem)] overflow-y-auto">
              <div className="p-4 space-y-4">
                {transcriptData.transcript.map((entry, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeTimestamp === entry.start
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => seekToTime(entry.start)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[60px]">
                        {Math.floor(entry.start / 60)}:
                        {(entry.start % 60).toFixed(0).padStart(2, "0")}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {entry.text}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TranscriptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <TranscriptContent />
    </Suspense>
  );
}
