import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { recoverAssetLoad, isAssetLoadError } from "@/lib/page-recovery";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    recoverAssetLoad(error);
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Bir şeyler ters gitti</h2>
          <p className="text-muted-foreground mb-4 max-w-md">
            Sayfa yüklenemedi. Lütfen tekrar deneyin; sepetiniz ve hesabınız silinmez.
          </p>
          <Button onClick={() => {
            if (isAssetLoadError(this.state.error)) window.location.reload();
            else this.setState({ hasError: false, error: undefined });
          }}>
            Tekrar Dene
          </Button>
          <Button variant="link" asChild><a href="/">Ana Sayfaya Dön</a></Button>
        </div>
      );
    }

    return this.props.children;
  }
}
