import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser-native voice loop. Free, no API keys. Picks a female English voice
 * when one is available. Falls back gracefully if the browser doesn't support
 * the Web Speech API.
 */
export function useVoiceAgent(opts: {
  onTranscript: (text: string) => void;
  enabled: boolean;
}) {
  const { onTranscript, enabled } = opts;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<unknown>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setSupported(!!SR && "speechSynthesis" in window);
  }, []);

  // Pick best female voice
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const preferred = [
        /Google UK English Female/i,
        /Google US English/i,
        /Microsoft Aria/i,
        /Microsoft Jenny/i,
        /Samantha/i,
        /Karen/i,
        /Tessa/i,
        /female/i,
      ];
      for (const re of preferred) {
        const v = voices.find((v) => re.test(v.name) && /en/i.test(v.lang));
        if (v) {
          voiceRef.current = v;
          return;
        }
      }
      voiceRef.current = voices.find((v) => /en/i.test(v.lang)) ?? voices[0];
    };
    pick();
    window.speechSynthesis.onvoiceschanged = pick;
  }, []);

  const stopListening = useCallback(() => {
    const r = recogRef.current as { stop?: () => void } | null;
    r?.stop?.();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!enabled) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => unknown;
      webkitSpeechRecognition?: new () => unknown;
    };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR() as {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript.trim();
      if (text) onTranscript(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recogRef.current = rec;
    rec.start();
    setListening(true);
  }, [enabled, onTranscript]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        // Strip markdown that sounds bad spoken
        const clean = text
          .replace(/```[\s\S]*?```/g, "")
          .replace(/[*_`#>~-]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!clean) {
          resolve();
          return;
        }
        const u = new SpeechSynthesisUtterance(clean);
        if (voiceRef.current) u.voice = voiceRef.current;
        u.rate = 1.02;
        u.pitch = 1.05;
        u.onstart = () => setSpeaking(true);
        u.onend = () => {
          setSpeaking(false);
          resolve();
        };
        u.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  return { supported, listening, speaking, startListening, stopListening, speak, cancel };
}
