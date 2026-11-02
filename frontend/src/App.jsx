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
import AuthModal from './components/AuthModal';
import StopGameModal from './components/StopGameModal';
import KahootAvatar, { getRandomAvatar } from './components/KahootAvatar';
import AvatarStudio from './components/AvatarStudio';
import PlayerWaitingLobby from './components/PlayerWaitingLobby';
import { soundManager } from './utils/soundEffects';
import { apiUrl, WS_BASE_URL } from './config';

export default function App() {
  // Authentication State
  const [authUser, setAuthUser] = useState(() => {
    try {
      const saved = localStorage.getItem('quiz_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'

  const urlParams = new URLSearchParams(window.location.search);
  const isPodiumPreview = urlParams.get('preview') === 'podium';
  const previewPlayerCount = parseInt(urlParams.get('players') || '1', 10);

  const defaultMockPlayers = previewPlayerCount === 1 ? [
    {
      id: 1,
      nickname: 'Avaz',
      score: 3525,
      avatar: { bodyType: 'blob', color: 'purple', eyes: 'dizzy', mouth: 'mustache', accessory: 'horns' },
    },
  ] : [
    {
      id: 1,
      nickname: 'Avaz',
      score: 3525,
      avatar: { bodyType: 'blob', color: 'purple', eyes: 'dizzy', mouth: 'mustache', accessory: 'horns' },
    },
    {
      id: 2,
      nickname: 'Malika',
      score: 2980,
      avatar: { bodyType: 'cat', color: 'rose', eyes: 'happy', mouth: 'smile', accessory: 'crown' },
    },
    {
      id: 3,
      nickname: 'Jasur',
      score: 2450,
      avatar: { bodyType: 'alien', color: 'cyan', eyes: 'laser', mouth: 'laugh', accessory: 'headphones' },
    },
  ];

  // Session Core State
  const [pin, setPin] = useState('');
  const [sessionStatus, setSessionStatus] = useState(isPodiumPreview ? 'finished' : 'lobby'); // lobby | question | review | leaderboard | finished
  const [quizTitle, setQuizTitle] = useState('General Knowledge Challenge');
  const [quizDescription, setQuizDescription] = useState('');
  const [isTeamMode, setIsTeamMode] = useState(() => {
    if (isPodiumPreview) return false;
    const saved = localStorage.getItem('quiz_team_mode');
    return saved !== null ? saved === 'true' : true;
  });
  const [players, setPlayers] = useState(isPodiumPreview ? defaultMockPlayers : []);
  const [teams, setTeams] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);

  // Question & Timer State
  const [timeLeft, setTimeLeft] = useState(20);
  const [timeLimit, setTimeLimit] = useState(20);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answerStats, setAnswerStats] = useState(null);
  const [correctOptionId, setCorrectOptionId] = useState(null);

  // Player Local State (For player device view)
  const [currentPlayer, setCurrentPlayer] = useState(isPodiumPreview ? defaultMockPlayers[0] : null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  // Role State (Host vs Player) - If unauthenticated, default to 'player' unless mode=host is requested
  const [role, setRole] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'host') return 'host';
    if (params.get('pin') || params.get('mode') === 'player') return 'player';
    const savedAuth = localStorage.getItem('quiz_auth_user');
    if (!savedAuth) return 'player'; // Guests default to player mode
    const savedRole = localStorage.getItem('quiz_role');
    if (savedRole) return savedRole;
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return 'player';
    return 'host';
  });

  const [isMuted, setIsMuted] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isStopGameModalOpen, setIsStopGameModalOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState('start');

  // WebSocket & State references (prevent stale closures)
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const selectedOptionIdRef = useRef(null);
  const answerResultRef = useRef(null);
  const currentPlayerRef = useRef(null);
  const handleWebSocketMessageRef = useRef(null);
  const pinRef = useRef(pin);
  const roleRef = useRef(role);
  const sessionStatusRef = useRef(sessionStatus);
  const timeLimitRef = useRef(timeLimit);
  const questionStartTimeRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const autoLeaderboardTimeoutRef = useRef(null);
  const hostTokenRef = useRef(localStorage.getItem('quiz_host_token') || '');

  const saveHostToken = (gamePin, token) => {
    if (!token) return;
    hostTokenRef.current = token;
    localStorage.setItem('quiz_host_token', token);
    if (gamePin) {
      localStorage.setItem(`quiz_host_token_${gamePin}`, token);
      try {
        sessionStorage.setItem(`quiz_host_token_${gamePin}`, token);
      } catch (e) {}
    }
  };

  const getHostToken = (gamePin) => {
    const targetPin = gamePin || pinRef.current || pin;
    return (
      (targetPin && localStorage.getItem(`quiz_host_token_${targetPin}`)) ||
      (targetPin && sessionStorage.getItem(`quiz_host_token_${targetPin}`)) ||
      hostTokenRef.current ||
      localStorage.getItem('quiz_host_token') ||
      ''
    );
  };

  useEffect(() => {
    pinRef.current = pin;
  }, [pin]);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    sessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);

  useEffect(() => {
    timeLimitRef.current = timeLimit;
  }, [timeLimit]);

  useEffect(() => {
    selectedOptionIdRef.current = selectedOptionId;
  }, [selectedOptionId]);

  useEffect(() => {
    answerResultRef.current = answerResult;
  }, [answerResult]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);

  // Mobile & Tab Reconnect: automatically reconnect socket when user returns to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && pinRef.current) {
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED || socketRef.current.readyState === WebSocket.CLOSING) {
          console.log('Tab/screen became active, reconnecting socket...');
          connectWebSocket(pinRef.current);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, []);

  // Verify Auth Session with Backend on Mount
  useEffect(() => {
    let localUser = null;
    try {
      const saved = localStorage.getItem('quiz_auth_user');
      if (saved) localUser = JSON.parse(saved);
    } catch (e) {}

    fetch(apiUrl('/api/auth/me/'), {
      credentials: 'include',
      headers: localUser?.id ? { 'X-User-Id': String(localUser.id) } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.authenticated && data.user) {
          setAuthUser(data.user);
          localStorage.setItem('quiz_auth_user', JSON.stringify(data.user));
        } else if (localUser) {
          // If server didn't respond or temporarily unauthenticated, retain local auth
          setAuthUser(localUser);
        }
      })
      .catch((e) => {
        console.log('Auth check error:', e);
        if (localUser) setAuthUser(localUser);
      });
  }, []);

  // Session Initialization & Reload Restoration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pinParam = params.get('pin');
    const modeParam = params.get('mode');

    const savedAuth = localStorage.getItem('quiz_auth_user');
    const savedRole = localStorage.getItem('quiz_role');
    const savedPin = localStorage.getItem('quiz_session_pin');
    const savedPlayerRaw = localStorage.getItem('quiz_player');
    let savedPlayer = null;
    try {
      if (savedPlayerRaw) savedPlayer = JSON.parse(savedPlayerRaw);
    } catch (e) {
      console.warn('Failed to parse saved player:', e);
    }

    let effectiveRole = 'player';
    if (modeParam === 'host') {
      effectiveRole = 'host';
    } else if (modeParam === 'player' || pinParam) {
      effectiveRole = 'player';
    } else if (savedAuth) {
      if (savedRole) {
        effectiveRole = savedRole;
      } else if (typeof window !== 'undefined' && window.innerWidth > 768) {
        effectiveRole = 'host';
      }
    } else {
      effectiveRole = 'player';
    }
    setRole(effectiveRole);

    if (savedPlayer) {
      setCurrentPlayer(savedPlayer);
    }

    const targetPin = pinParam || savedPin || '';
    if (targetPin) {
      setPin(targetPin);
      initializeSession(targetPin, effectiveRole, savedPlayer);
    } else if (effectiveRole === 'host' && savedAuth) {
      createBackendSession();
    }
  }, []);

  // Initialize or fetch session from backend
  const initializeSession = async (targetPin, currentRole, savedPlayer) => {
    try {
      const token = getHostToken(targetPin);
      const res = await fetch(apiUrl(`/api/sessions/${targetPin}/`), {
        headers: {
          ...(token ? { 'X-Host-Token': token } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.host_token) {
          saveHostToken(data.pin, data.host_token);
        }
        applySessionData(data);
        if (savedPlayer && data.players) {
          const matched = data.players.find(
            (p) => p.id === savedPlayer.id || p.nickname === savedPlayer.nickname
          );
          if (matched) {
            const merged = { ...savedPlayer, ...matched };
            setCurrentPlayer(merged);
            localStorage.setItem('quiz_player', JSON.stringify(merged));
          }
        }
      } else {
        if (currentRole === 'host' && authUser) {
          createBackendSession();
        } else {
          // Clear expired session info so player can enter fresh PIN
          localStorage.removeItem('quiz_player');
          localStorage.removeItem('quiz_session_pin');
          setCurrentPlayer(null);
        }
      }
    } catch (e) {
      console.log('Django server not reachable yet or offline, seeding local state:', e);
      seedFallbackState();
    }
  };

  const createBackendSession = async (quizId = null) => {
    try {
      const res = await fetch(apiUrl('/api/sessions/create/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quizId, is_team_mode: isTeamMode }),
      });
      if (res.ok) {
        const data = await res.json();
        setPin(data.pin);
        pinRef.current = data.pin;
        setQuizTitle(data.quiz_title);
        setQuizDescription(data.quiz_description);
        setTotalQuestions(data.total_questions || 10);
        localStorage.setItem('quiz_session_pin', data.pin);
        if (data.host_token) {
          saveHostToken(data.pin, data.host_token);
        }
        connectWebSocket(data.pin);
      }
    } catch (e) {
      console.warn('Backend create error:', e);
    }
  };

  const applySessionData = (data) => {
    setPin(data.pin);
    pinRef.current = data.pin;
    localStorage.setItem('quiz_session_pin', data.pin);
    if (data.host_token) {
      saveHostToken(data.pin, data.host_token);
    }
    setSessionStatus(data.status);
    sessionStatusRef.current = data.status;
    setQuizTitle(data.quiz_title);
    setQuizDescription(data.quiz_description);
    setIsTeamMode(data.is_team_mode);
    setTotalQuestions(data.total_questions || 10);
    setCurrentQuestionIndex(data.current_question_index || 0);
    if (data.players) setPlayers(data.players);
    if (data.all_questions) setAllQuestions(data.all_questions);
    if (data.current_question) {
      setCurrentQuestion(data.current_question);
      setTimeLimit(data.current_question.time_limit || 20);
    }
    connectWebSocket(data.pin);
  };

  const seedFallbackState = () => {
    setPin('814770');
    setSessionStatus('lobby');
    setTotalQuestions(5);
    setCurrentQuestionIndex(0);
    setPlayers([
      { id: 'b1', nickname: 'Ali', customAvatar: { bodyType: 'monster', color: 'flame', eyes: 'cute', mouth: 'open', accessory: 'horns' }, avatar: '🔥', team_name: 'Red Dragons', team_color: '#ef4444', score: 0, streak: 0 },
      { id: 'b2', nickname: 'Sarah', customAvatar: { bodyType: 'blob', color: 'amber', eyes: 'happy', mouth: 'laugh', accessory: 'crown' }, avatar: '🦅', team_name: 'Golden Eagles', team_color: '#f59e0b', score: 0, streak: 0 },
      { id: 'b3', nickname: 'Jasur', customAvatar: { bodyType: 'robot', color: 'indigo', eyes: 'goggles', mouth: 'smile', accessory: 'cap' }, avatar: '⚡', team_name: 'Blue Titans', team_color: '#3b82f6', score: 0, streak: 0 },
    ]);
  };

  // Connect WebSocket to Daphne/Django Channels
  const connectWebSocket = (gamePin) => {
    if (!gamePin) return;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      try {
        socketRef.current.onclose = null; // Prevent reconnect loop during deliberate close
        socketRef.current.close();
      } catch (e) {}
    }
    const hostToken = getHostToken(gamePin);
    const queryParam = hostToken ? `?host_token=${encodeURIComponent(hostToken)}` : '';
    const wsUrl = `${WS_BASE_URL}/ws/quiz/${gamePin}/${queryParam}`;
    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('QuizArena WebSocket connected to room:', gamePin);
        if (currentPlayerRef.current) {
          const storedPlayer = JSON.parse(localStorage.getItem('quiz_player') || '{}');
          ws.send(JSON.stringify({
            action: 'reconnect_player',
            payload: {
              player_id: currentPlayerRef.current.id,
              player_token: storedPlayer.player_token || currentPlayerRef.current.player_token,
            },
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (handleWebSocketMessageRef.current) {
            handleWebSocketMessageRef.current(payload);
          } else {
            handleWebSocketMessage(payload);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = (event) => {
        console.warn('WS closed code:', event.code);
        // Automatically reconnect with 2s backoff if session is still active
        if (pinRef.current && sessionStatusRef.current !== 'finished') {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(pinRef.current);
          }, 2000);
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
      const hostToken = getHostToken(pinRef.current || pin);
      const dataWithToken = {
        ...payload,
        ...(hostToken ? { host_token: hostToken } : {}),
      };
      socketRef.current.send(JSON.stringify({ action, payload: dataWithToken }));
    }
  };

  // Handle incoming events from group
  const handleWebSocketMessage = (msg) => {
    const { type, data, message } = msg;

    if (type === 'error') {
      console.warn('QuizArena WS notification:', message || data);
      return;
    }

    if (type === 'init_state' && data) {
      setSessionStatus(data.status);
      setIsTeamMode(data.is_team_mode);
      if (data.players) setPlayers(data.players);
      if (data.current_question) setCurrentQuestion(data.current_question);
    } else if (type === 'player_joined') {
      if (data.all_players) setPlayers(data.all_players);
    } else if (type === 'player_left') {
      if (data.all_players) setPlayers(data.all_players);
      // If the removed player is this client, cleanly reset to join screen
      if (data.player_id && currentPlayerRef.current && String(data.player_id) === String(currentPlayerRef.current.id)) {
        soundManager.playError();
        handleLeaveGame();
      }
    } else if (type === 'player_updated') {
      if (data.all_players) setPlayers(data.all_players);
      // If the updated player is the current player, update local state too
      if (data.player && currentPlayerRef.current && data.player.id === currentPlayerRef.current.id) {
        const updatedPlayer = { ...currentPlayerRef.current, ...data.player };
        setCurrentPlayer(updatedPlayer);
        localStorage.setItem('quiz_player', JSON.stringify(updatedPlayer));
      }
    } else if (type === 'team_mode_toggled') {
      setIsTeamMode(data.is_team_mode);
    } else if (type === 'question_started') {
      startQuestionLocally(data);
    } else if (type === 'answer_count_updated') {
      setAnsweredCount(data.answered_count);
      setAnswerStats(data);
      // If all players have answered, halt timer countdown and transition immediately!
      if (data.total_players > 0 && data.answered_count >= data.total_players) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        if (role === 'host') {
          handleEndQuestion();
        }
      }
    } else if (type === 'answer_result') {
      // Store result silently; sound and review feedback will be revealed when question ends
      setAnswerResult(data);
      answerResultRef.current = data;
    } else if (type === 'question_ended') {
      clearInterval(timerRef.current);
      setTimeLeft(0);
      endQuestionLocally(data);
    } else if (type === 'quiz_changed') {
      soundManager.playCorrect();
      setQuizTitle(data.quiz_title);
      setQuizDescription(data.quiz_description);
      setTotalQuestions(data.total_questions || 10);
      if (data.all_questions) setAllQuestions(data.all_questions);
      if (data.players) setPlayers(data.players);
      setSessionStatus('lobby');
      setCurrentQuestion(null);
      setCurrentQuestionIndex(0);
      setSelectedOptionId(null);
      selectedOptionIdRef.current = null;
      setAnswerResult(null);
      answerResultRef.current = null;
      setAnsweredCount(0);
      setAnswerStats(null);
      setCorrectOptionId(null);
    } else if (type === 'leaderboard_view') {
      setSessionStatus('leaderboard');
      setPlayers(data.players || []);
      setTeams(data.teams || []);
    } else if (type === 'game_finished') {
      setSessionStatus('finished');
      setPlayers(data.players || []);
      setTeams(data.teams || []);
    } else if (type === 'game_reset' || type === 'game_stopped') {
      soundManager.playError();
      if (data && data.mode === 'cancel') {
        handleLeaveGame();
      } else {
        setSessionStatus('lobby');
        if (data && data.session && data.session.players) {
          setPlayers(data.session.players);
        } else if (data && data.players) {
          setPlayers(data.players);
        }
        setCurrentQuestion(null);
        setCurrentQuestionIndex(0);
        setSelectedOptionId(null);
        selectedOptionIdRef.current = null;
        setAnswerResult(null);
        answerResultRef.current = null;
        setAnsweredCount(0);
        setAnswerStats(null);
        setCorrectOptionId(null);
      }
    }
  };

  handleWebSocketMessageRef.current = handleWebSocketMessage;

  // Synchronized timer based on server question_start_time (calculated without clock drift)
  useEffect(() => {
    if (sessionStatus === 'question') {
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        const startTime = questionStartTimeRef.current || (Date.now() / 1000);
        const limit = timeLimitRef.current || 20;
        const elapsed = (Date.now() / 1000) - startTime;
        const remaining = Math.max(0, Math.ceil(limit - elapsed));

        setTimeLeft(remaining);

        if (remaining <= 0) {
          clearInterval(timerRef.current);
          // CRITICAL SECURITY & LOGIC FIX: ONLY the host triggers handleEndQuestion!
          // Players NEVER send end_question to server. They await question_ended broadcast.
          if (roleRef.current === 'host') {
            handleEndQuestion();
          }
        } else if (remaining <= 6) {
          soundManager.playUrgentTick();
        } else {
          soundManager.playTick();
        }
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionStatus]);

  // Host Action: Start Question
  const handleStartQuestion = async () => {
    soundManager.playClick();
    const currentPin = pinRef.current || pin;
    const currentToken = getHostToken(currentPin);

    // 1. Send via WebSocket if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('start_question');
    }

    // 2. Also send REST request to guarantee start on backend & broadcast to all players
    if (currentPin) {
      try {
        const res = await fetch(apiUrl(`/api/sessions/${currentPin}/start-question/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ host_token: currentToken }),
        });
        if (res.ok) {
          const qData = await res.json();
          startQuestionLocally(qData);
          return;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('REST start-question notice:', res.status, errData);
        }
      } catch (err) {
        console.warn('REST start-question network note:', err);
      }
    }

    // 3. Fallback only if disconnected from server completely
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      const q = currentQuestion || {
        id: 1,
        index: currentQuestionIndex + 1,
        total: totalQuestions,
        question_text: "O'zbekistonning poytaxti qaysi shahar?",
        time_limit: 20,
        points: 1000,
        start_time: Date.now() / 1000,
        options: [
          { id: 101, option_text: 'Samarqand', is_correct: false, color: 'blue', shape: 'triangle' },
          { id: 102, option_text: 'Toshkent', is_correct: true, color: 'red', shape: 'diamond' },
          { id: 103, option_text: 'Buxoro', is_correct: false, color: 'orange', shape: 'circle' },
          { id: 104, option_text: 'Xiva', is_correct: false, color: 'green', shape: 'square' },
        ],
      };
      startQuestionLocally(q);
    }
  };

  const startQuestionLocally = (questionData) => {
    setCurrentQuestion(questionData);
    setCurrentQuestionIndex((questionData.index || 1) - 1);
    const limit = questionData.time_limit || 20;
    setTimeLimit(limit);
    timeLimitRef.current = limit;

    const startTime = questionData.start_time || (Date.now() / 1000);
    questionStartTimeRef.current = startTime;

    const elapsed = (Date.now() / 1000) - startTime;
    const remaining = Math.max(0, Math.ceil(limit - elapsed));
    setTimeLeft(remaining);

    setSelectedOptionId(null);
    selectedOptionIdRef.current = null;
    setAnswerResult(null);
    answerResultRef.current = null;
    setAnsweredCount(0);
    setAnswerStats(null);
    setCorrectOptionId(null);
    setSessionStatus('question');
  };

  // Host Action: End Question / Reveal Answers
  const handleEndQuestion = async () => {
    const currentPin = pinRef.current || pin;
    const currentToken = getHostToken(currentPin);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('end_question');
    }

    if (currentPin) {
      try {
        const res = await fetch(apiUrl(`/api/sessions/${currentPin}/end-question/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ host_token: currentToken }),
        });
        if (res.ok) {
          const reviewData = await res.json();
          endQuestionLocally(reviewData);
          return;
        }
      } catch (err) {
        console.warn('REST end-question network note:', err);
      }
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
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
    clearInterval(timerRef.current);
    setTimeLeft(0);
    setSessionStatus('review');
    setCorrectOptionId(reviewData.correct_option_id);
    setAnswerStats(reviewData);

    const selId = selectedOptionIdRef.current;
    let res = answerResultRef.current;

    // If answerResult is not yet present, compute it from correct option
    if (selId && !res) {
      const isCorr = selId === reviewData.correct_option_id;
      const pts = isCorr ? 950 : 0;
      res = {
        is_correct: isCorr,
        points_awarded: pts,
        streak: isCorr ? (currentPlayerRef.current?.streak || 0) + 1 : 0,
      };
      setAnswerResult(res);
      answerResultRef.current = res;
    }

    // Question has ended: NOW play sound and update player score & streak!
    if (res) {
      if (res.is_correct) {
        soundManager.playCorrect();
        if (currentPlayerRef.current) {
          setCurrentPlayer((prev) => (prev ? {
            ...prev,
            score: (prev.score || 0) + (res.points_awarded || 0),
            streak: (prev.streak || 0) + 1,
          } : prev));
        }
      } else {
        soundManager.playWrong();
        if (currentPlayerRef.current) {
          setCurrentPlayer((prev) => (prev ? { ...prev, streak: 0 } : prev));
        }
      }
    } else if (currentPlayerRef.current && selId === null) {
      // Time ran out and player did not select any answer
      soundManager.playWrong();
      setCurrentPlayer((prev) => (prev ? { ...prev, streak: 0 } : prev));
    }

    // Automatically transition to leaderboard after 2.2 seconds of review
    clearTimeout(autoLeaderboardTimeoutRef.current);
    if (roleRef.current === 'host') {
      autoLeaderboardTimeoutRef.current = setTimeout(() => {
        if (sessionStatusRef.current === 'review') {
          handleShowLeaderboard();
        }
      }, 2300);
    }
  };

  // Host Action: Show Leaderboard
  const handleShowLeaderboard = async () => {
    clearTimeout(autoLeaderboardTimeoutRef.current);
    soundManager.playClick();
    const currentPin = pinRef.current || pin;
    const currentToken = getHostToken(currentPin);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('show_leaderboard');
    }

    if (currentPin) {
      try {
        await fetch(apiUrl(`/api/sessions/${currentPin}/show-leaderboard/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ host_token: currentToken }),
        });
      } catch (err) {
        console.warn('REST show-leaderboard note:', err);
      }
    }
    setSessionStatus('leaderboard');
  };

  // Host Action: Next Question
  const handleNextQuestion = async () => {
    clearTimeout(autoLeaderboardTimeoutRef.current);
    soundManager.playClick();
    if (currentQuestionIndex + 1 >= totalQuestions) {
      handleFinishGame();
      return;
    }

    const currentPin = pinRef.current || pin;
    const currentToken = getHostToken(currentPin);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('next_question');
    }

    if (currentPin) {
      try {
        const res = await fetch(apiUrl(`/api/sessions/${currentPin}/next-question/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ host_token: currentToken }),
        });
        if (res.ok) {
          const nextData = await res.json();
          if (nextData.is_finished) {
            handleFinishGame();
          } else {
            startQuestionLocally(nextData);
          }
          return;
        }
      } catch (err) {
        console.warn('REST next-question note:', err);
      }
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      setCurrentQuestionIndex((prev) => prev + 1);
      const nextQ = {
        id: currentQuestionIndex + 2,
        index: currentQuestionIndex + 2,
        total: totalQuestions,
        question_text: `Question #${currentQuestionIndex + 2}: What is React?`,
        time_limit: 20,
        points: 1000,
        options: [
          { id: 201, option_text: 'A JavaScript Library for UI', is_correct: true, color: 'blue', shape: 'triangle' },
          { id: 202, option_text: 'A Database Engine', is_correct: false, color: 'red', shape: 'diamond' },
          { id: 203, option_text: 'An Operating System', is_correct: false, color: 'orange', shape: 'circle' },
          { id: 204, option_text: 'A Programming Language', is_correct: false, color: 'green', shape: 'square' },
        ],
      };
      startQuestionLocally(nextQ);
    }
  };

  // Host Action: Finish Game
  const handleFinishGame = () => {
    soundManager.playPodium();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('finish_game');
    } else {
      setSessionStatus('finished');
    }
  };

  // Host Action: Restart Quiz
  const handleRestartQuiz = async () => {
    soundManager.playClick();
    const currentPin = pinRef.current || pin;
    const currentToken = getHostToken(currentPin);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('restart_quiz');
    }

    if (currentPin) {
      try {
        await fetch(apiUrl(`/api/sessions/${currentPin}/restart/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ host_token: currentToken }),
        });
      } catch (err) {
        console.warn('REST restart note:', err);
      }
    }
    setSessionStatus('lobby');
    setCurrentQuestionIndex(0);
    setPlayers((prev) => prev.map((p) => ({ ...p, score: 0, streak: 0 })));
  };

  // Host Action: Add Bot Players
  const handleAddBotPlayers = () => {
    soundManager.playClick();
    sendWsAction('add_bot_players', { count: 3 });
  };

  // Host Action: Toggle Team Mode
  const handleToggleTeamMode = (forcedMode = null) => {
    soundManager.playClick();
    const nextMode = typeof forcedMode === 'boolean' ? forcedMode : !Boolean(isTeamMode);
    setIsTeamMode(nextMode);
    localStorage.setItem('quiz_team_mode', String(nextMode));
    sendWsAction('toggle_team_mode', { is_team_mode: nextMode });

    if (pin) {
      fetch(apiUrl(`/api/sessions/${pin}/toggle-team-mode/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_team_mode: nextMode }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && typeof data.is_team_mode === 'boolean') {
            setIsTeamMode(data.is_team_mode);
            localStorage.setItem('quiz_team_mode', String(data.is_team_mode));
          }
        })
        .catch((e) => console.log('REST toggle_team_mode error:', e));
    }
  };

  // Host Action: Kick Player from Lobby
  const handleKickPlayer = (playerId) => {
    soundManager.playClick();
    sendWsAction('kick_player', { player_id: playerId });
  };

  // Player Action: Join Game
  const handlePlayerJoin = async (playerData) => {
    soundManager.playClick();
    const targetPin = (playerData.pin || pin || '').trim();
    setJoinError('');
    setIsJoining(true);

    if (!targetPin || targetPin.length !== 6) {
      setJoinError("Iltimos, 6 xonali o'yin PIN kodini kiriting!");
      setIsJoining(false);
      return;
    }

    try {
      // 1. Check if session exists on backend
      const checkRes = await fetch(apiUrl(`/api/sessions/${targetPin}/`));
      if (!checkRes.ok) {
        setJoinError(`"${targetPin}" PIN kodli o'yin topilmadi! Iltimos, kodni to'g'ri kiritganingizni tekshiring.`);
        setIsJoining(false);
        return;
      }
      const sessionData = await checkRes.json();
      applySessionData(sessionData);
      setPin(targetPin);

      // Enforce Room Mode based on Host session
      const isRoomTeamMode = Boolean(sessionData.is_team_mode);
      setIsTeamMode(isRoomTeamMode);
      localStorage.setItem('quiz_team_mode', String(isRoomTeamMode));

      if (isRoomTeamMode && !playerData.team_name) {
        setJoinError("Ushbu musobaqa jamoaviy! Iltimos, o'zingizga bitta jamoa tanlang.");
        setIsJoining(false);
        return;
      }

      // 2. Connect WebSocket to the room
      connectWebSocket(targetPin);

      // Check if player has saved player_token from previous session for reconnecting
      let savedToken = null;
      try {
        const savedPlayer = JSON.parse(localStorage.getItem('quiz_player') || '{}');
        if (savedPlayer.player_token) savedToken = savedPlayer.player_token;
      } catch (e) {}

      const joinPayload = {
        ...playerData,
        is_team_mode: isRoomTeamMode,
        team_name: isRoomTeamMode ? (playerData.team_name || 'Red Dragons') : '',
        team_color: isRoomTeamMode ? (playerData.team_color || '#ef4444') : '#ff6b00',
        ...(savedToken ? { player_token: savedToken } : {}),
      };

      // 3. Register player in session
      const joinRes = await fetch(apiUrl(`/api/sessions/${targetPin}/join/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(joinPayload),
      });

      if (joinRes.ok) {
        const joinData = await joinRes.json();
        const joinedPlayer = joinData.player || {
          id: `p_${Date.now()}`,
          nickname: playerData.nickname,
          avatar: playerData.avatar,
          customAvatar: playerData.customAvatar,
          team_name: playerData.team_name,
          team_color: playerData.team_color,
          score: 0,
          streak: 0,
        };

        // 4. Save to localStorage to persist across reloads
        localStorage.setItem('quiz_session_pin', targetPin);
        localStorage.setItem('quiz_player', JSON.stringify(joinedPlayer));
        localStorage.setItem('quiz_role', 'player');

        setCurrentPlayer(joinedPlayer);
        currentPlayerRef.current = joinedPlayer;
        setRole('player');
        setPlayers((prev) => [...prev.filter((p) => p.nickname !== joinedPlayer.nickname), joinedPlayer]);
      } else {
        const errJson = await joinRes.json().catch(() => ({}));
        setJoinError(errJson.error || "O'yinga qo'shilishda xatolik yuz berdi.");
      }
    } catch (err) {
      console.error('Join error:', err);
      setJoinError("Serverga ulanishda xatolik yuz berdi. Internetni tekshiring.");
    } finally {
      setIsJoining(false);
    }
  };

  // Action: Leave/Exit Game Session (cleanly reset socket, PIN, status, players, and return to join/host home)
  const handleLeaveGame = () => {
    soundManager.playClick();
    clearTimeout(autoLeaderboardTimeoutRef.current);
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    // Notify server to remove player from participants list
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && currentPlayerRef.current) {
      sendWsAction('leave_game', { player_id: currentPlayerRef.current.id });
    }
    if (socketRef.current) {
      try {
        socketRef.current.onclose = null; // Do not trigger auto-reconnect on deliberate leave
        socketRef.current.close();
      } catch (e) {}
    }
    setPin('');
    localStorage.removeItem('quiz_session_pin');
    localStorage.removeItem('quiz_player');
    setCurrentPlayer(null);
    currentPlayerRef.current = null;
    setSelectedOptionId(null);
    selectedOptionIdRef.current = null;
    setAnswerResult(null);
    answerResultRef.current = null;
    setSessionStatus('lobby');
    setCurrentQuestion(null);
    setCurrentQuestionIndex(0);
    setAnsweredCount(0);
    setAnswerStats(null);
    setCorrectOptionId(null);
    setJoinError('');
    setIsJoining(false);
  };

  // Player Action: Update Avatar (while in lobby)
  const handleUpdateAvatar = (newAvatar) => {
    if (!currentPlayer) return;
    const updatedPlayer = { ...currentPlayer, customAvatar: newAvatar, avatar: newAvatar.bodyType };
    setCurrentPlayer(updatedPlayer);
    currentPlayerRef.current = updatedPlayer;
    localStorage.setItem('quiz_player', JSON.stringify(updatedPlayer));

    // Notify server via WebSocket
    sendWsAction('update_avatar', {
      player_id: currentPlayer.id,
      customAvatar: newAvatar,
    });

    // REST Fallback for reliable cross-device avatar sync
    if (pin) {
      fetch(apiUrl(`/api/sessions/${pin}/player/avatar/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: currentPlayer.id,
          customAvatar: newAvatar,
        }),
      }).catch((e) => console.warn('Avatar REST update error:', e));
    }
  };

  // Host Action: Stop / Cancel Active Competition
  const handleStopCompetition = async (mode = 'lobby') => {
    soundManager.playClick();
    clearTimeout(autoLeaderboardTimeoutRef.current);
    setIsStopGameModalOpen(false);

    sendWsAction('stop_game', { mode });

    if (pin) {
      fetch(apiUrl(`/api/sessions/${pin}/stop/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      }).catch((e) => console.warn('Stop competition REST error:', e));
    }

    if (mode === 'cancel') {
      handleLeaveGame();
    } else {
      setSessionStatus('lobby');
      setCurrentQuestion(null);
      setCurrentQuestionIndex(0);
      setAnsweredCount(0);
      setAnswerStats(null);
      setCorrectOptionId(null);
      setSelectedOptionId(null);
      setAnswerResult(null);
    }
  };

  // Player Action: Select Option
  const handleSelectOption = (optionId) => {
    soundManager.playClick();
    setSelectedOptionId(optionId);
    selectedOptionIdRef.current = optionId;

    const payload = {
      player_id: currentPlayer?.id,
      question_id: currentQuestion?.id,
      option_id: optionId,
    };

    // ELIMINATE DUAL SUBMISSION RACE CONDITION:
    // Prefer WebSocket submission if connected
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendWsAction('submit_answer', payload);
    } else if (pin) {
      // Fallback to REST only if WebSocket is disconnected
      fetch(apiUrl(`/api/sessions/${pin}/answer/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setAnswerResult(data);
            answerResultRef.current = data;
          }
        })
        .catch((e) => console.log('REST answer error:', e));
    }

    setAnsweredCount((prev) => {
      const next = prev + 1;
      const total = players?.length || 1;
      // If standalone/offline or local test, end question immediately when everyone answered:
      if ((!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) && next >= total) {
        clearInterval(timerRef.current);
        setTimeLeft(0);
        setTimeout(() => {
          handleEndQuestion();
        }, 120);
      }
      return next;
    });
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  // Toggle Role (Host vs Player) - Only authenticated users can become Host!
  const handleToggleRole = (newRole) => {
    if (newRole === 'host' && !authUser) {
      setAuthModalTab('login');
      setIsAuthModalOpen(true);
      return;
    }
    setRole(newRole);
    localStorage.setItem('quiz_role', newRole);
    if (newRole === 'host' && !pin) {
      createBackendSession();
    }
  };

  // Auth Handlers
  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    localStorage.setItem('quiz_auth_user', JSON.stringify(user));
    setRole('host');
    localStorage.setItem('quiz_role', 'host');
    soundManager.playCorrect();
    if (!pin) {
      createBackendSession();
    }
  };

  const handleLogout = async () => {
    soundManager.playClick();
    try {
      await fetch(apiUrl('/api/auth/logout/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authUser?.id ? { 'X-User-Id': String(authUser.id) } : {}),
        },
        credentials: 'include',
      });
    } catch (e) {
      console.warn('Logout error:', e);
    }
    // Cleanly wipe all auth and session data
    setAuthUser(null);
    localStorage.removeItem('quiz_auth_user');
    handleLeaveGame();
    setRole('player');
    localStorage.setItem('quiz_role', 'player');
  };

  const handleOpenAuth = (initialTab = 'login') => {
    setAuthModalTab(initialTab);
    setIsAuthModalOpen(true);
  };

  // Select Quiz from Modal
  const handleSelectQuiz = async (quizId, asPlayer = false) => {
    try {
      let res;
      const currentToken = getHostToken(pin);
      // If host has an active lobby session, switch the quiz for current room so players stay in room!
      if (pin && role === 'host' && !asPlayer) {
        res = await fetch(apiUrl(`/api/sessions/${pin}/switch-quiz/`), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'X-Host-Token': currentToken } : {}),
          },
          body: JSON.stringify({ quiz_id: quizId, host_token: currentToken }),
        });
      }
      if (!res || !res.ok) {
        res = await fetch(apiUrl('/api/sessions/create/'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quiz_id: quizId, is_team_mode: isTeamMode }),
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (data.host_token) {
          saveHostToken(data.pin, data.host_token);
        }
        applySessionData(data);
        if (asPlayer) {
          setRole('player');
          localStorage.setItem('quiz_role', 'player');
          if (!currentPlayer) {
            setPin(data.pin);
          }
        } else {
          setRole('host');
          localStorage.setItem('quiz_role', 'host');
        }
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
          onBackToHost={() => handleToggleRole('host')}
          onToggleTeamMode={handleToggleTeamMode}
          joinError={joinError}
          isJoining={isJoining}
          authUser={authUser}
          onOpenAuth={handleOpenAuth}
        />
      );
    }

    if (sessionStatus === 'lobby') {
      return (
        <PlayerWaitingLobby
          currentPlayer={currentPlayer}
          quizTitle={quizTitle}
          isTeamMode={isTeamMode}
          playersCount={players.length}
          onUpdateAvatar={handleUpdateAvatar}
          onLeaveGame={handleLeaveGame}
        />
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
          onLeaveGame={handleLeaveGame}
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
          onLeaveGame={handleLeaveGame}
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
          onGoHome={handleLeaveGame}
        />
      );
    }

    return null;
  };

  return (
    <div className="app-root">
      {/* Background Ambient Radial Glows */}
      <div className="ambient-orb-1" />
      <div className="ambient-orb-2" />

      {/* Top Navbar */}
      <Navbar
        playersCount={players.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        role={role}
        onToggleRole={handleToggleRole}
        hostName={authUser ? (authUser.name || authUser.username) : 'Host'}
        pin={pin}
        currentPlayer={currentPlayer}
        onLeaveGame={handleLeaveGame}
        authUser={authUser}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
      />

      {/* Main Content Area: If logged in and role === 'host', show host dashboard; otherwise show Player view */}
      {authUser && role === 'host' ? (
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
            onLeaveGame={handleLeaveGame}
            onLogout={handleLogout}
            onStopCompetition={() => setIsStopGameModalOpen(true)}
            sessionStatus={sessionStatus}
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
              allQuestions={allQuestions}
              onOpenQuizModal={() => setIsQuizModalOpen(true)}
              onStartQuestion={handleStartQuestion}
              onAddBotPlayers={handleAddBotPlayers}
              onToggleTeamMode={handleToggleTeamMode}
              onJoinAsPlayer={() => handleToggleRole('player')}
              onLeaveGame={handleLeaveGame}
              onKickPlayer={handleKickPlayer}
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
              onLeaveGame={handleLeaveGame}
              onStopCompetition={() => setIsStopGameModalOpen(true)}
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
                onLeaveGame={handleLeaveGame}
                onStopCompetition={() => setIsStopGameModalOpen(true)}
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
                onGoHome={handleLeaveGame}
              />
            </div>
          )}
        </main>
      ) : (
        <main className="player-layout-container">
          {renderPlayerContent()}
        </main>
      )}

      {/* Quiz Manager & Creator Modal (only for hosts) */}
      <QuizManagerModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        currentQuizId={null}
        onSelectQuiz={handleSelectQuiz}
        authUser={authUser}
      />

      {/* Stop Game Confirmation Modal (for host) */}
      <StopGameModal
        isOpen={isStopGameModalOpen}
        onClose={() => setIsStopGameModalOpen(false)}
        onStopToLobby={() => handleStopCompetition('lobby')}
        onStopCancel={() => handleStopCompetition('cancel')}
      />

      {/* Auth Modal (Login & Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
