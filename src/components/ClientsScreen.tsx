import { useState } from "react";
import { Client } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

const COLORS = ["#6EE7B7", "#93C5FD", "#FCA5A5", "#FCD34D", "#C4B5FD", "#F9A8D4"];

const emptyClient = (): Omit<Client, "id"> => ({
  name: "",
  balance: 0,
  rate: 500,
  color: COLORS[0],
});

export default function ClientsScreen({ clients, setClients }: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyClient());

  const openAdd = () => {
    setForm(emptyClient());
    setAdding(true);
    setEditing(null);
  };

  const openEdit = (c: Client) => {
    setForm({ name: c.name, balance: c.balance, rate: c.rate, color: c.color });
    setEditing(c);
    setAdding(true);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing) {
      setClients((prev) =>
        prev.map((c) => (c.id === editing.id ? { ...c, ...form } : c))
      );
    } else {
      setClients((prev) => [
        ...prev,
        { id: Date.now().toString(), ...form },
      ]);
    }
    setAdding(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  };

  const hoursLeft = (c: Client) => c.balance;

  return (
    <div className="px-6 pt-10 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Клиенты</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-app-accent text-app-bg text-sm font-medium hover:opacity-90 transition-all"
        >
          <Icon name="Plus" size={16} />
          Добавить
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {clients.map((c) => {
          const hours = hoursLeft(c);
          const isLow = hours < 1;
          return (
            <div
              key={c.id}
              className="bg-app-card border border-app-border rounded-2xl p-4 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-app-bg font-bold text-sm flex-shrink-0"
                style={{ background: c.color }}
              >
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-app-text truncate">{c.name}</p>
                <p className="text-xs text-app-muted mt-0.5">{c.rate} ₽/час</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p
                  className={`font-semibold text-sm ${
                    isLow ? "text-red-400" : "text-app-accent"
                  }`}
                >
                  {hours % 1 === 0 ? hours : hours.toFixed(1)} ч
                </p>
                <p className="text-xs text-app-muted">
                  {(hours * c.rate).toLocaleString("ru")} ₽
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(c)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-app-muted hover:text-app-text hover:bg-app-border/50 transition-colors"
                >
                  <Icon name="Pencil" size={14} />
                </button>
                <button
                  onClick={() => remove(c.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-app-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {clients.length === 0 && (
          <div className="text-center py-16 text-app-muted">
            <Icon name="Users" size={40} />
            <p className="mt-3 text-sm">Нет клиентов</p>
          </div>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
          <div className="bg-app-card w-full rounded-t-3xl p-6 flex flex-col gap-4 animate-fade-in">
            <div className="w-10 h-1 bg-app-border rounded-full mx-auto mb-2" />
            <h2 className="text-lg font-semibold">
              {editing ? "Редактировать клиента" : "Новый клиент"}
            </h2>

            <div>
              <label className="text-xs text-app-muted uppercase tracking-wider">Имя</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Имя клиента"
                className="w-full mt-1 bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-accent transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-app-muted uppercase tracking-wider">Тариф (₽/ч)</label>
                <input
                  type="number"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: Number(e.target.value) }))}
                  className="w-full mt-1 bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-accent transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-app-muted uppercase tracking-wider">Баланс (ч)</label>
                <input
                  type="number"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: Number(e.target.value) }))}
                  className="w-full mt-1 bg-app-bg border border-app-border rounded-xl px-4 py-3 text-app-text focus:outline-none focus:border-app-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-app-muted uppercase tracking-wider mb-2 block">Цвет</label>
              <div className="flex gap-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setForm((f) => ({ ...f, color: col }))}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      form.color === col ? "scale-125 ring-2 ring-white/50" : ""
                    }`}
                    style={{ background: col }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => { setAdding(false); setEditing(null); }}
                className="flex-1 h-12 rounded-2xl border border-app-border text-app-muted font-medium hover:text-app-text transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={save}
                disabled={!form.name.trim()}
                className="flex-1 h-12 rounded-2xl bg-app-accent text-app-bg font-semibold disabled:opacity-40 hover:opacity-90 transition-all"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
