"use client";

import { useEffect, useMemo, useState } from "react";

type WordStat = {
  word: string;
  timeToTypeMs: number;
  correct: boolean;
  backspaces: number;
};

// Top 200 common English words
const TOP_WORDS: string[] = [
  "the","be","to","of","and","a","in","that","have","I",
  "it","for","not","on","with","he","as","you","do","at",
  "this","but","his","by","from","they","we","say","her","she",
  "or","an","will","my","one","all","would","there","their","what",
  "so","up","out","if","about","who","get","which","go","me",
  "when","make","can","like","time","no","just","him","know","take",
  "people","into","year","your","good","some","could","them","see","other",
  "than","then","now","look","only","come","its","over","think","also",
  "back","after","use","two","how","our","work","first","well","way",
  "even","new","want","because","any","these","give","day","most","us",
  "is","was","are","had","did","been","here","down","off","still",
  "every","again","while","might","must","home","big","small","long","little",
  "high","old","right","left","last","own","both","between","few","next",
  "young","around","during","before","without","against","under","always","often","never",
  "sometimes","together","enough","almost","already","perhaps","though","place","city","country",
  "world","hand","eye","head","face","story","house","friend","school","family",
  "team","game","group","number","case","problem","fact","ask","feel","try",
  "leave","call","move","play","live","believe","hold","bring","happen","write",
  "provide","sit","stand","lose","pay","meet","include","continue","set","learn",
  "change","lead","understand","watch","follow","stop","create","speak","read","allow",
  "add","spend","grow","open","walk","win","offer","remember","love","wait",
  "serve","die","send","expect","build","stay","fall","cut","reach","kill",
  "remain","suggest","raise","pass","sell","require","report","decide","pull","return",
  "man","woman","child","boy","girl","show","part","about","against","place",
  "early","course","hand","right","public","keep","sure","become","same","old",
  "tell","boy","follow","came","want","show","also","around","form","three",
  "small","set","put","end","why","turn","ask","went","men","read",
  "need","land","different","home","move","try","kind","hand","picture","again",
  "change","off","play","spell","air","away","animal","house","point","page",
  "letter","mother","answer","found","study","still","learn","should","America","world"
];

const TEST_WORD_COUNT = 200;
const WINDOW_SIZE = 8;
const DURATION_SECONDS = 30;

function sampleWords(count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * TOP_WORDS.length);
    result.push(TOP_WORDS[idx]);
  }
  return result;
}

export default function HomePage() {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [wordStartTime, setWordStartTime] = useState<number | null>(null);
  const [currentBackspaces, setCurrentBackspaces] = useState(0);
  const [stats, setStats] = useState<WordStat[]>([]);

  const [testStarted, setTestStarted] = useState(false);
  const [testFinished, setTestFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(DURATION_SECONDS);

  const [wpm, setWpm] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWords(sampleWords(TEST_WORD_COUNT));
  }, []);

  const currentWord = words[currentIndex] ?? "";

  function renderMarkdown(text: string) {
    if (!text) return text;
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^(\d+)\.\s/gm, '<br/>$1. ')
      .replace(/\n\n+/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/^<br\/>/, '');
  }

  // Start test (timer) on first keystroke
  useEffect(() => {
    if (!testStarted && inputValue.length > 0 && stats.length === 0) {
      setTestStarted(true);
      setTimeLeft(DURATION_SECONDS);
      setWordStartTime(Date.now());
    }
  }, [inputValue, testStarted, stats.length]);

  // Countdown timer
  useEffect(() => {
    if (!testStarted || testFinished) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTestFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [testStarted, testFinished]);

  function finalizeWord() {
    if (testFinished) return;

    const now = Date.now();
    const trimmedInput = inputValue.trim();
    const correct = trimmedInput === currentWord;
    const timeToTypeMs = wordStartTime ? now - wordStartTime : 0;

    const newStat: WordStat = {
      word: currentWord,
      timeToTypeMs,
      correct,
      backspaces: currentBackspaces,
    };

    setStats((prev) => [...prev, newStat]);
    setInputValue("");
    setCurrentBackspaces(0);
    setWordStartTime(Date.now());

    if (currentIndex + 1 < words.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setTestFinished(true);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!testStarted && e.target.value.length > 0 && stats.length === 0) {
      setTestStarted(true);
      setTimeLeft(DURATION_SECONDS);
      setWordStartTime(Date.now());
    }
    setInputValue(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      setCurrentBackspaces((prev) => prev + 1);
    }

    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (inputValue.length > 0) {
        finalizeWord();
      }
    }
  }

  function calculateWPM(stats: WordStat[], testDurationInSeconds: number): number {
    const correctWords = stats.filter(stat => stat.correct);
    const totalCharactersInCorrectWords = correctWords.reduce(
      (sum, stat) => sum + stat.word.length, 
      0
    );
    const testTimeInMinutes = testDurationInSeconds / 60;
    
    if (testTimeInMinutes === 0) return 0;
    
    return Math.round((totalCharactersInCorrectWords / 5) / testTimeInMinutes);
  }

  useEffect(() => {
    if (!testFinished || stats.length === 0) return;

    const correctStats = stats.filter((s) => s.correct);
    const wpmValue = calculateWPM(stats, DURATION_SECONDS);
    const accuracyValue = (correctStats.length / stats.length) * 100;

    setWpm(wpmValue);
    setAccuracy(Math.round(accuracyValue));
  }, [testFinished, stats]);

  const visibleWords = useMemo(
    () => words.length === 0 ? [] : words.slice(currentIndex, currentIndex + WINDOW_SIZE),
    [words, currentIndex]
  );

  const renderedCurrentWord = useMemo(() => {
    const chars = currentWord.split("");
    const inputChars = inputValue.split("");

    return (
      <>
        {chars.map((ch, idx) => {
          let className = "word-char upcoming";

          if (idx < inputChars.length) {
            className = inputChars[idx] === ch ? "word-char correct" : "word-char wrong";
          }

          return (
            <span key={idx} className={className}>
              {ch}
            </span>
          );
        })}
      </>
    );
  }, [currentWord, inputValue]);

  async function getFeedback() {
    try {
      setLoadingFeedback(true);
      setError(null);
      setFeedback(null);

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to get feedback from the coach.");
        return;
      }

      const data = await res.json();
      setFeedback(data.feedback);
    } catch (err) {
      console.error(err);
      setError("Unexpected error while getting feedback.");
    } finally {
      setLoadingFeedback(false);
    }
  }

  function resetTest() {
    setWords(sampleWords(TEST_WORD_COUNT));
    setCurrentIndex(0);
    setInputValue("");
    setWordStartTime(null);
    setCurrentBackspaces(0);
    setStats([]);
    setTestStarted(false);
    setTestFinished(false);
    setTimeLeft(DURATION_SECONDS);
    setWpm(null);
    setAccuracy(null);
    setFeedback(null);
    setError(null);
  }

  // Show loading state while words are being generated
  if (words.length === 0) {
    return (
      <div className="app-root">
        <div className="card">
          <div className="card-title">Typing AI coach</div>
          <div className="card-subtitle">
            Loading your practice session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-root">
      <div className="card">
        <div className="card-title">Typing AI coach</div>
        <div className="card-subtitle">
          Unlock your fast typing potential with AI.
        </div>

        {!testFinished ? (
          <>
            <div className="word-line">
              {visibleWords.map((word, idx) => {
                const isCurrent = idx === 0;
                if (isCurrent) {
                  return (
                    <span key={currentIndex} className="current-word">
                      {renderedCurrentWord}
                    </span>
                  );
                }
                return (
                  <span key={currentIndex + idx} className="upcoming-word">
                    {word}
                  </span>
                );
              })}
            </div>

            <div className="input-row">
              <input
                className="input-field"
                placeholder="Start typing here..."
                autoFocus
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={testFinished}
              />
            </div>

            <div className="meta-row">
              <span></span>
              <span className="timer-display">Time left: {timeLeft}s</span>
            </div>
          </>
        ) : (
          <>
            <div className="meta-row">
              <div className="stat-pill">
                <span className="stat-label">WPM</span>
                <span className="stat-value">
                  {wpm !== null ? wpm : "-"}
                </span>
              </div>
              <div className="stat-pill">
                <span className="stat-label">Accuracy</span>
                <span className="stat-value">
                  {accuracy !== null ? `${accuracy}%` : "-"}
                </span>
              </div>
            </div>

            <div className="button-row">
              {!feedback && (
                <button
                  className="btn btn-primary"
                  onClick={getFeedback}
                  disabled={loadingFeedback || stats.length === 0}
                >
                  {loadingFeedback ? "Asking your coach..." : "Get AI feedback"}
                </button>
              )}
              <button 
                className={`btn btn-secondary ${feedback ? 'btn-full-width' : ''}`}
                onClick={resetTest}
              >
                Restart
              </button>
            </div>

            {error && <div className="error-text">{error}</div>}

            {feedback && (
              <div className="feedback-box">
                <div className="feedback-title">AI Coach</div>
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: renderMarkdown(feedback) 
                  }} 
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

