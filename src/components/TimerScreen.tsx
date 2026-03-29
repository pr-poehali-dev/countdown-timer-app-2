import { useState, useEffect, useRef, useCallback } from "react";
import { Client, Session, AppSettings } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  clients: Client[];
  settings: AppSettings;
  onSessionEnd: (session: Session) => void;
}

export default function TimerScreen({ clients, settings, onSessionEnd }: Props) {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paidHours, setPaidHours] = useState(1);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [warned, setWarned] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const selectedClientRef = useRef<Client | null>(null);
  selectedClientRef.current = selectedClient;

  const totalSeconds = paidHours * 3600;
  const elapsed = startTime ? totalSeconds - secondsLeft : 0;
  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;

  const playBeep = useCallback((frequency = 880, duration = 0.8) => {
    if (!settings.soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_e) {
      /* ignore */
    }
  }, [settings.soundEnabled]);

  const announceExpired = useCallback((clientName: string) => {
    if (!settings.soundEnabled) return;
    // Три коротких сигнала
    [0, 0.4, 0.8].forEach((delay) => {
      setTimeout(() => playBeep(660, 0.25), delay * 1000);
    });
    // Голосовое объявление после сигналов
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Время вышло. ${clientName}, пожалуйста, пополните счёт.`
        );
        utterance.lang = "ru-RU";
        utterance.rate = 0.95;
        utterance.pitch = 1;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    }, 1300);
  }, [settings.soundEnabled, playBeep]);

  useEffect(() => {
    if (!running || paused) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          const name = selectedClientRef.current?.name ?? "";
          announceExpired(name);
          return 0;
        }
        const newVal = s - 1;
        const warningThreshold = settings.warningMinutes * 60;
        if (!warned && newVal <= warningThreshold) {
          setWarned(true);
          playBeep();
          if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
            new Notification("⏰ Скоро конец оплаченного времени!", {
              body: `Осталось ${settings.warningMinutes} мин.`,
            });
          }
        }
        return newVal;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, paused, settings, warned, playBeep, announceExpired]);

  const handleStart = () => {
    if (!selectedClient) return;
    setSecondsLeft(paidHours * 3600);
    setStartTime(new Date());
    setRunning(true);
    setPaused(false);
    setWarned(false);
    if (settings.notificationsEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  };

  const handlePause = () => {
    setPaused((p) => !p);
  };

  const handleStop = () => {
    if (!selectedClient || !startTime) return;
    const endTime = new Date();
    const duration = totalSeconds - secondsLeft;
    const cost = Math.ceil((duration / 3600) * selectedClient.rate);
    onSessionEnd({
      id: Date.now().toString(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      startTime,
      endTime,
      duration,
      cost,
    });
    setRunning(false);
    setPaused(false);
    setSecondsLeft(0);
    setStartTime(null);
    setWarned(false);
  };

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const isWarning = running && secondsLeft <= settings.warningMinutes * 60 && secondsLeft > 0;
  const isExpired = running && secondsLeft === 0;

  const circumference = 2 * Math.PI * 120;
  const strokeDash = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center min-h-screen px-6 pt-10 pb-4 gap-8">
      <div className="w-full">
        <h1 className="text-sm font-medium text-app-muted tracking-widest uppercase mb-4">
          Активный клиент
        </h1>
        <div className="flex gap-2 flex-wrap">
          {clients.map((c) => (
            <button
              key={c.id}
              onClick={() => !running && setSelectedClient(c)}
              disabled={running}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                selectedClient?.id === c.id
                  ? "bg-app-accent text-app-bg border-app-accent"
                  : "bg-transparent text-app-text border-app-border hover:border-app-accent/50 disabled:opacity-40"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-2"
                style={{ background: c.color }}
              />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex items-center justify-center">
        <svg width="280" height="280" className="-rotate-90">
          <circle
            cx="140" cy="140" r="120"
            fill="none"
            stroke="hsl(var(--app-border-hsl))"
            strokeWidth="3"
          />
          <circle
            cx="140" cy="140" r="120"
            fill="none"
            stroke={isWarning ? "#FBBF24" : isExpired ? "#EF4444" : "var(--app-accent)"}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute flex flex-col items-center gap-1">
          <span
            className={`text-6xl font-light tabular-nums tracking-tight transition-colors duration-500 ${
              isWarning ? "text-yellow-400" : isExpired ? "text-red-400" : "text-app-text"
            }`}
          >
            {running ? fmt(secondsLeft) : fmt(paidHours * 3600)}
          </span>
          {selectedClient && (
            <span className="text-xs text-app-muted mt-1">
              {selectedClient.name} · {selectedClient.rate} ₽/ч
            </span>
          )}
          {isWarning && (
            <span className="text-xs text-yellow-400 animate-pulse mt-1">
              ⚠ Скоро конец времени
            </span>
          )}
          {isExpired && (
            <span className="text-xs text-red-400 animate-pulse mt-1">
              Время истекло!
            </span>
          )}
        </div>
      </div>

      {!running && (
        <div className="w-full">
          <p className="text-sm text-app-muted mb-3 tracking-widest uppercase">Оплачено часов</p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPaidHours((h) => Math.max(0.5, h - 0.5))}
              className="w-10 h-10 rounded-full border border-app-border flex items-center justify-center text-app-text hover:border-app-accent transition-colors"
            >
              <Icon name="Minus" size={16} />
            </button>
            <span className="text-3xl font-light tabular-nums w-16 text-center">
              {paidHours % 1 === 0 ? paidHours : paidHours.toFixed(1)}
            </span>
            <button
              onClick={() => setPaidHours((h) => Math.min(12, h + 0.5))}
              className="w-10 h-10 rounded-full border border-app-border flex items-center justify-center text-app-text hover:border-app-accent transition-colors"
            >
              <Icon name="Plus" size={16} />
            </button>
            <span className="text-app-muted text-sm">
              {selectedClient ? `= ${(paidHours * selectedClient.rate).toLocaleString("ru")} ₽` : ""}
            </span>
          </div>
        </div>
      )}

      <div className="w-full flex gap-3">
        {!running ? (
          <button
            onClick={handleStart}
            disabled={!selectedClient}
            className="flex-1 h-14 rounded-2xl bg-app-accent text-app-bg font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-30 transition-all hover:opacity-90 active:scale-95"
          >
            <Icon name="Play" size={20} />
            Начать сеанс
          </button>
        ) : (
          <>
            <button
              onClick={handlePause}
              className="flex-1 h-14 rounded-2xl border border-app-border text-app-text font-semibold flex items-center justify-center gap-2 hover:border-app-accent/50 active:scale-95 transition-all"
            >
              <Icon name={paused ? "Play" : "Pause"} size={20} />
              {paused ? "Продолжить" : "Пауза"}
            </button>
            <button
              onClick={handleStop}
              className="flex-1 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20 active:scale-95 transition-all"
            >
              <Icon name="Square" size={20} />
              Завершить
            </button>
          </>
        )}
      </div>
    </div>
  );
}