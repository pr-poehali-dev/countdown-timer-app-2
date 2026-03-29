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
        const u = new SpeechSynthesisUtterance(`Время вышло. ${clientName}, пожалуйста, пополните счёт.`);
        u.lang = "ru-RU"; u.rate = 0.95;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    }, 1300);
  }, [soundEnabled, playBeep]);

  const announceWarning = useCallback((clientName: string, minutes: number) => {
    if (!soundEnabled) return;
    playBeep(880, 0.8);
    setTimeout(() => {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(`${clientName}, осталось ${minutes} минут.`);
        u.lang = "ru-RU"; u.rate = 0.95;
        speechSynthesis.cancel(); speechSynthesis.speak(u);
      }
    }, 1000);
  }, [soundEnabled, playBeep]);

  return { announceExpired, announceWarning };
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface RowProps {
  client: Client;
  timer: TimerState;
  settings: AppSettings;
  onStart: (clientId: string, hours: number) => void;
  onPause: (clientId: string) => void;
  onStop: (clientId: string) => void;
  onTick: (clientId: string, newSeconds: number) => void;
  onHoursChange: (clientId: string, newHours: number) => void;
  announceExpired: (name: string) => void;
  announceWarning: (name: string, minutes: number) => void;
}

function TimerRow({
  client, timer, settings,
  onStart, onPause, onStop, onTick, onHoursChange,
  announceExpired, announceWarning,
}: RowProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef(timer);
  timerRef.current = timer;

  const isWarning = timer.running && !timer.paused && timer.secondsLeft <= settings.warningMinutes * 60 && timer.secondsLeft > 0;
  const isExpired = !timer.running && timer.startTime !== null && timer.secondsLeft === 0;
  const isIdle = !timer.running && timer.startTime === null;
  const totalSeconds = timer.paidHours * 3600;
  const progress = totalSeconds > 0 ? Math.min(1, (totalSeconds - timer.secondsLeft) / totalSeconds) : 0;

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
          new Notification(`⏰ ${client.name} — время вышло!`, { body: "Необходимо пополнить счёт." });
        }
        return;
      }
      const newVal = t.secondsLeft - 1;
      if (!t.warned && newVal <= settings.warningMinutes * 60) {
        announceWarning(client.name, settings.warningMinutes);
        if (settings.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification(`⚠ ${client.name} — скоро конец времени`, { body: `Осталось ${settings.warningMinutes} мин.` });
        }
      }
      onTick(client.id, newVal);
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [timer.running, timer.paused]);

  const displaySeconds = isIdle ? timer.paidHours * 3600 : timer.secondsLeft;

  const timeColor = isExpired
    ? "text-red-400"
    : isWarning
    ? "text-yellow-400"
    : timer.running
    ? "text-app-text"
    : "text-app-muted";

  const rowBg = isExpired
    ? "bg-red-500/5 border-red-500/20"
    : isWarning
    ? "bg-yellow-500/5 border-yellow-500/20"
    : timer.running && !timer.paused
    ? "bg-app-card border-app-border"
    : "bg-app-card/50 border-app-border/50";

  return (
    <tr className={`border-b border-app-border/30 transition-colors duration-300`}>
      {/* Клиент */}
      <td className={`px-4 py-3 ${rowBg.includes("bg-") ? "" : ""}`}>
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: client.color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-app-text truncate leading-none">{client.name}</p>
            <p className="text-[11px] text-app-muted mt-0.5">{client.rate} ₽/ч</p>
          </div>
        </div>
      </td>

      {/* Время */}
      <td className="px-4 py-3 text-center">
        <span className={`text-lg font-light tabular-nums tracking-tight ${timeColor}`}>
          {fmt(displaySeconds)}
        </span>
        {/* Прогресс-бар под временем */}
        <div className="mt-1 h-0.5 rounded-full bg-white/5 overflow-hidden w-24 mx-auto">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress * 100}%`,
              background: isExpired ? "#EF4444" : isWarning ? "#FBBF24" : client.color,
            }}
          />
        </div>
      </td>

      {/* Статус */}
      <td className="px-3 py-3 text-center">
        {timer.running && !timer.paused && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-app-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
            Идёт
          </span>
        )}
        {timer.paused && (
          <span className="text-[10px] font-medium text-yellow-400">Пауза</span>
        )}
        {isExpired && (
          <span className="text-[10px] font-medium text-red-400 animate-pulse">Истекло</span>
        )}
        {isIdle && (
          <span className="text-[10px] text-app-muted">—</span>
        )}
      </td>

      {/* Часы (только idle) */}
      <td className="px-3 py-3 text-center">
        {isIdle ? (
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => onHoursChange(client.id, Math.max(0.5, timer.paidHours - 0.5))}
              className="w-6 h-6 rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-text transition-colors"
            >
              <Icon name="Minus" size={10} />
            </button>
            <span className="text-sm tabular-nums w-10 text-center text-app-text">
              {timer.paidHours % 1 === 0 ? timer.paidHours : timer.paidHours.toFixed(1)}ч
            </span>
            <button
              onClick={() => onHoursChange(client.id, Math.min(12, timer.paidHours + 0.5))}
              className="w-6 h-6 rounded-full border border-app-border flex items-center justify-center text-app-muted hover:text-app-text transition-colors"
            >
              <Icon name="Plus" size={10} />
            </button>
          </div>
        ) : (
          <span className="text-xs text-app-muted tabular-nums">
            {timer.paidHours % 1 === 0 ? timer.paidHours : timer.paidHours.toFixed(1)}ч
          </span>
        )}
      </td>

      {/* Действия */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          {isIdle && (
            <button
              onClick={() => onStart(client.id, timer.paidHours)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 hover:opacity-90"
              style={{ background: client.color, color: "#0E0E12" }}
            >
              <Icon name="Play" size={11} />
              Старт
            </button>
          )}
          {timer.running && (
            <button
              onClick={() => onPause(client.id)}
              className="w-7 h-7 rounded-lg border border-app-border flex items-center justify-center text-app-muted hover:text-app-text hover:border-app-accent/50 transition-all active:scale-95"
            >
              <Icon name={timer.paused ? "Play" : "Pause"} size={13} />
            </button>
          )}
          {(timer.running || isExpired) && (
            <button
              onClick={() => onStop(client.id)}
              className="w-7 h-7 rounded-lg border border-red-500/30 flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all active:scale-95"
            >
              <Icon name="Square" size={13} />
            </button>
          )}
        </div>
      </td>
    </tr>
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
      [clientId]: { ...prev[clientId], secondsLeft: hours * 3600, running: true, paused: false, startTime: new Date(), warned: false },
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
        const duration = t.paidHours * 3600 - t.secondsLeft;
        const cost = Math.ceil((duration / 3600) * client.rate);
        onSessionEnd({ id: Date.now().toString(), clientId, clientName: client.name, startTime: t.startTime, endTime: new Date(), duration, cost });
      }
      return { ...prev, [clientId]: { ...t, running: false, paused: false, secondsLeft: 0, startTime: null, warned: false } };
    });
  };

  const handleTick = useCallback((clientId: string, newSeconds: number) => {
    setTimers((prev) => {
      const t = prev[clientId];
      const isWarningNow = !t.warned && newSeconds <= settings.warningMinutes * 60;
      return { ...prev, [clientId]: { ...t, secondsLeft: newSeconds, warned: t.warned || isWarningNow } };
    });
  }, [settings.warningMinutes]);

  const handleHoursChange = (clientId: string, newHours: number) => {
    setTimers((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], paidHours: newHours, secondsLeft: newHours * 3600 },
    }));
  };

  const activeCount = Object.values(timers).filter((t) => t.running && !t.paused).length;
  const expiredCount = Object.values(timers).filter((t) => !t.running && t.startTime !== null && t.secondsLeft === 0).length;

  // Сортировка: истёкшие → активные → пауза → ожидание
  const sortedClients = [...clients].sort((a, b) => {
    const ta = timers[a.id];
    const tb = timers[b.id];
    const rank = (t: TimerState) => {
      if (!t.running && t.startTime !== null && t.secondsLeft === 0) return 0;
      if (t.running && !t.paused) return 1;
      if (t.paused) return 2;
      return 3;
    };
    return rank(ta) - rank(tb);
  });

  return (
    <div className="pt-10 pb-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between px-4 mb-5">
        <h1 className="text-xl font-semibold tracking-tight">Таймеры</h1>
        <div className="flex items-center gap-3">
          {expiredCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {expiredCount} истекло
            </span>
          )}
          {activeCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-app-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
              {activeCount} активн{activeCount === 1 ? "ый" : "ых"}
            </span>
          )}
        </div>
      </div>

      {/* Таблица */}
      {clients.length > 0 ? (
        <div className="mx-4 bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-app-border">
                <th className="px-4 py-2.5 text-left text-[10px] font-medium text-app-muted uppercase tracking-widest">Клиент</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-medium text-app-muted uppercase tracking-widest">Время</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-app-muted uppercase tracking-widest">Статус</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-medium text-app-muted uppercase tracking-widest">Часы</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-medium text-app-muted uppercase tracking-widest">Действие</th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((client) => {
                const timer = timers[client.id];
                if (!timer) return null;
                return (
                  <TimerRow
                    key={client.id}
                    client={client}
                    timer={timer}
                    settings={settings}
                    onStart={handleStart}
                    onPause={handlePause}
                    onStop={handleStop}
                    onTick={handleTick}
                    onHoursChange={handleHoursChange}
                    onSessionEnd={onSessionEnd}
                    announceExpired={announceExpired}
                    announceWarning={announceWarning}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 text-app-muted">
          <Icon name="Timer" size={40} />
          <p className="mt-3 text-sm">Добавьте клиентов во вкладке «Клиенты»</p>
        </div>
      )}
    </div>
  );
}
