import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time errors so a single component failure never blanks out the
 * whole exam. The student's answers live in localStorage/sessionStorage, so
 * reloading recovers the in-progress attempt.
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error captured by ErrorBoundary:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
            <h1 className="text-lg font-extrabold text-slate-800">
              Ocurrió un error inesperado
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Tus respuestas se guardaron localmente. Pulsa el botón para reanudar el
              examen desde donde lo dejaste.
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold cursor-pointer transition-all active:scale-[0.98]"
            >
              Reanudar examen
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
