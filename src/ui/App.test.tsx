// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.tsx';

describe('App', () => {
  it('muestra el título del juego', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Truco' })).toBeInTheDocument();
  });
});
