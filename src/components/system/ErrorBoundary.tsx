import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";
import { Localized } from "@/i18n/Language";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  referenceId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, referenceId: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, referenceId: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const referenceId = `FH-${Date.now().toString(36).slice(-5).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    this.setState({ referenceId });
    console.error(`FRAMEHUNT render error [${referenceId}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center" role="alert">
        <AlertTriangle className="mb-6 h-10 w-10 text-burnt" aria-hidden />
        <p className="label-mono text-burnt">FRAMEHUNT · ERROR</p>
        <h1 className="display mt-4 max-w-2xl text-4xl md:text-6xl"><Localized text="มีบางอย่างผิดพลาด" /></h1>
        <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-concrete">
          <Localized text="หน้านี้แสดงผลไม่สำเร็จ ลองโหลดใหม่หรือกลับไปหน้าแรก หากยังพบปัญหาให้แจ้งรหัสอ้างอิงนี้" />
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={() => window.location.reload()}><Localized text="โหลดหน้าใหม่" /></Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            <Localized text="กลับหน้าแรก" />
          </Button>
        </div>
        {this.state.referenceId && <p className="mt-8 rounded-xl border border-line px-4 py-2 font-mono text-xs text-concrete"><Localized text="รหัสอ้างอิง" />: {this.state.referenceId}</p>}
      </div>
    );
  }
}
