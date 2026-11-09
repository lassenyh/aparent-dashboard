import type { CSSProperties } from "react";
import styles from "./wrapup-loader.module.css";

export function WrapupLoader({
  loop = true,
  paused = false,
  speed = 1,
  centered = false,
}: {
  centered?: boolean;
  loop?: boolean;
  paused?: boolean;
  speed?: number;
}) {
  return (
    <div
      className={styles.mark}
      data-loop={loop}
      data-paused={paused}
      data-centered={centered}
      style={{ "--duration": `${(loop ? 4.8 : 2.8) / speed}s` } as CSSProperties}
      aria-hidden="true"
    >
      <div className={styles.position}>
        <div className={styles.rotor}>
          <span className={styles.light} />
          <span className={styles.medium} />
          <span className={styles.dark} />
          <span className={styles.red} />
        </div>
      </div>
    </div>
  );
}
