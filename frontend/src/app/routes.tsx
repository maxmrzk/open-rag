import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/layout";
import { LandingPage } from "./features/landing/landing-page";
import { ProjectsPage } from "./features/projects/projects-page";
import { DesignerPage } from "./features/system-designer/designer-page";
import { EvaluationsPage } from "./features/evaluations/evaluations-page";
import { RunsPage } from "./features/runs/runs-page";
import { SettingsPage } from "./features/settings/settings-page";
import { ComponentLibraryPage } from "./features/component-library/component-library-page";

export const router = createBrowserRouter([
  // ── Landing (no sidebar) ──────────────────────────────────────────────────
  {
    path: "/",
    Component: LandingPage,
  },

  // ── Full application (with sidebar layout) ────────────────────────────────
  {
    path: "/app",
    Component: RootLayout,
    children: [
      { index: true, Component: ProjectsPage },
      { path: "designer", Component: DesignerPage },
      { path: "library", Component: ComponentLibraryPage },
      { path: "evaluations", Component: EvaluationsPage },
      { path: "runs", Component: RunsPage },
      { path: "settings", Component: SettingsPage },
      {
        path: "*",
        Component: () => (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-[48px] text-[#21262d]">404</div>
              <div className="text-[13px] text-[#8b949e]">Page not found</div>
            </div>
          </div>
        ),
      },
    ],
  },
]);
