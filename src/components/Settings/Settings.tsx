import { useUIStore } from "../../state/ui";
import {
  useThemeStore,
  THEMES,
  ACCENTS,
  activeKey,
  activeAccentColor,
} from "../../state/theme";
import styles from "./Settings.module.css";

export function Settings() {
  const setOverlay = useUIStore((s) => s.setOverlay);
  const mode = useThemeStore((s) => s.mode);
  const lastDark = useThemeStore((s) => s.lastDark);
  const lastLight = useThemeStore((s) => s.lastLight);
  const accentKey = useThemeStore((s) => s.accentKey);
  const toggleMode = useThemeStore((s) => s.toggleMode);
  const setAccent = useThemeStore((s) => s.setAccent);
  const pickTheme = useThemeStore((s) => s.pickTheme);

  const isDark = mode === "dark";
  const accent = activeAccentColor({ mode, accentKey });
  const curKey = activeKey({ mode, lastDark, lastLight });
  const close = () => setOverlay(null);

  return (
    <div className={styles.scrim} onClick={close}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Settings</div>
            <div className={styles.subtitle}>Appearance &amp; theme</div>
          </div>
          <button className={styles.closeBtn} onClick={close} aria-label="Close">×</button>
        </div>

        <div className={styles.body}>
          {/* Mode */}
          <div className={styles.rowSetting}>
            <div>
              <div className={styles.settingName}>Mode</div>
              <div className={styles.settingDesc}>Switch between light and dark</div>
            </div>
            <div className={styles.modeToggle} onClick={toggleMode}>
              <span className={`${styles.modeLabel} ${!isDark ? styles.modeActive : ""}`}>Light</span>
              <div className={styles.track}>
                <div className={styles.knob} style={{ transform: isDark ? "translateX(18px)" : "translateX(0)" }} />
              </div>
              <span className={`${styles.modeLabel} ${isDark ? styles.modeActive : ""}`}>Dark</span>
            </div>
          </div>

          {/* Accent */}
          <div className={`${styles.rowSetting} ${styles.divided}`}>
            <div>
              <div className={styles.settingName}>Accent</div>
              <div className={styles.settingDesc}>Cursor, selection &amp; highlights</div>
            </div>
            <div className={styles.swatches}>
              {ACCENTS.map((a) => {
                const color = isDark ? a.dark : a.light;
                const selected = a.key === accentKey;
                return (
                  <button
                    key={a.key}
                    className={styles.swatch}
                    title={a.name}
                    onClick={() => setAccent(a.key)}
                    style={{ border: `2px solid ${selected ? color : "transparent"}` }}
                  >
                    <span className={styles.swatchDot} style={{ background: color }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme gallery */}
          <div className={styles.gallerySection}>
            <div className={styles.settingName}>Theme</div>
            <div className={styles.settingDesc} style={{ marginBottom: 16 }}>
              Choose a color scheme for the editor
            </div>
            <div className={styles.grid}>
              {THEMES.map((t) => {
                const selected = t.key === curKey;
                const kw = accent;
                return (
                  <button
                    key={t.key}
                    className={styles.card}
                    onClick={() => pickTheme(t.key)}
                    style={{
                      border: selected ? `2px solid ${accent}` : `1px solid var(--border)`,
                      background: t.chrome,
                    }}
                  >
                    <div className={styles.preview} style={{ background: t.bg }}>
                      <div className={styles.previewBar} style={{ background: t.chrome, borderBottom: `1px solid ${t.border}` }}>
                        <span className={styles.previewDot} style={{ background: accent }} />
                      </div>
                      <div className={styles.previewBody}>
                        <div className={styles.previewRail} style={{ background: t.panel, borderRight: `1px solid ${t.border}` }} />
                        <div className={styles.previewLines}>
                          <span className={styles.ln} style={{ width: "46%", background: kw }} />
                          <span className={styles.ln} style={{ width: "70%", background: t.str }} />
                          <span className={styles.ln} style={{ width: "34%", background: t.fn }} />
                          <span className={styles.ln} style={{ width: "60%", background: t.fg, opacity: 0.55 }} />
                        </div>
                      </div>
                    </div>
                    <div className={styles.cardFooter} style={{ background: t.chrome }}>
                      <span className={styles.cardName} style={{ color: t.fg }}>{t.name}</span>
                      <span className={styles.cardMode} style={{ color: t.muted }}>
                        {t.mode === "dark" ? "Dark" : "Light"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
