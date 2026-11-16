import { useGameStore } from '../store/index.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { NewGameScreen } from './screens/NewGameScreen.tsx';
import { TableScreen } from './screens/TableScreen.tsx';

function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'newGame') {
    return <NewGameScreen />;
  }
  if (screen === 'table') {
    return <TableScreen />;
  }

  return <HomeScreen />;
}

export default App;
