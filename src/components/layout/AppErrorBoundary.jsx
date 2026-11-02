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
    // Do not log patient records or authentication tokens here.
    console.error('[MINA] Error al mostrar la aplicación', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-slate-50 p-5">
          <section role="alert" className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
            <h1 className="text-lg font-bold text-slate-800">No se pudo mostrar MINA</h1>
            <p className="text-sm text-slate-600 mt-2">
              Ocurrió un error al cargar esta pantalla. Tus datos no se han borrado.
            </p>
            <button type="button" onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-lg font-semibold">
              Reintentar
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
