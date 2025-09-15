import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BrainCircuit, Activity, Scaling, ShieldAlert, Target, GitCommitHorizontal } from 'lucide-react';

// --- MAIN APP COMPONENT ---
const App = () => {
  const [gameState, setGameState] = useState('start'); // 'start', 'memorize', 'recall', 'report', 'transition'
  const [performanceData, setPerformanceData] = useState(null);

  const handleGameEnd = (data) => {
    setPerformanceData(data);
    setGameState('report');
  };

  const handleRestart = () => {
    setPerformanceData(null);
    setGameState('start');
  };

  const renderGameState = () => {
    switch (gameState) {
      case 'start':
        return <StartScreen onStart={() => setGameState('transition')} />;
      case 'transition':
        return <GameComponent onGameEnd={handleGameEnd} setGameState={setGameState} />;
      case 'report':
        return <ReportScreen performanceData={performanceData} onRestart={handleRestart} />;
      default:
        return <StartScreen onStart={() => setGameState('transition')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {renderGameState()}
        </AnimatePresence>
      </div>
      <footer className="absolute bottom-4 text-xs text-gray-500">
        Cognitive Assessment Tool | Not a substitute for professional medical advice.
      </footer>
    </div>
  );
};

// --- START SCREEN COMPONENT ---
const StartScreen = ({ onStart }) => (
  <motion.div
    key="start"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.5 }}
    className="text-center p-8 bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700"
  >
    <BrainCircuit className="w-20 h-20 mx-auto text-cyan-400 mb-4" />
    <h1 className="text-4xl md:text-5xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">NeuroTrack</h1>
    <p className="text-gray-300 mb-8 max-w-md mx-auto">
      A pattern recognition game to assess your cognitive functions. Follow the sequence of glowing orbs.
    </p>
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(79, 70, 229, 0.7)' }}
      whileTap={{ scale: 0.95 }}
      onClick={onStart}
      className="px-8 py-3 bg-indigo-600 rounded-lg text-lg font-semibold"
    >
      Begin Assessment
    </motion.button>
  </motion.div>
);

// --- GAME COMPONENT ---
const GameComponent = ({ onGameEnd, setGameState }) => {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [userSequence, setUserSequence] = useState([]);
  const [activeCircle, setActiveCircle] = useState(null);
  const [isMemorizePhase, setIsMemorizePhase] = useState(true);
  const [gridSize, setGridSize] = useState(9);
  const [showLevelIntro, setShowLevelIntro] = useState(true);
  const [distractors, setDistractors] = useState([]);

  const performanceHistory = useRef([]);
  const reactionStartTime = useRef(null);

  const generateSequence = useCallback(() => {
    const newSequence = [];
    for (let i = 0; i < level + 2; i++) {
      newSequence.push(Math.floor(Math.random() * gridSize));
    }
    setSequence(newSequence);
  }, [level, gridSize]);

  useEffect(() => {
    if (showLevelIntro) {
        const timer = setTimeout(() => {
            setShowLevelIntro(false);
            generateSequence();
        }, 1500);
        return () => clearTimeout(timer);
    }
  }, [showLevelIntro, generateSequence]);
  
  useEffect(() => {
    if (!showLevelIntro && sequence.length > 0) {
      setIsMemorizePhase(true);
      setUserSequence([]);
      setActiveCircle(null);
      
      const playSequence = async () => {
        await new Promise(res => setTimeout(res, 500));
        for (let i = 0; i < sequence.length; i++) {
          setActiveCircle(sequence[i]);
          await new Promise(res => setTimeout(res, Math.max(200, 600 - level * 30)));
          setActiveCircle(null);
          await new Promise(res => setTimeout(res, 150));
        }
        setIsMemorizePhase(false);
        reactionStartTime.current = performance.now();
      };
      playSequence();
    }
  }, [sequence, level, showLevelIntro]);

  // Distractor effect for Environmental Stress
  useEffect(() => {
    if (!isMemorizePhase && level >= 4) {
        const interval = setInterval(() => {
            const potentialDistractors = [...Array(gridSize).keys()].filter(i => !sequence.includes(i));
            const newDistractors = [];
            if(Math.random() < 0.3) { // 30% chance to show distractors
                const distractorIndex = Math.floor(Math.random() * potentialDistractors.length);
                newDistractors.push(potentialDistractors[distractorIndex]);
            }
            setDistractors(newDistractors);
            setTimeout(() => setDistractors([]), 300);
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [isMemorizePhase, level, gridSize, sequence]);


  const handleCircleClick = (index) => {
    if (isMemorizePhase || userSequence.length >= sequence.length) return;
    
    const reactionTime = performance.now() - (reactionStartTime.current || performance.now());
    reactionStartTime.current = performance.now(); // Reset for next click in sequence
    
    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);
    
    const isCorrect = sequence[newUserSequence.length - 1] === index;

    if (!isCorrect) {
      endGame(false, reactionTime);
      return;
    }
    
    performanceHistory.current.push({ type: 'correct_click', reactionTime, level });

    if (newUserSequence.length === sequence.length) {
      // Level complete
      setTimeout(() => {
        setLevel(prev => prev + 1);
        if (level >= 5) setGridSize(12);
        if (level >= 8) setGridSize(16);
        setGameState('transition');
        setShowLevelIntro(true);
      }, 500);
    }
  };

  const endGame = (completed, lastReactionTime) => {
    performanceHistory.current.push({ type: completed ? 'game_complete' : 'error_click', reactionTime: lastReactionTime, level });
    
    // Process raw data into cognitive metrics
    const finalData = processPerformanceData(performanceHistory.current, level);
    onGameEnd(finalData);
  };
  
  if(showLevelIntro) {
      return (
          <motion.div key="level-intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center">
              <h2 className="text-5xl font-bold text-cyan-400">Level {level}</h2>
          </motion.div>
      );
  }

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      <div className="w-full flex justify-between items-center mb-4 px-2">
        <p className="text-lg font-semibold">Level: <span className="text-cyan-400">{level}</span></p>
        <p className="text-lg font-semibold">
          {isMemorizePhase ? 'Memorize the pattern...' : 'Recall the pattern...'}
        </p>
      </div>
      <div className={`grid ${gridSize === 9 ? 'grid-cols-3' : 'grid-cols-4'} gap-4 md:gap-6 w-full max-w-lg aspect-square`}>
        {[...Array(gridSize)].map((_, i) => (
          <Circle
            key={i}
            isActive={activeCircle === i}
            isDistractor={distractors.includes(i)}
            onClick={() => handleCircleClick(i)}
            isDisabled={isMemorizePhase}
          />
        ))}
      </div>
      <div className="mt-6 h-4 w-full max-w-lg bg-gray-700 rounded-full">
         <motion.div 
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
            initial={{width: '0%'}}
            animate={{width: `${(userSequence.length / sequence.length) * 100}%`}}
            transition={{ease: "circOut", duration: 0.5}}
         />
      </div>
    </motion.div>
  );
};

// --- CIRCLE COMPONENT ---
const Circle = ({ isActive, onClick, isDisabled, isDistractor }) => {
  const circleVariants = {
    initial: { scale: 1, opacity: 0.7 },
    active: { 
        scale: [1, 1.1, 1], 
        opacity: 1,
        boxShadow: ['0 0 0px #67e8f9', '0 0 50px #67e8f9', '0 0 0px #67e8f9'],
        transition: { duration: 0.4, ease: "easeInOut" }
    },
    hover: { scale: 1.05, opacity: 1 },
    tap: { scale: 0.95 },
    distractor: {
        backgroundColor: "#fca5a5",
        opacity: [0.7, 1, 0.7],
        transition: { duration: 0.3, repeat: 1, repeatType: "reverse" }
    }
  };

  return (
    <motion.div
      variants={circleVariants}
      initial="initial"
      animate={isActive ? "active" : isDistractor ? "distractor" : "initial"}
      whileHover={!isDisabled ? "hover" : ""}
      whileTap={!isDisabled ? "tap" : ""}
      onClick={onClick}
      className={`aspect-square rounded-full cursor-pointer transition-colors duration-200 ${isDisabled ? 'bg-gray-700 cursor-not-allowed' : 'bg-indigo-900'}`}
    />
  );
};

// --- DATA PROCESSING LOGIC ---
const processPerformanceData = (history, finalLevel) => {
    const correctClicks = history.filter(h => h.type === 'correct_click');
    const errorClick = history.find(h => h.type === 'error_click');
    
    // 1. Attention
    const totalAttempts = correctClicks.length + (errorClick ? 1 : 0);
    const attentionScore = totalAttempts > 0 ? (correctClicks.length / totalAttempts) * 100 : 100;

    // 2. Motor Control
    const reactionTimes = correctClicks.map(c => c.reactionTime);
    const avgReactionTime = reactionTimes.length > 0 ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length : 0;
    const motorControlScore = Math.max(0, 100 - (avgReactionTime / 15)); // Scaled: faster is better

    // 3. Behavioral Stability
    const reactionTimeStdDev = Math.sqrt(reactionTimes.map(x => Math.pow(x - avgReactionTime, 2)).reduce((a, b) => a + b, 0) / reactionTimes.length);
    const behavioralStabilityScore = Math.max(0, 100 - (reactionTimeStdDev / 5)); // Lower variance is better

    // 4. Cognitive Load
    const levelPerformance = {};
    history.forEach(h => {
        if (!levelPerformance[h.level]) levelPerformance[h.level] = { reactions: [], errors: 0 };
        if (h.type === 'correct_click') levelPerformance[h.level].reactions.push(h.reactionTime);
        if (h.type === 'error_click') levelPerformance[h.level].errors++;
    });

    let performanceDrop = 0;
    const levels = Object.keys(levelPerformance).map(Number).sort((a,b) => a - b);
    if(levels.length > 1) {
        const firstLevel = levels[0];
        const lastLevel = levels[levels.length - 1];
        const firstLevelAvgRT = levelPerformance[firstLevel].reactions.reduce((a, b) => a + b, 0) / levelPerformance[firstLevel].reactions.length;
        const lastLevelAvgRT = levelPerformance[lastLevel].reactions.reduce((a, b) => a + b, 0) / levelPerformance[lastLevel].reactions.length;
        performanceDrop = (lastLevelAvgRT - firstLevelAvgRT) / firstLevelAvgRT * 100;
    }
    const cognitiveLoadScore = Math.max(0, 100 - performanceDrop); // Less drop is better

    // 5. Environmental Stress (placeholder as we add features)
    // Here we'd factor in errors that happened when distractors were on screen.
    // For this version, we'll give a baseline score that decreases with errors at higher levels.
    const errorsInHighLevels = Object.entries(levelPerformance).reduce((acc, [level, data]) => {
        return acc + (Number(level) >= 4 ? data.errors : 0);
    }, 0);
    const environmentalStressScore = Math.max(0, 100 - (errorsInHighLevels * 25));

    // 6. NeuroBalance
    const neuroBalanceScore = (attentionScore * 0.6) + (motorControlScore * 0.4);

    return {
        scores: {
            attention: attentionScore,
            motorControl: motorControlScore,
            cognitiveLoad: cognitiveLoadScore,
            environmentalStress: environmentalStressScore,
            behavioralStability: behavioralStabilityScore,
            neuroBalance: neuroBalanceScore,
        },
        stats: {
            finalLevel,
            avgReactionTime,
            reactionTimeStdDev,
        },
        history,
        levelPerformance,
    };
};


// --- REPORT SCREEN COMPONENT ---
const ReportScreen = ({ performanceData, onRestart }) => {
  const { scores, stats, levelPerformance } = performanceData;

  const radarData = [
    { subject: 'Attention', A: scores.attention, fullMark: 100 },
    { subject: 'Motor Control', A: scores.motorControl, fullMark: 100 },
    { subject: 'Cognitive Load', A: scores.cognitiveLoad, fullMark: 100 },
    { subject: 'Enviro. Stress', A: scores.environmentalStress, fullMark: 100 },
    { subject: 'Behavioral Stability', A: scores.behavioralStability, fullMark: 100 },
    { subject: 'NeuroBalance', A: scores.neuroBalance, fullMark: 100 },
  ];

  const lineChartData = Object.keys(levelPerformance)
    .sort((a,b) => a - b)
    .map(level => {
    const levelData = levelPerformance[level];
    const avgRT = levelData.reactions.length > 0 ? levelData.reactions.reduce((a, b) => a + b, 0) / levelData.reactions.length : 0;
    return {
        name: `Lvl ${level}`,
        "Reaction Time (ms)": parseFloat(avgRT.toFixed(2)),
        "Errors": levelData.errors
    };
  });
  
  const getInsight = (category, score) => {
    const insights = {
      attention: {
        high: "Excellent focus and accuracy. You effectively block out errors.",
        medium: "Good attention, with some occasional lapses. Consistent practice can improve accuracy.",
        low: "Frequent errors suggest difficulty maintaining focus. This could be related to distractibility. Consider mindfulness exercises.",
      },
      motorControl: {
        high: "Very fast and precise reactions. Your hand-eye coordination is sharp.",
        medium: "Solid reaction times. You are generally quick to respond.",
        low: "Slower reaction times may indicate a delay in motor response. If consistent, this is worth monitoring.",
      },
      cognitiveLoad: {
        high: "You handle increasing complexity very well, maintaining performance as the game gets harder.",
        medium: "You adapt reasonably well to new challenges, though performance may dip slightly.",
        low: "Performance dropped significantly as difficulty increased. This suggests a sensitivity to cognitive overload. Breaking down complex tasks may help.",
      },
      environmentalStress: {
        high: "You remain calm and focused under pressure and with distractions.",
        medium: "You can handle some pressure, but performance may be affected by a stressful environment.",
        low: "Distractions and time pressure seem to have a strong negative impact on your performance. Stress management techniques could be beneficial.",
      },
      behavioralStability: {
        high: "Highly consistent performance. Your focus and reaction speed are very stable.",
        medium: "Your performance is generally consistent, with minor fluctuations.",
        low: "Inconsistent reaction times suggest fluctuating focus or motor control. This can sometimes be linked to fatigue or stress.",
      },
      neuroBalance: {
        high: "Excellent coordination between your cognitive processing and motor responses. You are both fast and accurate.",
        medium: "Good balance between speed and accuracy. One may sometimes be prioritized over the other.",
        low: "A notable imbalance between speed and accuracy. You may be sacrificing accuracy for speed, or vice-versa.",
      }
    };
    if (score >= 80) return insights[category].high;
    if (score >= 50) return insights[category].medium;
    return insights[category].low;
  };
  
  const getOverallFeedback = () => {
      const lowScores = Object.entries(scores).filter(([, score]) => score < 50);
      if (lowScores.length >= 3) {
          return {
              title: "Recommendation",
              text: "Your results show challenges in several cognitive areas. While this is just a game, consistently low scores in areas like Attention and Cognitive Load can sometimes be early indicators of conditions like ADHD, high stress, or burnout. We recommend discussing these patterns with a healthcare professional.",
              color: "text-red-400"
          };
      }
      if (lowScores.length > 0) {
          const weakestArea = lowScores.sort((a,b) => a[1] - b[1])[0][0];
          const areaMap = {
              attention: "ADHD or high distractibility",
              cognitiveLoad: "Burnout or executive function challenges",
              environmentalStress: "High stress or anxiety",
              behavioralStability: "PTSD or inconsistent sleep patterns",
          }
          const risk = areaMap[weakestArea] || "general cognitive fatigue";
           return {
              title: "Area for Improvement",
              text: `Your primary area for improvement appears to be ${weakestArea.replace(/([A-Z])/g, ' $1')}. Difficulties here can sometimes be associated with ${risk}. Consider activities that challenge this skill.`,
              color: "text-yellow-400"
          };
      }
      return {
          title: "Excellent Performance",
          text: "You demonstrated strong and balanced cognitive functions across the board. Your results indicate sharp focus, quick reactions, and resilience under pressure. Keep your mind active to maintain this great performance!",
          color: "text-green-400"
      };
  };

  const overallFeedback = getOverallFeedback();
  
  const cognitiveCategories = [
      { name: "Attention", score: scores.attention, icon: <Target/>, description: getInsight('attention', scores.attention) },
      { name: "Motor Control", score: scores.motorControl, icon: <Activity/>, description: getInsight('motorControl', scores.motorControl) },
      { name: "Cognitive Load", score: scores.cognitiveLoad, icon: <Scaling/>, description: getInsight('cognitiveLoad', scores.cognitiveLoad) },
      { name: "Enviro. Stress", score: scores.environmentalStress, icon: <ShieldAlert/>, description: getInsight('environmentalStress', scores.environmentalStress) },
      { name: "Behavioral Stability", score: scores.behavioralStability, icon: <GitCommitHorizontal/>, description: getInsight('behavioralStability', scores.behavioralStability) },
      { name: "NeuroBalance", score: scores.neuroBalance, icon: <BrainCircuit/>, description: getInsight('neuroBalance', scores.neuroBalance) },
  ]

  return (
    <motion.div
      key="report"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="bg-gray-800/50 rounded-2xl shadow-2xl backdrop-blur-sm border border-gray-700 p-4 md:p-8 w-full"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
           <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Cognitive Report</h2>
           <p className="text-gray-400">Analysis of your performance.</p>
        </div>
        <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRestart}
            className="px-6 py-2 mt-4 md:mt-0 bg-indigo-600 rounded-lg font-semibold"
        >
            Play Again
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1 h-80 bg-gray-900/70 p-4 rounded-lg">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#4A5568" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#E2E8F0', fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 h-80 bg-gray-900/70 p-4 rounded-lg">
           <p className="text-sm text-center text-gray-400 mb-2">Performance Across Levels</p>
           <ResponsiveContainer width="100%" height="90%">
              <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#A0AEC0" />
                  <YAxis stroke="#A0AEC0" />
                  <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Reaction Time (ms)" stroke="#8884d8" />
              </LineChart>
           </ResponsiveContainer>
        </div>
      </div>
      
      <div className="mb-6 bg-gray-900/70 p-6 rounded-lg">
        <h3 className={`text-xl font-bold mb-2 ${overallFeedback.color}`}>{overallFeedback.title}</h3>
        <p className="text-gray-300">{overallFeedback.text}</p>
      </div>

      <div>
        <h3 className="text-2xl font-bold mb-4">Detailed Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cognitiveCategories.map(cat => (
                <div key={cat.name} className="bg-gray-900/70 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                        <div className="text-cyan-400 mr-3">{cat.icon}</div>
                        <h4 className="font-bold text-lg">{cat.name}</h4>
                        <span className="ml-auto font-semibold text-xl" style={{color: cat.score > 80 ? '#48BB78' : cat.score > 50 ? '#F6E05E' : '#F56565' }}>
                            {cat.score.toFixed(0)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400">{cat.description}</p>
                </div>
            ))}
        </div>
      </div>
    </motion.div>
  );
};

export default App;
