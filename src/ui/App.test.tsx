// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';

describe('App', () => {
  it('muestra la pantalla de inicio con los botones principales', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Truco Argentino' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nueva partida' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estadísticas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reglas' })).toBeInTheDocument();
  });
});
