import { usePlant } from "@/stores/plantStore";
import SunflowerPlant from "./SunflowerPlant";

/**
 * 根据当前 plant.species.id 选择渲染器。
 * 添加新物种:写一个 *Plant.tsx 组件,在这里 case-by-case 注册。
 */
export default function PlantRegistry() {
  const speciesId = usePlant((s) => s.species.id);
  switch (speciesId) {
    case "sunflower":
      return <SunflowerPlant />;
    default:
      return <SunflowerPlant />;
  }
}
