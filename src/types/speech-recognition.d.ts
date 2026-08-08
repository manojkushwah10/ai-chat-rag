interface MinimalSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { readonly transcript: string };
}

interface MinimalSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: MinimalSpeechRecognitionResult;
  };
}

interface MinimalSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: MinimalSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: MinimalSpeechRecognitionErrorEvent) => void) | null;
}

interface Window {
  SpeechRecognition?: new () => MinimalSpeechRecognition;
  webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
}
