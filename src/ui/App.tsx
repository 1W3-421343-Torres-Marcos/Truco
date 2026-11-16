import { useGameStore } from '../store/index.ts';
import { HomeScreen } from './screens/HomeScreen.tsx';

function App() {
  const screen = useGameStore((s) => s.screen);

  if (screen === 'home') {
    return <HomeScreen />;
  }

  return <HomeScreen />;
}

export default App;
