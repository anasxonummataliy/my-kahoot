import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import HostLobby from './components/HostLobby';
import HostQuestionView from './components/HostQuestionView';
import PlayerGameView from './components/PlayerGameView';
import PlayerJoinScreen from './components/PlayerJoinScreen';
import LeaderboardView from './components/LeaderboardView';
import PodiumView from './components/PodiumView';
import QuizManagerModal from './components/QuizManagerModal';
import { soundManager } from './utils/soundEffects';

export default function App() {
  // Session Core State
  const [pin, setPin] = useState('482719');
  const [sessionStatus, setSessionStatus] = useState('lobby'); // lobby | question | review | leaderboard | finished
  const [quizTitle, setQuizTitle] = useState('General Knowledge Challenge');
  const [quizDescription, setQuizDescription] = useState('Answer as fast and correctly as you can!');
  const [isTeamMode, setIsTeamMode] = useState(true);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  // Question & Timer State
  const [timeLeft, setTimeLeft] = useState(20);
  const [timeLimit, setTimeLimit] = useState(20);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerStats, setAnswerStats] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);

  // Player Local State (For player device view)
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);

  // Role State (Host vs Player)
  const [role, setRole] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pin') || params.get('mode') === 'player') return 'player';
    return 'host';
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('start');

  // WebSocket reference
  const socketRef = useRef(null);
  const timerRef = useRef(null);

  // Check URL query parameters (e.g. ?pin=482719&mode=player)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const modeParam = params.get('mode');

    if (pinParam) {
      setPin(pinParam);
      setRole('player');
    } else if (modeParam === 'player') {
      setRole('player');
    }

    // Initialize or fetch active session from Django backend
    initializeSession(pinParam || '482719');
  }, []);

  // Initialize or fetch session from backend
  const initializeSession = async (targetPin) => {
    try {
      const res = await fetch(`http://localhost:8001/api/sessions/${targetPin}/`);
      if (res.ok) {
        const data = await res.json();
        applySessionData(data);
      } else {
        // Create new session if not found
        createBackendSession();
      }
    } catch (e) {
      console.log('Django server not reachable yet or offline, seeding local state:', e);
      seedFallbackState();
    }
  };

  const createBackendSession = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/sessions/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_team_mode: true }),
      });
      if (res.ok) {
        const data = await res.json();
        setPin(data.pin);
        setQuizTitle(data.quiz_title);
        setQuizDescription(data.quiz_description);
        setTotalQuestions(data.total_questions || 10);
        connectWebSocket(data.pin);
      }
    } catch (e) {
      console.warn('Backend create error:', e);
    }
  };

  const applySessionData = (data) => {
    setPin(data.pin);
    setSessionStatus(data.status);
    setQuizTitle(data.quiz_title);
    setQuizDescription(data.quiz_description);
    setIsTeamMode(data.is_team_mode);
    setTotalQuestions(data.total_questions || 10);
    setCurrentQuestionIndex(data.current_question_index || 0);
    if (data.players) setPlayers(data.players);
    if (data.current_question) {
      setCurrentQuestion(data.current_question);
      setTimeLimit(data.current_question.time_limit || 20);
    }
    connectWebSocket(data.pin);
  };

  const seedFallbackState = () => {
    setQuizTitle('General Knowledge Challenge');
    setQuizDescription('Answer as fast and correctly as you can!');
    setCurrentQuestion({
      id: 1,
      index: 1,
      total: 10,
      question_text: 'What is the capital of France?',
      time_limit: 20,
      points: 1000,
      options: [
        { id: 101, option_text: 'Berlin', is_correct: false, color: 'blue', shape: 'triangle' },
        { id: 102, option_text: 'Paris', is_correct: true, color: 'red', shape: 'diamond' },
        { id: 103, option_text: 'Rome', is_correct: false, color: 'orange', shape: 'circle' },
        { id: 104, option_text: 'Madrid', is_correct: false, color: 'green', shape: 'square' },
      ],
    });
    // Add default test player
    setCurrentPlayer({
      id: 'p12',
      nickname: 'Player #12',
      avatar: '🚀',
      team_name: 'Blue Titans',
      team_color: '#3b82f6',
      score: 0,
      streak: 0,
    });
    setPlayers([
      { id: 'p12', nickname: 'Player #12', avatar: '🚀', team_name: 'Blue Titans', team_color: '#3b82f6', score: 0, streak: 0 },
      { id: 'b1', nickname: 'Temur', avatar: '🐉', team_name: 'Red Dragons', team_color: '#ef4444', score: 0, streak: 0 },
      { id: 'b2', nickname: 'Sarah', avatar: '🦅', team_name: 'Golden Eagles', team_color: '#f59e0b', score: 0, streak: 0 },
      { id: 'b3', nickname: 'Jasur', avatar: '⚡', team_name: 'Blue Titans', team_color: '#3b82f6', score: 0, streak: 0 },
    ]);
  };

  // Connect WebSocket to Daphne/Django Channels
  const connectWebSocket = (gamePin) => {
    if (socketRef.current) {
      socketRef.current.close();
    }
    const wsUrl = `ws://localhost:8001/ws/quiz/${gamePin}/`;
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('QuizArena WebSocket connected to room:', gamePin);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleWebSocketMessage(payload);
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('WS error (running with REST fallback):', err);
      };

      socketRef.current = ws;
    } catch (e) {
      console.warn('WS connection failed, continuing locally:', e);
    }
  };

  const sendWsAction = (action, payload = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action, payload }));
    }
  };

  // Handle incoming events from group
  const handleWebSocketMessage = (msg) => {
    const { type, data } = msg;

    if (type === 'init_state' && data) {
      setSessionStatus(data.status);
      setIsTeamMode(data.is_team_mode);
      if (data.players) setPlayers(data.players);
      if (data.current_question) setCurrentQuestion(data.current_question);
    } else if (type === 'player_joined') {
      if (data.all_players) setPlayers(data.all_players);
    } else if (type === 'team_mode_toggled') {
      setIsTeamMode(data.is_team_mode);
    } else if (type === 'question_started') {
      startQuestionLocally(data);
    } else if (type === 'answer_count_updated') {
      setAnsweredCount(data.answered_count);
      setAnswerStats(data);
    } else if (type === 'answer_result') {
      setAnswerResult(data);
      if (data.is_correct) soundManager.playCorrect();
      else soundManager.playWrong();
    } else if (type === 'question_ended') {
      endQuestionLocally(data);
    } else if (type === 'leaderboard_view') {
      setSessionStatus('leaderboard');
      setPlayers(data.players || []);
      setTeams(data.teams || []);
    } else if (type === 'game_finished') {
      setSessionStatus('finished');
      setPlayers(data.players || []);
      setTeams(data.teams || []);
    } else if (type === 'game_reset') {
      setSessionStatus('lobby');
      setPlayers(data.players || []);
      setSelectedOptionId(null);
      setAnswerResult(null);
      setAnsweredCount(0);
    }
  };

  // Timer loop when question is in progress
  useEffect(() => {
    if (sessionStatus === 'question') {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeExpire();
            return 0;
          }
          if (prev <= 6) {
            soundManager.playUrgentTick();
          } else {
            soundManager.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionStatus]);

  // When timer hits 0
  const handleTimeExpire = () => {
    handleEndQuestion();
  };

  // Host Action: Start Question
  const handleStartQuestion = () => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('start_question');
    } else {
      // Local fallback
      const q = currentQuestion || {
        id: 1,
        index: currentQuestionIndex + 1,
        total: totalQuestions,
        question_text: 'What is the capital of France?',
        time_limit: 20,
        points: 1000,
        options: [
          { id: 101, option_text: 'Berlin', is_correct: false, color: 'blue', shape: 'triangle' },
          { id: 102, option_text: 'Paris', is_correct: true, color: 'red', shape: 'diamond' },
          { id: 103, option_text: 'Rome', is_correct: false, color: 'orange', shape: 'circle' },
          { id: 104, option_text: 'Madrid', is_correct: false, color: 'green', shape: 'square' },
        ],
      };
      startQuestionLocally(q);
    }
  };

  const startQuestionLocally = (questionData) => {
    setCurrentQuestion(questionData);
    setCurrentQuestionIndex((questionData.index || 1) - 1);
    setTimeLimit(questionData.time_limit || 20);
    setTimeLeft(questionData.time_limit || 20);
    setSelectedOptionId(null);
    setAnswerResult(null);
    setAnsweredCount(0);
    setAnswerStats(null);
    setCorrectOptionId(null);
    setSessionStatus('question');
  };

  // Host Action: End Question / Reveal Answers
  const handleEndQuestion = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('end_question');
    } else {
      // Local fallback
      const correctOpt = currentQuestion?.options?.find((o) => o.is_correct);
      endQuestionLocally({
        correct_option_id: correctOpt?.id || 102,
        color_counts: { blue: 1, red: 3, orange: 0, green: 0 },
        answered_count: players.length,
        total_answers: players.length,
      });
    }
  };

  const endQuestionLocally = (reviewData) => {
    setSessionStatus('review');
    setCorrectOptionId(reviewData.correct_option_id);
    setAnswerStats(reviewData);

    // If current player answered, check correctness locally if result wasn't set
    if (selectedOptionId && !answerResult) {
      const isCorr = selectedOptionId === reviewData.correct_option_id;
      const pts = isCorr ? 950 : 0;
      setAnswerResult({
        is_correct: isCorr,
        points_awarded: pts,
        streak: isCorr ? (currentPlayer?.streak || 0) + 1 : 0,
      });
      if (isCorr) {
        soundManager.playCorrect();
        if (currentPlayer) {
          setCurrentPlayer((prev) => ({
            ...prev,
            score: (prev?.score || 0) + pts,
            streak: (prev?.streak || 0) + 1,
          }));
        }
      } else {
        soundManager.playWrong();
        if (currentPlayer) {
          setCurrentPlayer((prev) => ({ ...prev, streak: 0 }));
        }
      }
    }
  };

  // Host Action: Show Leaderboard
  const handleShowLeaderboard = () => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('show_leaderboard');
    } else {
      // Calculate standings locally
      const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
      const teamMap = {};
      sorted.forEach((p) => {
        const t = p.team_name || 'Independent';
        if (!teamMap[t]) {
          teamMap[t] = { team_name: t, team_color: p.team_color || '#8b5cf6', total_score: 0, player_count: 0 };
        }
        teamMap[t].total_score += p.score || 0;
        teamMap[t].player_count += 1;
      });
      const teamList = Object.values(teamMap).sort((a, b) => b.total_score - a.total_score);
      setPlayers(sorted);
      setTeams(teamList);
      setSessionStatus('leaderboard');
    }
  };

  // Host Action: Next Question
  const handleNextQuestion = () => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('next_question');
    } else {
      // Local advance
      const nextIdx = currentQuestionIndex + 1;
      if (nextIdx >= totalQuestions) {
        handleFinishGame();
      } else {
        setCurrentQuestionIndex(nextIdx);
        // Next sample question
        startQuestionLocally({
          id: nextIdx + 1,
          index: nextIdx + 1,
          total: totalQuestions,
          question_text: nextIdx === 1 ? 'Which planet is known as the Red Planet?' : 'What is the largest ocean on Earth?',
          time_limit: 20,
          points: 1000,
          options: nextIdx === 1 ? [
            { id: 201, option_text: 'Venus', is_correct: false, color: 'blue', shape: 'triangle' },
            { id: 202, option_text: 'Mars', is_correct: true, color: 'red', shape: 'diamond' },
            { id: 203, option_text: 'Jupiter', is_correct: false, color: 'orange', shape: 'circle' },
            { id: 204, option_text: 'Mercury', is_correct: false, color: 'green', shape: 'square' },
          ] : [
            { id: 301, option_text: 'Atlantic Ocean', is_correct: false, color: 'blue', shape: 'triangle' },
            { id: 302, option_text: 'Indian Ocean', is_correct: false, color: 'red', shape: 'diamond' },
            { id: 303, option_text: 'Pacific Ocean', is_correct: true, color: 'orange', shape: 'circle' },
            { id: 304, option_text: 'Arctic Ocean', is_correct: false, color: 'green', shape: 'square' },
          ],
        });
      }
    }
  };

  // Host Action: Finish Game (Podium)
  const handleFinishGame = () => {
    setSessionStatus('finished');
  };

  // Host Action: Reset Game
  const handleRestartQuiz = () => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('restart_quiz');
    } else {
      setSessionStatus('lobby');
      setCurrentQuestionIndex(0);
      setSelectedOptionId(null);
      setAnswerResult(null);
      setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, streak: 0 })));
    }
  };

  // Host Action: Add Demo Bot Players (Instant 1-click test feature!)
  const handleAddBotPlayers = () => {
    soundManager.playClick();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('add_bot_players');
    } else {
      const demoBots = [
        { id: 'b10', nickname: 'Alex (Titans)', avatar: '⚡', team_name: 'Blue Titans', team_color: '#3b82f6', score: 0, streak: 0 },
        { id: 'b11', nickname: 'Malika (Dragons)', avatar: '🐉', team_name: 'Red Dragons', team_color: '#ef4444', score: 0, streak: 0 },
        { id: 'b12', nickname: 'Jasur (Eagles)', avatar: '🦅', team_name: 'Golden Eagles', team_color: '#f59e0b', score: 0, streak: 0 },
        { id: 'b13', nickname: 'Nodira (Wolves)', avatar: '🐺', team_name: 'Cyber Wolves', team_color: '#10b981', score: 0, streak: 0 },
      ];
      setPlayers((prev) => [...prev, ...demoBots]);
    }
  };

  // Host Action: Toggle Team Mode
  const handleToggleTeamMode = () => {
    const nextMode = !isTeamMode;
    setIsTeamMode(nextMode);
    sendWsAction('toggle_team_mode', { is_team_mode: nextMode });
  };

  // Player Action: Join Game
  const handlePlayerJoin = (playerData) => {
    soundManager.playClick();
    const newPlayer = {
      id: `p_${Date.now()}`,
      nickname: playerData.nickname,
      avatar: playerData.avatar,
      team_name: playerData.team_name,
      team_color: playerData.team_color,
      score: 0,
      streak: 0,
    };
    setCurrentPlayer(newPlayer);
    setPlayers((prev) => [...prev.filter((p) => p.nickname !== newPlayer.nickname), newPlayer]);

    // Send to WebSocket
    sendWsAction('join_game', playerData);

    // Also REST fallback
    fetch(`http://localhost:8001/api/sessions/${pin}/join/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerData),
    }).catch((e) => console.log('REST join error:', e));
  };

  // Player Action: Select Option
  const handleSelectOption = (optionId) => {
    soundManager.playClick();
    setSelectedOptionId(optionId);

    const payload = {
      player_id: currentPlayer?.id,
      question_id: currentQuestion?.id,
      option_id: optionId,
    };

    sendWsAction('submit_answer', payload);

    // REST fallback
    fetch(`http://localhost:8001/api/sessions/${pin}/answer/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setAnswerResult(data);
          if (data.is_correct) soundManager.playCorrect();
          else soundManager.playWrong();
        }
      })
      .catch((e) => console.log('REST answer error:', e));

    setAnsweredCount((prev) => prev + 1);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Select Quiz from Modal
  const handleSelectQuiz = async (quizId) => {
    try {
      const res = await fetch('http://localhost:8001/api/sessions/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, is_team_mode: isTeamMode }),
      });
      if (res.ok) {
        const data = await res.json();
        applySessionData(data);
      }
    } catch (e) {
      console.warn('Select quiz create error:', e);
    }
  };

  // Render the Player Game Content (used both in simulator frames and direct mobile view)
  const renderPlayerContent = () => {
    if (!currentPlayer) {
      return (
        <PlayerJoinScreen
          initialPin={pin}
          isTeamMode={isTeamMode}
          onJoin={handlePlayerJoin}
          onBackToHost={() => setRole('host')}
        />
      );
    }

    if (sessionStatus === 'lobby') {
      return (
        <div className="player-waiting-view glass-panel">
          <div className="waiting-avatar-emoji">{currentPlayer.avatar}</div>
          <h2 className="waiting-welcome-title">Xush kelibsiz, {currentPlayer.nickname}!</h2>
          {isTeamMode && currentPlayer.team_name && (
            <div className="waiting-team-wrap">
              <span className="p-team" style={{ backgroundColor: currentPlayer.team_color }}>
                Jamoa: {currentPlayer.team_name}
              </span>
            </div>
          )}
          <p className="waiting-hint-text">Boshlovchi o'yinni boshlashini kuting...</p>
        </div>
      );
    }

    if (sessionStatus === 'question' || sessionStatus === 'review') {
      return (
        <PlayerGameView
          question={currentQuestion}
          timeLeft={timeLeft}
          timeLimit={timeLimit}
          status={sessionStatus}
          player={currentPlayer}
          selectedOptionId={selectedOptionId}
          onSelectOption={handleSelectOption}
          answerResult={answerResult}
          correctOptionId={correctOptionId}
          isTeamMode={isTeamMode}
        />
      );
    }

    if (sessionStatus === 'leaderboard') {
      return (
        <LeaderboardView
          players={players}
          teams={teams}
          isTeamMode={isTeamMode}
          currentQuestionIndex={currentQuestionIndex + 1}
          totalQuestions={totalQuestions}
          isHost={false}
        />
      );
    }

    if (sessionStatus === 'finished') {
      return (
        <PodiumView
          players={players}
          teams={teams}
          isTeamMode={isTeamMode}
          onRestart={handleRestartQuiz}
          onGoHome={() => setSessionStatus('lobby')}
        />
      );
    }

    return null;
  };

  return (
    <div className="app-root">
      {/* Background Ambient Violet Orbs */}
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />

      {/* Top Navbar */}
      <Navbar
        playersCount={players.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        role={role}
        onToggleRole={(newRole) => setRole(newRole)}
        hostName="Host"
        pin={pin}
      />

      {/* Main Content Area: Automatically responsive based on viewport width */}
      {role === 'host' ? (
        <main className="host-layout-container">
          {/* Left Navigation Sidebar */}
          <Sidebar
            activeTab={activeSidebarTab}
            setActiveTab={setActiveSidebarTab}
            onStartQuiz={handleStartQuestion}
            onOpenQuizModal={() => setIsQuizModalOpen(true)}
            onResetGame={handleRestartQuiz}
            isTeamMode={isTeamMode}
            onToggleTeamMode={handleToggleTeamMode}
          />

          {/* Central & Right Content based on Game Session Status */}
          {sessionStatus === 'lobby' && (
            <HostLobby
              quizTitle={quizTitle}
              quizDescription={quizDescription}
              pin={pin}
              players={players}
              currentQuestionIndex={currentQuestionIndex}
              totalQuestions={totalQuestions}
              timePerQuestion={timeLimit}
              isTeamMode={isTeamMode}
              onStartQuestion={handleStartQuestion}
              onAddBotPlayers={handleAddBotPlayers}
              onToggleTeamMode={handleToggleTeamMode}
            />
          )}

          {(sessionStatus === 'question' || sessionStatus === 'review') && (
            <HostQuestionView
              question={currentQuestion}
              timeLeft={timeLeft}
              timeLimit={timeLimit}
              status={sessionStatus}
              answeredCount={answeredCount}
              totalPlayers={players.length}
              answerStats={answerStats}
              correctOptionId={correctOptionId}
              onEndQuestion={handleEndQuestion}
              onShowLeaderboard={handleShowLeaderboard}
              onNextQuestion={handleNextQuestion}
            />
          )}

          {sessionStatus === 'leaderboard' && (
            <div className="host-full-span-grid">
              <LeaderboardView
                players={players}
                teams={teams}
                isTeamMode={isTeamMode}
                currentQuestionIndex={currentQuestionIndex + 1}
                totalQuestions={totalQuestions}
                onNextQuestion={handleNextQuestion}
                onFinishGame={handleFinishGame}
                isHost={true}
              />
            </div>
          )}

          {sessionStatus === 'finished' && (
            <div className="host-full-span-grid">
              <PodiumView
                players={players}
                teams={teams}
                isTeamMode={isTeamMode}
                onRestart={handleRestartQuiz}
                onGoHome={() => setSessionStatus('lobby')}
              />
            </div>
          )}
        </main>
      ) : (
        <main className="player-layout-container">
          {renderPlayerContent()}
        </main>
      )}

      {/* Quiz Manager & Creator Modal */}
      <QuizManagerModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        currentQuizId={null}
        onSelectQuiz={handleSelectQuiz}
      />
    </div>
  );
}
