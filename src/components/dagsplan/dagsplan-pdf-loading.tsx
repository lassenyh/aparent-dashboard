import { WrapupLoader } from "@/components/wrapup-loader";
import styles from "./dagsplan-pdf-loading.module.css";

export function DagsplanPdfLoading({ label }: { label: string }) {
  return (
    <div className={styles.surface} role="status" aria-live="polite">
      <div className={styles.skeleton} aria-hidden="true">
        <div className={styles.heading}>
          <i />
          <i />
        </div>
        <div className={styles.editor}>
          <div className={styles.toolbar}>
            <i />
            <i />
            <i />
          </div>
          <div className={styles.paper}>
            <div className={styles.logos}>
              <i />
              <i />
              <i />
            </div>
            <div className={styles.documentTitle}>
              <i />
              <i />
            </div>
            {[0, 1, 2, 3].map((section) => (
              <div key={section} className={styles.section}>
                <i />
                <i />
                <i />
                <i />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.iconFrame} aria-hidden="true">
        <div className={styles.icon}>
          <WrapupLoader centered speed={1} />
        </div>
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}
