import styles from "./DreamVault.module.css";

interface ProgressRingProps {
  /** 0–1 */
  progress: number;
  caption: string;
}

const SIZE = 180;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ProgressRing({ progress, caption }: ProgressRingProps) {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const percent = Math.round(clamped * 100);

  return (
    <div className={styles.ring} role="img" aria-label={`${percent}% of your goal saved so far`}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.ringSvg} aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>
        </defs>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className={styles.ringTrack} strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          className={styles.ringValue}
          strokeWidth={STROKE}
          stroke="url(#ring-gradient)"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
        />
      </svg>
      <div className={styles.ringLabel} aria-hidden="true">
        <span className={styles.ringPercent}>{percent}%</span>
        <span className={styles.ringCaption}>{caption}</span>
      </div>
    </div>
  );
}
