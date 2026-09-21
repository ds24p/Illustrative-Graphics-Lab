import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="not-found page-width">
      <span className="error-code">404</span>
      <h1>This page is outside the lab.</h1>
      <p>The route may have moved, or the experiment has not been registered.</p>
      <Link className="button button-primary" to="/experiments">
        <ArrowLeft size={17} /> Back to experiments
      </Link>
    </div>
  );
}
