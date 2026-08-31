
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Attendance System Runtime Error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6" dir="rtl">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 bg-emerald-600/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
              🏫
            </div>
            <h1 className="text-xl font-black text-slate-100">نظام متابعة غياب الطلاب — مدرسة زيد بن ثابت</h1>
            <p className="text-sm text-slate-300 font-medium">
              تم تحديث بيانات النظام. يرجى الضغط على الزر أدناه لإعادة تشغيل النظام وتحديث السجلات.
            </p>
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl transition shadow-lg shadow-emerald-600/30"
              >
                تحديث ومتابعة
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-xs rounded-xl transition"
              >
                إعادة ضبط الذاكرة المؤقتة وتشغيل النظام
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);


