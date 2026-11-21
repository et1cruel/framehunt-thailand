import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("FRAMEHUNT render error", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
        <AlertTriangle className="mb-6 h-10 w-10 text-burnt" aria-hidden />
        <p className="label-mono text-burnt">RENDER ERROR</p>
        <h1 className="display mt-4 max-w-2xl text-4xl md:text-6xl">มีบางอย่างผิดพลาด</h1>
        <p className="mt-4 max-w-md font-sans text-sm leading-relaxed text-concrete">
          หน้านี้หยุดทำงานก่อนแสดงผลสำเร็จ ข้อมูลที่บันทึกไว้ในเครื่องของคุณยังอยู่ครบ ลองโหลดหน้าใหม่หรือกลับไปหน้าแรก
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={() => window.location.reload()}>โหลดหน้าใหม่</Button>
          <Button variant="outline" onClick={() => window.location.assign("/")}>
            กลับหน้าแรก
          </Button>
        </div>
        <pre className="mt-10 max-w-xl overflow-auto border border-line p-4 text-left font-mono text-xs text-concrete">
          {this.state.error.message}
        </pre>
      </div>
    );
  }
}
