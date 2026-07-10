import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Thin animated top progress bar that pulses on every route change.
 */
export const RouteProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(15);
    const t1 = window.setTimeout(() => setProgress(65), 120);
    const t2 = window.setTimeout(() => setProgress(92), 350);
    const t3 = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 250);
    }, 600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [location.pathname]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 0.2s" }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-primary-glow to-secondary shadow-[0_0_8px_hsl(var(--primary))]"
        style={{
          width: `${progress}%`,
          transition: "width 0.35s cubic-bezier(.2,.7,.2,1)",
        }}
      />
    </div>
  );
};

export default RouteProgressBar;
