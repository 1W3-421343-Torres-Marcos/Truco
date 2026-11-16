import { useGameStore } from '../store/index.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { NewGameScreen } from './screens/NewGameScreen.tsx';

function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'newGame') {
    return <NewGameScreen />;
  }

  return <HomeScreen />;
}

export default App;
