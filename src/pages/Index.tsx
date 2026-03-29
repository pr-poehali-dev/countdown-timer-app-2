import { useState } from "react";
import TimerScreen from "@/components/TimerScreen";
import ClientsScreen from "@/components/ClientsScreen";
import HistoryScreen from "@/components/HistoryScreen";
import SettingsScreen from "@/components/SettingsScreen";
import Icon from "@/components/ui/icon";

export type Client = {
  id: string;
  name: string;
  balance: number;
  rate: number;
  color: string;
};

export type Session = {
  id: string;
  clientId: string;
  clientName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  cost: number;
};

export type AppSettings = {
  warningMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
};

const INITIAL_CLIENTS: Client[] = [
  { id: "1", name: "Анна Смирнова", balance: 120, rate: 500, color: "#6EE7B7" },
  { id: "2", name: "Дмитрий Козлов", balance: 45, rate: 400, color: "#93C5FD" },
  { id: "3", name: "Мария Иванова", balance: 200, rate: 600, color: "#FCA5A5" },
];

const INITIAL_HISTORY: Session[] = [
  {
    id: "h1",
    clientId: "1",
    clientName: "Анна Смирнова",
    startTime: new Date(Date.now() - 3600000 * 25),
    endTime: new Date(Date.now() - 3600000 * 24),
    duration: 3600,
    cost: 500,
  },
  {
    id: "h2",
    clientId: "2",
    clientName: "Дмитрий Козлов",
    startTime: new Date(Date.now() - 3600000 * 5),
    endTime: new Date(Date.now() - 3600000 * 3),
    duration: 7200,
    cost: 800,
  },
];

type Tab = "timer" | "clients" | "history" | "settings";

export default function Index() {
  const [tab, setTab] = useState<Tab>("timer");
  const [clients, setClients] = useState<Client[]>(INITIAL_CLIENTS);
  const [history, setHistory] = useState<Session[]>(INITIAL_HISTORY);
  const [settings, setSettings] = useState<AppSettings>({
    warningMinutes: 10,
    soundEnabled: true,
    notificationsEnabled: true,
  });

  const addSession = (session: Session) => {
    setHistory((prev) => [session, ...prev]);
    setClients((prev) =>
      prev.map((c) =>
        c.id === session.clientId
          ? { ...c, balance: Math.max(0, c.balance - Math.floor(session.duration / 3600)) }
          : c
      )
    );
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "timer", label: "Таймер", icon: "Timer" },
    { id: "clients", label: "Клиенты", icon: "Users" },
    { id: "history", label: "История", icon: "ClipboardList" },
    { id: "settings", label: "Настройки", icon: "SlidersHorizontal" },
  ];

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col font-golos">
      <main className="flex-1 overflow-auto pb-20">
        {tab === "timer" && (
          <TimerScreen clients={clients} settings={settings} onSessionEnd={addSession} />
        )}
        {tab === "clients" && (
          <ClientsScreen clients={clients} setClients={setClients} />
        )}
        {tab === "history" && <HistoryScreen history={history} />}
        {tab === "settings" && (
          <SettingsScreen settings={settings} setSettings={setSettings} />
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-app-card border-t border-app-border flex">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 relative transition-all duration-200 ${
              tab === t.id ? "text-app-accent" : "text-app-muted hover:text-app-text"
            }`}
          >
            <Icon name={t.icon} size={20} />
            <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
            {tab === t.id && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-app-accent rounded-t-full" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
