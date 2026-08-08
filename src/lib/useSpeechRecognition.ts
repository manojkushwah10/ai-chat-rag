"use client";

import { useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
  onTranscript: (transcript: string) => void;
};

function getRecognitionConstructor() {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed": "Microphone access was denied. Allow it in your browser's site settings to use voice input.",
  "service-not-allowed": "Microphone access was denied. Allow it in your browser's site settings to use voice input.",
  "no-speech": "No speech detected. Try again.",
  "audio-capture": "No microphone was found.",
  network: "A network error interrupted voice input.",
};

export function useSpeechRecognition({ onTranscript }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const baseTextRef = useRef("");
  const finalizedRef = useRef("");

  const isSupported = typeof window !== "undefined" && !!getRecognitionConstructor();

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  function start(existingText = "") {
    if (recognitionRef.current) return;
    const Ctor = getRecognitionConstructor();
    if (!Ctor) return;

    setError(null);
    baseTextRef.current = existingText;
    finalizedRef.current = "";

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalizedRef.current = `${finalizedRef.current} ${result[0].transcript}`.trim();
        } else {
          interim += result[0].transcript;
        }
      }

      const combined = `${baseTextRef.current} ${finalizedRef.current} ${interim}`
        .replace(/\s+/g, " ")
        .trim();
      onTranscriptRef.current(combined);
    };
    recognition.onerror = (event) => {
      const message = ERROR_MESSAGES[event.error];
      if (message) setError(message);
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      recognitionRef.current = null;
    }
  }

  function stop() {
    recognitionRef.current?.stop();
  }

  return { isSupported, isListening, error, start, stop };
}
