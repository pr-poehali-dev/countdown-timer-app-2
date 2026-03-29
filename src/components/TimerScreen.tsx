import { useState, useEffect, useRef, useCallback } from "react";
import { Client, Session, AppSettings, TimerState } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  clients: Client[];
  settings: AppSettings;
  onSessionEnd: (session: Session) => void;
}

function useSound(soundEnabled: boolean) {
  const playBeep = useCallback((frequency = 880, duration = 0.8) => {
    if (!soundEnabled) return;
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
    } catch (_e) { /* ignore */ }
  }, [soundEnabled]);

  const announceExpired = useCallback((clientName: string) => {
    if (!soundEnabled) return;
    [0, 0.4, 0.8].forEach((delay) => {
      setTimeout(() => playBeep(660, 0.25), delay * 1000);
    });
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Время вышло. ${clientName}, пожалуйста, пополните счёт.`
        );
        utterance.lang = "ru-RU";
        utterance.rate = 0.95;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    }, 1300);
  }, [soundEnabled, playBeep]);

  const announceWarning = useCallback((clientName: string, minutes: number) => {
    if (!soundEnabled) return;
    playBeep(880, 0.8);
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          `${clientName}, осталось ${minutes} минут.`
        );
        utterance.lang = "ru-RU";
        utterance.rate = 0.95;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
      }
    }, 1000);
  }, [soundEnabled, playBeep]);

  return { playBeep, announceExpired, announceWarning };
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface CardProps {
  client: Client;
  timer: TimerState;
  settings: AppSettings;
  onStart: (clientId: string, hours: number) => void;
  onPause: (clientId: string) => void;
  onStop: (clientId: string) => void;
  onHoursChange: (clientId: string, hours: number) => void;
  onSessionEnd: (session: Session) => void;
  announceExpired: (name: string) => void;
  announceWarning: (name: string, minutes: number) => void;
}

function ClientTimerCard({
  client, timer, settings,
  onStart, onPause, onStop, onHoursChange,
  announceExpired, announceWarning,
}: CardProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const isWarning = timer.running && !timer.paused && timer.secondsLeft <= settings.warningMinutes * 60 && timer.secondsLeft > 0;
  const isExpired = timer.secondsLeft === 0 && timer.startTime !== null && !timer.running;
  const totalSeconds = timer.paidHours * 3600;
  const elapsed = totalSeconds - timer.secondsLeft;
  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;

  const circumference = 2 * Math.PI * 52;
  const strokeDash = circumference * (1 - progress);

  const accentColor = isWarning ? "#FBBF24" : isExpired ? "#EF4444" : client.color;

  useEffect(() => {
    if (!timer.running || timer.paused) {
      clearInterval(intervalRef.current!);
      return;
    }
    intervalRef.current = setInterval(() => {
      const t = timerRef.current;
      if (!t.running || t.paused) return;
      if (t.secondsLeft <= 1) {
        clearInterval(intervalRef.current!);
        onStop(client.id);
        announceExpired(client.name);
        if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification(`⏰ ${client.name} — время вышло!`, {
            body: "Необходимо пополнить счёт.",
          });
        }
        return;
      }
      const newVal = t.secondsLeft - 1;
      const warningThreshold = settings.warningMinutes * 60;
      if (!t.warned && newVal <= warningThreshold) {
        announceWarning(client.name, settings.warningMinutes);
        if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification(`⚠ ${client.name} — скоро конец времени`, {
            body: `Осталось ${settings.warningMinutes} мин.`,
          });
        }
      }
      // Обновляем через глобальный колбэк
      onHoursChange(client.id, newVal);
    }, 1000);

    return () => clearInterval(intervalRef.current!);
  }, [timer.running, timer.paused]);

  return (
    <div
      className={`bg-app-card border rounded-2xl p-4 transition-all duration-300 ${
        isExpired
          ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
          : isWarning
          ? "border-yellow-500/40 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
          : timer.running
          ? "border-app-border shadow-[0_0_20px_rgba(110,231,183,0.08)]"
          : "border-app-border"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Круговой прогресс */}
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={accentColor}
              strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDash}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-lg font-light tabular-nums transition-colors duration-300 ${
              isWarning ? "text-yellow-400" : isExpired ? "text-red-400" : "text-app-text"
            }`}>
              {fmt(timer.running || timer.startTime ? timer.secondsLeft : timer.paidHours * 3600)}
            </span>
          </div>
        </div>

        {/* Инфо и управление */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: client.color }}
            />
            <p className="font-semibold text-app-text truncate">{client.name}</p>
            {timer.running && !timer.paused && (
              <span className="ml-auto flex items-center gap-1 text-[10px] text-app-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
                идёт
              </span>
            )}
            {timer.paused && (
              <span className="ml-auto text-[10px] text-yellow-400">пауза</span>
            )}
            {isExpired && (
              <span className="ml-auto text-[10px] text-red-400 animate-pulse">истекло!</span>
            )}
          </div>

          <p className="text-xs text-app-muted mb-3">{client.rate} ₽/ч</p>

          {/* Контролы */}
          {!timer.running && !timer.startTime && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onHoursChange(client.id, Math.max(0.5, timer.paidHours - 0.5) * 3600)}
                className="w-7 h-7 rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-text hover:border-app-accent/50 transition-colors"
              >
                <Icon name="Minus" size={12} />
              </button>
              <span className="text-sm tabular-nums w-12 text-center text-app-text">
                {timer.paidHours % 1 === 0 ? timer.paidHours : timer.paidHours.toFixed(1)} ч
              </span>
              <button
                onClick={() => onHoursChange(client.id, Math.min(12, timer.paidHours + 0.5) * 3600)}
                className="w-7 h-7 rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-text hover:border-app-accent/50 transition-colors"
              >
                <Icon name="Plus" size={12} />
              </button>
              <span className="text-xs text-app-muted">
                = {(timer.paidHours * client.rate).toLocaleString("ru")} ₽
              </span>
            </div>
          )}

          <div className="flex gap-2">
            {!timer.running && !timer.startTime && (
              <button
                onClick={() => onStart(client.id, timer.paidHours)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                style={{ background: client.color, color: "#0E0E12" }}
              >
                <Icon name="Play" size={12} />
                Старт
              </button>
            )}
            {timer.running && (
              <button
                onClick={() => onPause(client.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border text-xs font-medium text-app-text hover:border-app-accent/50 transition-all active:scale-95"
              >
                <Icon name={timer.paused ? "Play" : "Pause"} size={12} />
                {timer.paused ? "Продолжить" : "Пауза"}
              </button>
            )}
            {(timer.running || isExpired) && (
              <button
                onClick={() => onStop(client.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
              >
                <Icon name="Square" size={12} />
                Завершить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimerScreen({ clients, settings, onSessionEnd }: Props) {
  const { announceExpired, announceWarning } = useSound(settings.soundEnabled);

  const [timers, setTimers] = useState<Record<string, TimerState>>(() =>
    Object.fromEntries(
      clients.map((c) => [
        c.id,
        { clientId: c.id, paidHours: 1, secondsLeft: 3600, running: false, paused: false, startTime: null, warned: false },
      ])
    )
  );

  // Синхронизируем новых клиентов
  useEffect(() => {
    setTimers((prev) => {
      const next = { ...prev };
      clients.forEach((c) => {
        if (!next[c.id]) {
          next[c.id] = { clientId: c.id, paidHours: 1, secondsLeft: 3600, running: false, paused: false, startTime: null, warned: false };
        }
      });
      return next;
    });
  }, [clients]);

  const handleStart = (clientId: string, hours: number) => {
    setTimers((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        secondsLeft: hours * 3600,
        running: true,
        paused: false,
        startTime: new Date(),
        warned: false,
      },
    }));
    if (settings.notificationsEnabled && "Notification" in window) {
      Notification.requestPermission();
    }
  };

  const handlePause = (clientId: string) => {
    setTimers((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], paused: !prev[clientId].paused },
    }));
  };

  const handleStop = (clientId: string) => {
    setTimers((prev) => {
      const t = prev[clientId];
      const client = clients.find((c) => c.id === clientId);
      if (t.startTime && client) {
        const totalSec = t.paidHours * 3600;
        const duration = totalSec - t.secondsLeft;
        const cost = Math.ceil((duration / 3600) * client.rate);
        onSessionEnd({
          id: Date.now().toString(),
          clientId,
          clientName: client.name,
          startTime: t.startTime,
          endTime: new Date(),
          duration,
          cost,
        });
      }
      return {
        ...prev,
        [clientId]: { ...t, running: false, paused: false, secondsLeft: 0, startTime: null, warned: false },
      };
    });
  };

  // Колбэк обновления секунд из карточки
  const handleTick = useCallback((clientId: string, newSecondsLeft: number) => {
    setTimers((prev) => {
      const t = prev[clientId];
      const isWarningNow = !t.warned && newSecondsLeft <= settings.warningMinutes * 60;
      return {
        ...prev,
        [clientId]: {
          ...t,
          secondsLeft: newSecondsLeft,
          warned: t.warned || isWarningNow,
        },
      };
    });
  }, [settings.warningMinutes]);

  // Изменение часов до старта
  const handleHoursChange = (clientId: string, rawValue: number) => {
    const t = timers[clientId];
    if (t.running || t.startTime) {
      handleTick(clientId, rawValue);
      return;
    }
    const hours = rawValue / 3600;
    setTimers((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], paidHours: hours, secondsLeft: rawValue },
    }));
  };

  const activeCount = Object.values(timers).filter((t) => t.running).length;

  return (
    <div className="px-4 pt-10 pb-4">
      <div className="flex items-center justify-between mb-6 px-2">
        <h1 className="text-xl font-semibold tracking-tight">Таймеры</h1>
        {activeCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-app-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
            {activeCount} активн{activeCount === 1 ? "ый" : activeCount < 5 ? "ых" : "ых"}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {clients.map((client) => {
          const timer = timers[client.id];
          if (!timer) return null;
          return (
            <ClientTimerCard
              key={client.id}
              client={client}
              timer={timer}
              settings={settings}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onHoursChange={handleHoursChange}
              onSessionEnd={onSessionEnd}
              announceExpired={announceExpired}
              announceWarning={announceWarning}
            />
          );
        })}

        {clients.length === 0 && (
          <div className="text-center py-20 text-app-muted">
            <Icon name="Timer" size={40} />
            <p className="mt-3 text-sm">Добавьте клиентов во вкладке «Клиенты»</p>
          </div>
        )}
      </div>
    </div>
  );
}
