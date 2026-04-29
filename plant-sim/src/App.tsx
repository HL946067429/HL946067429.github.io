import Scene from "./scene/Scene";
import TimeControl from "./components/TimeControl";
import HUD from "./components/HUD";
import SpeciesPanel from "./components/SpeciesPanel";
import { useSimulationLoop } from "./hooks/useSimulationLoop";
import { usePlantGrowth } from "./hooks/usePlantGrowth";

export default function App() {
  useSimulationLoop();
  usePlantGrowth();

  return (
    <div className="absolute inset-0">
      <Scene />
      <HUD />
      <SpeciesPanel />
      <TimeControl />
    </div>
  );
}
