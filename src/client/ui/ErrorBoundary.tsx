import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Filet de sécurité : une erreur inattendue affiche un écran de reprise, jamais une page blanche. */
export class ErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Magnitude]', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen screen--center">
        <div className="panel stack" role="alert" style={{ maxWidth: 520 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', margin: 0 }}>Un imprévu sur le plateau</h1>
          <p className="muted">L’écran a rencontré une erreur. Votre progression enregistrée est intacte ; une partie en ligne reprendra là où elle en était.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn--primary" onClick={() => { this.setState({ error: null }); this.props.onReset(); }}>Revenir au menu</button>
            <button type="button" className="btn btn--ghost" onClick={() => location.reload()}>Recharger la page</button>
          </div>
        </div>
      </div>
    );
  }
}
