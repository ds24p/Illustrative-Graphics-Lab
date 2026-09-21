import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SiteHeader } from "../components/layout/SiteHeader";

export function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <SiteHeader />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>Illustrative Graphics Lab</span>
        <span>Client-side experiments in image processing and NPR.</span>
        <span>Copyright &copy; 2026 Dorota Siciak</span>
      </footer>
    </div>
  );
}
