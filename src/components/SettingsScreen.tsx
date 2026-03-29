import { AppSettings } from "@/pages/Index";
import Icon from "@/components/ui/icon";

interface Props {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
        value ? "bg-app-accent" : "bg-app-border"
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 shadow-sm ${
          value ? "left-7" : "left-1"
        }`}
      />
    </button>
  );
}

const WARNING_OPTIONS = [5, 10, 15, 20, 30];

export default function SettingsScreen({ settings, setSettings }: Props) {
  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings((s) => ({ ...s, [key]: val }));
  };

  return (
    <div className="px-6 pt-10 pb-4">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Настройки</h1>

      <div className="flex flex-col gap-3">
        <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <p className="text-xs text-app-muted uppercase tracking-wider px-4 pt-4 pb-2">Уведомления</p>

          <div className="flex items-center justify-between px-4 py-3 border-b border-app-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-app-accent/10 flex items-center justify-center">
                <Icon name="Bell" size={16} className="text-app-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-app-text">Push-уведомления</p>
                <p className="text-xs text-app-muted">В браузере</p>
              </div>
            </div>
            <Toggle
              value={settings.notificationsEnabled}
              onChange={(v) => set("notificationsEnabled", v)}
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-app-accent/10 flex items-center justify-center">
                <Icon name="Volume2" size={16} className="text-app-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-app-text">Звуковые сигналы</p>
                <p className="text-xs text-app-muted">При предупреждении</p>
              </div>
            </div>
            <Toggle
              value={settings.soundEnabled}
              onChange={(v) => set("soundEnabled", v)}
            />
          </div>
        </div>

        <div className="bg-app-card border border-app-border rounded-2xl overflow-hidden">
          <p className="text-xs text-app-muted uppercase tracking-wider px-4 pt-4 pb-2">Предупреждение</p>
          <div className="px-4 pb-4">
            <p className="text-sm text-app-text mb-3">
              Уведомить за <span className="text-app-accent font-semibold">{settings.warningMinutes} мин</span> до конца
            </p>
            <div className="flex gap-2 flex-wrap">
              {WARNING_OPTIONS.map((min) => (
                <button
                  key={min}
                  onClick={() => set("warningMinutes", min)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    settings.warningMinutes === min
                      ? "bg-app-accent text-app-bg border-app-accent"
                      : "bg-transparent text-app-text border-app-border hover:border-app-accent/50"
                  }`}
                >
                  {min} мин
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-app-card border border-app-border rounded-2xl px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center">
            <Icon name="Info" size={16} className="text-yellow-400" />
          </div>
          <p className="text-xs text-app-muted leading-relaxed">
            Уведомления в браузере требуют разрешения. При первом запуске таймера появится запрос.
          </p>
        </div>
      </div>
    </div>
  );
}
