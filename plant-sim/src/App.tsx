import Scene from "./scene/Scene";
import TimeControl from "./components/TimeControl";
import HUD from "./components/HUD";
import { useSimulationLoop } from "./hooks/useSimulationLoop";

export default function App() {
  useSimulationLoop();

  return (
    <div className="absolute inset-0">
      <Scene />
      <HUD />
      <TimeControl />
    </div>
  );
}
