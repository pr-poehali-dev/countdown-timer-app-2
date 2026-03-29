import { Session } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  history: Session[];
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} ч ${m} мин`;
  if (h > 0) return `${h} ч`;
  return `${m} мин`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function groupByDate(sessions: Session[]) {
  const groups: Record<string, Session[]> = {};
  sessions.forEach((s) => {
    const key = new Intl.DateTimeFormat("ru", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(s.startTime);
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return groups;
}

export default function HistoryScreen({ history }: Props) {
  const groups = groupByDate(history);
  const totalCost = history.reduce((sum, s) => sum + s.cost, 0);
  const totalDuration = history.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="px-6 pt-10 pb-4">
      <h1 className="text-xl font-semibold tracking-tight mb-4">История</h1>

      {history.length > 0 && (
        <div className="bg-app-card border border-app-border rounded-2xl p-4 flex gap-6 mb-6">
          <div>
            <p className="text-xs text-app-muted uppercase tracking-wider">Всего сеансов</p>
            <p className="text-2xl font-light mt-1">{history.length}</p>
          </div>
          <div className="w-px bg-app-border" />
          <div>
            <p className="text-xs text-app-muted uppercase tracking-wider">Общее время</p>
            <p className="text-2xl font-light mt-1">{formatDuration(totalDuration)}</p>
          </div>
          <div className="w-px bg-app-border" />
          <div>
            <p className="text-xs text-app-muted uppercase tracking-wider">Выручка</p>
            <p className="text-2xl font-light mt-1 text-app-accent">
              {totalCost.toLocaleString("ru")} ₽
            </p>
          </div>
        </div>
      )}

      {Object.entries(groups).map(([date, sessions]) => (
        <div key={date} className="mb-6">
          <p className="text-xs text-app-muted uppercase tracking-wider mb-3">{date}</p>
          <div className="flex flex-col gap-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-app-card border border-app-border rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-app-accent/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Clock" size={16} className="text-app-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-app-text text-sm truncate">{s.clientName}</p>
                  <p className="text-xs text-app-muted mt-0.5">
                    {formatDate(s.startTime)} · {formatDuration(s.duration)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold text-app-accent text-sm">
                    {s.cost.toLocaleString("ru")} ₽
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {history.length === 0 && (
        <div className="text-center py-16 text-app-muted">
          <Icon name="ClipboardList" size={40} />
          <p className="mt-3 text-sm">История пуста</p>
        </div>
      )}
    </div>
  );
}
