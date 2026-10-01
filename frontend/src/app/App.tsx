import { lazy } from "react";
import { CatalogProvider } from "../features/catalog/CatalogProvider";
import { Palette } from "../features/palette/Palette";
import { PartDefs } from "../features/parts/PartDefs";
import { PresetsProvider } from "../features/presets/PresetsContext";
import { SoundProvider } from "../features/sound/SoundContext";
import { WorkspaceSkeleton } from "../features/workspace/WorkspaceSkeleton";
import { AsyncBoundary } from "../shared/ui/AsyncBoundary";
import { AppHeader } from "./AppHeader";

const Workspace = lazy(() => import("../features/workspace/Workspace"));

export default function App() {
  return (
    <CatalogProvider>
      <SoundProvider>
        <PresetsProvider>
          <PartDefs />
          <div className="app">
            <AppHeader />
            <div className="app__body">
              <Palette />
              <AsyncBoundary name="Workspace" fallback={<WorkspaceSkeleton />}>
                <Workspace />
              </AsyncBoundary>
            </div>
          </div>
        </PresetsProvider>
      </SoundProvider>
    </CatalogProvider>
  );
}
