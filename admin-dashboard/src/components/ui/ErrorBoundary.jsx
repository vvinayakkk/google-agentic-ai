import { AlertTriangle } from "lucide-react";
import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="panel m-6 max-w-xl p-5">
        <div className="mb-2 flex items-center gap-2 text-rose-300">
          <AlertTriangle size={18} />
          <span className="font-display text-xl">Page Error</span>
        </div>
        <p className="text-sm text-white/70">{this.state.error?.message || "Unexpected error"}</p>
        <button type="button" className="pill-btn mt-4" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;

