import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
}

class ChunkErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Check if it's a chunk load error
        if (error.message.includes('Failed to fetch dynamically imported module') ||
            error.message.includes('Loading chunk')) {
            return { hasError: true };
        }
        return { hasError: false };
    }

    public componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
        if (this.state.hasError) {
            // Prevent infinite reload loops
            const now = Date.now();
            const lastReload = parseInt(localStorage.getItem('nexus_last_chunk_reload') || '0');
            
            if (now - lastReload > 30000) { // Only auto-reload once every 30 seconds
                localStorage.setItem('nexus_last_chunk_reload', now.toString());
                console.warn("Chunk load error detected. Forcing recovery reload...");
                window.location.reload();
            } else {
                console.error("Multiple chunk load errors detected. Critical failure or network disruption.");
            }
        }
    }


    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-[var(--primary)]/10 flex items-center justify-center border border-[var(--primary)]/20 shadow-xl shadow-[var(--primary)]/5">
                        <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin" />
                    </div>
                    <div>
                        <p className="text-[var(--text-primary)] font-black text-sm uppercase tracking-tight">Intelligence Sync Disrupted</p>
                        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mt-2">The requested module is temporarily unreachable.</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Force Manual Sync
                    </button>
                </div>

            );
        }

        return this.props.children;
    }
}

export default ChunkErrorBoundary;
