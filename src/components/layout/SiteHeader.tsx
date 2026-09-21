import { FlaskConical } from "lucide-react";
import { NavLink } from "react-router-dom";

export function SiteHeader() {
  return (
    <header className="site-header">
      <NavLink className="brand" to="/" aria-label="Illustrative Graphics Lab home">
        <span className="brand-mark" aria-hidden="true">
          <FlaskConical size={20} strokeWidth={2} />
        </span>
        <span>
          <strong>Illustrative</strong>
          <span>Graphics Lab</span>
        </span>
      </NavLink>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/experiments">Experiments</NavLink>
      </nav>
    </header>
  );
}
