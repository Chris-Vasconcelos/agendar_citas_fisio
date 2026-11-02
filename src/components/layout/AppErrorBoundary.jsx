import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error al renderizar MINA:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mina-error-screen" role="alert">
          <div className="mina-error-card">
            <strong>MINA</strong>
            <h1>No se pudo mostrar la agenda</h1>
            <p>Tus datos no se han eliminado. Actualiza la página para intentar nuevamente.</p>
            <button type="button" onClick={() => window.location.reload()}>Volver a cargar</button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
