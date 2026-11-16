import { useGameStore } from '../store/index.ts';
import { HistoryScreen } from './screens/HistoryScreen.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import { NewGameScreen } from './screens/NewGameScreen.tsx';
import { RulesScreen } from './screens/RulesScreen.tsx';
import { StatsScreen } from './screens/StatsScreen.tsx';
import { TableScreen } from './screens/TableScreen.tsx';

function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'newGame') {
    return <NewGameScreen />;
  }
  if (screen === 'table') {
    return <TableScreen />;
  }
  if (screen === 'history') {
    return <HistoryScreen />;
  }
  if (screen === 'stats') {
    return <StatsScreen />;
  }
  if (screen === 'rules') {
    return <RulesScreen />;
  }

  return <HomeScreen />;
}

export default App;
