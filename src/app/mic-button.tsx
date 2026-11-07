"use client";

import { useRef, useState, useSyncExternalStore } from "react";

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

const noUpdates = () => () => undefined;

function speechApi() {
  const speech = window as SpeechWindow;
  return speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
}

/** Dictation for browsers that support it. It stays hidden everywhere else. */
export function MicButton({ onText }: { onText: (text: string) => void }) {
  const supported = useSyncExternalStore(
    noUpdates,
    () => !!speechApi(),
    () => false,
  );
  const [listening, setListening] = useState(false);
  const recognition = useRef<Recognition | null>(null);

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Speech = speechApi();
    if (!Speech) return;

    const listener = new Speech();
    listener.lang = "en-US";
    listener.interimResults = false;
    listener.onresult = (event) => onText(event.results[0][0].transcript);
    listener.onend = () => setListening(false);
    recognition.current = listener;
    listener.start();
    setListening(true);
  }

  if (!supported) return null;
  return (
    <button
      type="button"
      className={`icon-button ${listening ? "text-alert" : ""}`}
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? "Stop listening" : "Speak"}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
