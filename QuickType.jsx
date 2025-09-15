import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Zap, Target, RefreshCw, BarChart2, CheckCircle, XCircle, BarChartHorizontal, BrainCircuit, Fingerprint, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// A more extensive word list for better variety
const WORDS = [
  "the", "be", "of", "and", "a", "to", "in", "he", "have", "it", "that", "for", "they", "I", "with", "as", "not", "on", "she", "at", "by", "this", "we", "you", "do", "but", "from", "or", "which", "one", "would", "all", "will", "there", "say", "who", "make", "when", "can", "more", "if", "no", "man", "out", "other", "so", "what", "time", "up", "go", "about", "than", "into", "could", "state", "only", "new", "year", "some", "take", "come", "these", "know", "see", "use", "get", "like", "then", "first", "any", "work", "now", "may", "such", "give", "over", "think", "most", "even", "find", "day", "also", "after", "way", "many", "must", "look", "before", "great", "back", "through", "long", "where", "much", "should", "well", "people", "down", "own", "just", "because", "good", "each", "those", "feel", "seem", "how", "high", "too", "place", "little", "world", "very", "still", "nation", "hand", "life", "tell", "write", "become", "here", "show", "house", "both", "between", "need", "mean", "call", "develop", "under", "last", "right", "move", "thing", "general", "school", "never", "same", "another", "begin", "while", "number", "part", "turn", "real", "leave", "might", "want", "point", "form", "off", "child", "few", "small", "since", "against", "ask", "late", "home", "interest", "large", "person", "end", "open", "public", "follow", "during", "present", "without", "again", "hold", "govern", "around", "possible", "head", "consider", "word", "program", "problem", "however", "lead", "system", "set", "order", "eye", "plan", "run", "keep", "face", "fact", "group", "play", "stand", "increase", "early", "course", "change", "help", "line"
];

const GAME_MODES = {
  time: [15, 30, 60, 120],
  words: [10, 25, 50, 100],
};

const calculateStats = (history) => {
    if (!history || history.length === 0) return { mean: 0, stdDev: 0 };
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const stdDev = Math.sqrt(history.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / history.length);
    return { mean, stdDev };
}

// Main App Component
const App = () => {
  const [gameState, setGameState] = useState('waiting'); // waiting, running, finished
  const [gameConfig, setGameConfig] = useState({ type: 'time', value: 30 });
  
  const [words, setWords] = useState([]);
  const [wordHistory, setWordHistory] = useState({});
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [userInput, setUserInput] = useState('');

  const [timer, setTimer] = useState(gameConfig.value);
  const [results, setResults] = useState({
      wpm: 0, rawWpm: 0, accuracy: 100, consistency: 0, neuroBalance: 0,
      correctChars: 0, incorrectChars: 0, missedChars: 0, extraChars: 0,
      wpmHistory: [], errors: 0, timeElapsed: 0
  });
  
  const inputRef = useRef(null);
  const wordContainerRef = useRef(null);
  const activeWordRef = useRef(null);
  const startTimeRef = useRef(null);
  const [lineOffset, setLineOffset] = useState(0);

  const generateWords = useCallback(() => {
    const wordCount = gameConfig.type === 'words' ? gameConfig.value + 50 : 350;
    const generated = Array.from({ length: wordCount }, () => WORDS[Math.floor(Math.random() * WORDS.length)]);
    setWords(generated);
  }, [gameConfig]);
  
  // Initialize and Reset Game
  const resetGame = useCallback(() => {
    setGameState('waiting');
    generateWords();
    setActiveWordIndex(0);
    setUserInput('');
    setTimer(gameConfig.value);
    setResults({
        wpm: 0, rawWpm: 0, accuracy: 100, consistency: 0, neuroBalance: 0,
        correctChars: 0, incorrectChars: 0, missedChars: 0, extraChars: 0,
        wpmHistory: [], errors: 0, timeElapsed: 0
    });
    setWordHistory({});
    setLineOffset(0);
    startTimeRef.current = null;
    inputRef.current?.focus();
  }, [gameConfig, generateWords]);

  useEffect(resetGame, [gameConfig]);

  // Timer and live WPM calculation logic
  useEffect(() => {
    let interval;
    if (gameState === 'running' && gameConfig.type === 'time') {
      interval = setInterval(() => {
        setTimer(prev => {
          const newTime = prev - 1;
          const timeElapsed = gameConfig.value - newTime;
          
          setResults(r => {
             const correctWpm = ((r.correctChars / 5) / (timeElapsed / 60)) || 0;
             const rawWpm = (((r.correctChars + r.incorrectChars) / 5) / (timeElapsed / 60)) || 0;
             return {
                ...r,
                wpm: Math.round(correctWpm),
                rawWpm: Math.round(rawWpm),
                wpmHistory: [...r.wpmHistory, {time: timeElapsed, wpm: Math.round(correctWpm)}]
             }
          });

          if (newTime <= 0) {
            setGameState('finished');
            clearInterval(interval);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, gameConfig]);
  
  // Final calculations on finish
  useEffect(() => {
      if (gameState === 'finished' && startTimeRef.current) {
          const timeElapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
          
          setResults(r => {
              const totalCharsTyped = r.correctChars + r.incorrectChars + r.extraChars;
              const accuracy = r.correctChars > 0 ? (r.correctChars / (r.correctChars + r.incorrectChars)) * 100 : 0;
              
              const wpm = ((r.correctChars / 5) / (timeElapsedSeconds / 60)) || 0;
              const rawWpm = ((totalCharsTyped / 5) / (timeElapsedSeconds / 60)) || 0;

              const wpmValues = r.wpmHistory.map(item => item.wpm).filter(w => w > 0);
              const { stdDev, mean } = calculateStats(wpmValues);
              const consistency = mean > 0 ? Math.max(0, 100 - (stdDev / mean * 100)) : 100;

              // NeuroBalance Score Calculation
              const clampedWpm = Math.min(wpm, 150) / 1.5; // Scale WPM to 0-100
              const neuroBalance = (accuracy * 0.4) + (consistency * 0.4) + (clampedWpm * 0.2);

              return {
                  ...r, 
                  accuracy, 
                  consistency: Math.round(consistency),
                  wpm: Math.round(wpm),
                  rawWpm: Math.round(rawWpm),
                  timeElapsed: timeElapsedSeconds,
                  neuroBalance: Math.round(neuroBalance),
              };
          });
      }
  }, [gameState]);


  // Handle keyboard input
  const handleKeyDown = (e) => {
    if (gameState === 'finished') return;
    
    const { key } = e;

    if (gameState === 'waiting' && key.length === 1 && key.match(/[a-zA-Z]/)) {
        setGameState('running');
        startTimeRef.current = Date.now();
    }
    
    if (key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      if (!userInput) return;

      const currentWord = words[activeWordIndex];
      const isCorrect = currentWord === userInput;
      
      setWordHistory(prev => ({...prev, [activeWordIndex]: isCorrect}));
      
      setResults(r => {
          let newCorrect = 0, newIncorrect = 0, newMissed = 0, newExtra = 0;
          
          for(let i=0; i< Math.max(currentWord.length, userInput.length); i++) {
              if (userInput[i] && currentWord[i]) {
                  if (userInput[i] === currentWord[i]) newCorrect++;
                  else newIncorrect++;
              } else if (!userInput[i] && currentWord[i]) {
                  newMissed++;
              } else if (userInput[i] && !currentWord[i]) {
                  newExtra++;
              }
          }

          return {
            ...r,
            correctChars: r.correctChars + newCorrect,
            incorrectChars: r.incorrectChars + newIncorrect,
            missedChars: r.missedChars + newMissed,
            extraChars: r.extraChars + newExtra,
            errors: r.errors + (isCorrect ? 0 : 1),
          };
      });
      
      setActiveWordIndex(prev => prev + 1);
      setUserInput('');

      if (gameConfig.type === 'words' && activeWordIndex + 1 >= gameConfig.value) {
          setGameState('finished');
      }

    } else if (key === 'Backspace') {
      setUserInput(prev => prev.slice(0, -1));
    } else if (key.length === 1 && key.match(/[a-zA-Z]/)) {
      setUserInput(prev => prev + key);
    }
  };
  
  // Logic for smooth line scrolling
  useEffect(() => {
    if (activeWordRef.current && wordContainerRef.current) {
        const activeWordEl = activeWordRef.current;
        const containerEl = wordContainerRef.current;
        const activeWordRect = activeWordEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        if (activeWordRect.top > containerRect.top + 96) { // Approx 2 line heights (48px * 2)
           setLineOffset(prev => prev - 48); // Scroll up by one line height
        }
    }
  }, [activeWordIndex]);

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-300 font-mono flex flex-col items-center justify-center p-4" onClick={() => inputRef.current?.focus()}>
        <div className="w-full max-w-7xl mx-auto flex flex-col gap-8">
            <h1 className="text-3xl font-bold text-center text-cyan-400">
                <Zap className="inline-block -mt-1 mr-2"/>
                QuickType
            </h1>
            
            <AnimatePresence mode="wait">
                {gameState === 'finished' ? (
                    <ResultsScreen key="results" results={results} config={gameConfig} onRestart={resetGame} wordHistory={wordHistory}/>
                ) : (
                    <motion.div key="game" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                        <div className="flex justify-between items-center mb-4">
                            <StatsDisplay timer={timer} wpm={results.wpm} />
                            <GameConfigurator config={gameConfig} onConfigChange={setGameConfig} disabled={gameState === 'running'} />
                        </div>

                        <div ref={wordContainerRef} className="relative text-3xl h-36 leading-relaxed overflow-hidden" >
                            <motion.div 
                                className="flex flex-wrap gap-x-4 gap-y-4"
                                animate={{ y: lineOffset }}
                                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                            >
                                {words.map((word, i) => (
                                    <Word
                                        key={i}
                                        word={word}
                                        isActive={i === activeWordIndex}
                                        isTyped={i < activeWordIndex}
                                        isCorrect={wordHistory[i]}
                                        userInput={userInput}
                                        ref={i === activeWordIndex ? activeWordRef : null}
                                    />
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <input
              ref={inputRef}
              type="text"
              className="opacity-0 absolute p-0 m-0"
              onKeyDown={handleKeyDown}
              value={userInput}
              autoFocus
            />

            <div className="text-center mt-8">
                <button onClick={resetGame} className="text-slate-500 hover:text-cyan-400 transition-colors flex items-center gap-2 mx-auto">
                    <RefreshCw size={14}/>
                    <span>Restart Test</span>
                </button>
            </div>
        </div>
    </div>
  );
};

// Sub-components
const StatsDisplay = ({ timer, wpm }) => (
    <div className="flex items-center gap-6 text-2xl text-cyan-400">
        <div className="flex items-center gap-2">
            <Timer size={20} />
            <span className="font-semibold w-12 text-center">{timer}</span>
        </div>
        <div className="flex items-center gap-2">
            <motion.div initial={{scale:1.2}} animate={{scale:1}} transition={{type: 'spring'}}>
                <span className="font-semibold w-12 text-center">{wpm}</span>
            </motion.div>
            <span className="text-sm text-slate-400">WPM</span>
        </div>
    </div>
);

const GameConfigurator = ({ config, onConfigChange, disabled }) => {
    const setConfig = (type, value) => { onConfigChange({ type, value }); };
    return (
        <div className={`flex gap-4 items-center transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {Object.keys(GAME_MODES).map(mode => (
                <div key={mode} className="flex gap-2 text-slate-400">
                    {GAME_MODES[mode].map(value => (
                        <button key={value} onClick={() => setConfig(mode, value)} className={`px-3 py-1 text-sm rounded-md transition-colors ${config.type === mode && config.value === value ? 'bg-cyan-400 text-slate-900' : 'bg-slate-800/80 hover:bg-slate-700/80'}`}>
                            {value}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};

const Word = React.forwardRef(({ word, isActive, isTyped, isCorrect, userInput }, ref) => {
    if (isTyped) {
        const wordClass = isCorrect === true ? 'text-green-400' : 'text-red-500 underline decoration-red-500/50';
        return <div className={`whitespace-nowrap ${wordClass}`}>{word}</div>;
    }

    return (
        <div ref={ref} className="relative whitespace-nowrap">
            {word.split('').map((letter, i) => {
                let className = 'text-slate-400';
                if (i < userInput.length) {
                    className = letter === userInput[i] ? 'text-slate-200' : 'text-red-500 bg-red-900/50 rounded-sm';
                }
                return <span key={i} className={className}>{letter}</span>;
            })}
             {isActive && (
                <motion.div className="absolute top-0 bottom-0 w-0.5 bg-cyan-400" layoutId="caret"
                    style={{ left: `${userInput.length}ch` }}
                    transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
                />
            )}
        </div>
    );
});

const ResultsScreen = ({ results, config, onRestart, wordHistory }) => {
    const wordsTyped = Object.keys(wordHistory).length;
    const correctWords = wordsTyped - results.errors;

    return (
    <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full bg-[#141a23]/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 flex flex-col gap-8"
    >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 flex flex-col gap-8 text-center md:text-left">
                <div>
                    <p className="text-slate-400">wpm</p>
                    <h2 className="text-6xl font-bold text-cyan-400">{results.wpm}</h2>
                </div>
                <div>
                    <p className="text-slate-400">accuracy</p>
                    <h3 className="text-4xl font-semibold text-slate-300">{results.accuracy.toFixed(1)}%</h3>
                </div>
                 <div className="grid grid-cols-2 gap-4 text-left">
                     <InfoPill label="Test Type" value={`${config.type} ${config.value}${config.type === 'time' ? 's' : ''}`} />
                     <InfoPill label="Raw WPM" value={results.rawWpm} />
                     <InfoPill label="Time" value={`${results.timeElapsed.toFixed(1)}s`} />
                     <InfoPill label="Errors" value={`${results.errors}`} />
                 </div>
            </div>
            <div className="md:col-span-2 w-full h-80">
                 {config.type === 'time' && results.wpmHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={results.wpmHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <XAxis dataKey="time" stroke="#64748b" unit="s" />
                            <YAxis stroke="#64748b" domain={[0, 'dataMax + 20']} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e2d3b', border: '1px solid #334155' }} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#22d3ee' }}/>
                            <Line type="monotone" dataKey="wpm" stroke="#22d3ee" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                 ) : <div className="flex items-center justify-center h-full bg-slate-800/20 rounded-lg"><p className="text-slate-500">Graph is available for time-based tests.</p></div>}
            </div>
        </div>

        {/* *** CHANGE: Neuro-Cognitive Analysis Section *** */}
        <div className="pt-8 border-t border-slate-700">
             <h4 className="font-bold text-xl mb-4 text-center text-slate-300">Neuro-Cognitive Analysis</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <AnalysisMeter icon={<Activity />} title="Attention" score={results.consistency} description="A steady WPM indicates sustained focus. Low scores suggest fluctuating attention." />
                <AnalysisMeter icon={<Fingerprint />} title="Motor Control" score={Math.min(100, results.rawWpm / 1.5)} description="Reflects raw finger speed and dexterity. Higher is better." />
                <AnalysisMeter icon={<Zap />} title="Cognitive Load" score={100 - (results.errors / wordsTyped * 100 || 0)} description="A high error rate increases mental strain. Fewer errors mean lower cognitive load." />
                <AnalysisMeter icon={<BrainCircuit />} title="NeuroBalance" score={results.neuroBalance} description="A composite score blending your speed, accuracy, and consistency." />
                <div className="bg-slate-800/30 p-4 rounded-lg flex flex-col items-center justify-center text-center">
                    <h5 className="font-bold text-slate-300 mb-2">Word Stats</h5>
                    <div className="flex flex-col gap-2">
                        <div className="text-green-400"><span className="font-bold text-2xl">{correctWords}</span> Correct</div>
                        <div className="text-red-400"><span className="font-bold text-2xl">{results.errors}</span> Incorrect</div>
                    </div>
                </div>
             </div>
        </div>
        
        <button onClick={onRestart} className="mt-4 text-slate-900 bg-cyan-400 hover:bg-cyan-300 font-bold transition-colors flex items-center gap-2 mx-auto px-6 py-3 rounded-lg">
            <RefreshCw size={16}/>
            <span>Try Again</span>
        </button>
    </motion.div>
    )
};

const AnalysisMeter = ({ icon, title, score, description }) => (
    <div className="bg-slate-800/30 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
            {React.cloneElement(icon, { className: "text-cyan-400"})}
            <h5 className="font-bold text-slate-300">{title}</h5>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2.5 mb-2">
            <motion.div 
                className="bg-cyan-400 h-2.5 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${score}%`}}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            />
        </div>
        <p className="text-xs text-slate-400">{description}</p>
    </div>
);

const InfoPill = ({ label, value }) => (
    <div className="bg-slate-800/50 p-3 rounded-lg">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
    </div>
);

export default App;

