"use client";

import { useRef, useState } from "react";
import { UploadIcon } from "./icons";
import type { UploadResponse } from "@/types";

type Props = {
  onUploaded: (result: UploadResponse) => void;
};

const ACCEPTED = [".pdf", ".txt", ".md"];

export function FileUpload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploaded(data as UploadResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="w-full max-w-md">
      <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`group flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition-colors ${
          isDragging
            ? "border-accent bg-accent/5"
            : "border-border bg-surface hover:border-accent/50 hover:bg-surface-2"
        } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          {isUploading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          ) : (
            <UploadIcon className="h-5 w-5" />
          )}
        </span>

        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            {isUploading ? "Reading your document…" : "Drop a document here, or click to browse"}
          </p>
          <p className="text-xs text-muted">Supports PDF, TXT, and Markdown</p>
        </div>
      </div>

      {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
