// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../store/index.ts';
import App from './App.tsx';
import { SpanishCard } from './cards/SpanishCard.tsx';
import { GauchoAvatar } from './components/GauchoAvatar.tsx';
import { MatchstickScoreboard } from './components/MatchstickScoreboard.tsx';

describe('App — Flujo completo de UI funcional (Etapa 7)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGameStore.setState({
      screen: 'home',
      savedGame: null,
      botSpeech: null,
      history: [],
    });
  });

  it('navega entre Inicio, Reglas, Estadísticas e Historial', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Truco Argentino' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reglas' }));
    expect(screen.getByRole('heading', { name: 'Reglas del Truco' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas' }));
    expect(screen.getByRole('heading', { name: 'Estadísticas' })).toBeInTheDocument();
    expect(screen.getByText('Partidas jugadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    expect(screen.getByRole('heading', { name: 'Historial de partidas' })).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay partidas terminadas.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
  });

  it('configura nueva partida, juega en la mesa viendo las 3 bazas, muestra resumen de mano y permite continuar partida', () => {
    render(<App />);

    // Ir a Nueva partida y elegir El Viejo Vizcacha a 15 puntos
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    expect(screen.getByRole('heading', { name: 'Nueva partida' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /El Viejo Vizcacha/i }));
    fireEvent.click(screen.getByRole('button', { name: /A 15 puntos/i }));
    fireEvent.click(screen.getByRole('button', { name: '¡Repartir!' }));

    // Estamos en la mesa: se ven las 3 bazas (Baza 1, Baza 2, Baza 3) y los botones de acción
    expect(screen.getByRole('main', { name: 'Mesa de Truco' })).toBeInTheDocument();
    expect(screen.getByLabelText('Baza 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Baza 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Baza 3')).toBeInTheDocument();

    // Irse al mazo en la 1ª mano -> aparece el modal de Resumen de la mano
    fireEvent.click(screen.getByRole('button', { name: 'Irse al mazo' }));
    expect(screen.getByRole('dialog', { name: 'Resumen de la mano' })).toBeInTheDocument();
    expect(screen.getByText(/Te fuiste al mazo/i)).toBeInTheDocument();

    // Pasar a la siguiente mano
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente mano' }));
    expect(screen.getByText(/Mano #2/i)).toBeInTheDocument();

    // Volver al menú principal -> aparece el botón "Continuar partida"
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    expect(screen.getByRole('button', { name: 'Continuar partida' })).toBeInTheDocument();

    // Si abrimos Nueva partida teniendo una en curso, avisa que se abandonará
    fireEvent.click(screen.getByRole('button', { name: 'Nueva partida' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Tenés una partida en curso/i);
    fireEvent.click(screen.getByRole('button', { name: '¡Repartir!' }));

    // Al haber empezado otra, la anterior quedó en el historial como abandonada
    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    expect(screen.getByText(/Abandonada \(Derrota\)/i)).toBeInTheDocument();
  });

  it('renderiza SpanishCard (pintas 0..3, figuras y dorso), GauchoAvatar y MatchstickScoreboard (Etapa 8)', () => {
    const { container } = render(
      <div>
        <SpanishCard suit="oro" number={1} />
        <SpanishCard suit="copa" number={10} />
        <SpanishCard suit="espada" number={11} />
        <SpanishCard suit="basto" number={12} />
        <SpanishCard faceDown />
        <GauchoAvatar difficulty="facil" />
        <GauchoAvatar difficulty="medio" />
        <GauchoAvatar difficulty="dificil" />
        <MatchstickScoreboard
          humanScore={18}
          botScore={12}
          targetScore={30}
          rivalName="Don Ramón"
        />
      </div>,
    );

    expect(screen.getByRole('img', { name: '1 de oro' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '10 de copa' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '11 de espada' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '12 de basto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Carta boca abajo')).toBeInTheDocument();

    expect(container.querySelector('[data-pintas="0"]')).not.toBeNull();
    expect(container.querySelector('[data-pintas="1"]')).not.toBeNull();
    expect(container.querySelector('[data-pintas="2"]')).not.toBeNull();
    expect(container.querySelector('[data-pintas="3"]')).not.toBeNull();

    expect(screen.getByRole('img', { name: 'Avatar de El Pibe' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de Don Ramón' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Avatar de El Viejo Vizcacha' })).toBeInTheDocument();

    expect(screen.getByText('3 buenas (18)')).toBeInTheDocument();
    expect(screen.getByText('12 malas')).toBeInTheDocument();
  });
});
