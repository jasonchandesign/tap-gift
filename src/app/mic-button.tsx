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
    <button type="button" className="button-quiet shrink-0" onClick={toggle} aria-pressed={listening}>
      {listening ? "Listening..." : "Speak"}
    </button>
  );
}
