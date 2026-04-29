import { useMemo } from "react";
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
} from "react-router-dom";
import { ApiProvider } from "./lib/api-context";
import { createApiClient, type ApiClient } from "./lib/api";
import { ClaimLedger } from "./routes/ClaimLedger";
import { Dashboard } from "./routes/Dashboard";
import { ProjectDetail } from "./routes/ProjectDetail";

function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">SolarOps</p>
          <h1>Truth Layer Console</h1>
          <p className="sidebar-copy">
            Project health, claims, and evidence in one dense operating view.
          </p>
        </div>
        <nav className="nav-links" aria-label="Primary">
          <Link to="/">Portfolio</Link>
          <Link to="/claims">Claims</Link>
        </nav>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}

export function createAppRouter(kind: "browser" | "memory" = "browser") {
  const routes = [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: "projects/:id", element: <ProjectDetail /> },
        { path: "claims", element: <ClaimLedger /> },
      ],
    },
  ];

  if (kind === "memory") {
    return createMemoryRouter(routes, { initialEntries: ["/"] });
  }

  return createBrowserRouter(routes);
}

type AppProps = {
  api?: ApiClient;
};

export default function App({ api }: AppProps) {
  const client = useMemo(() => api ?? createApiClient(), [api]);
  const router = useMemo(() => createAppRouter("browser"), []);

  return (
    <ApiProvider api={client}>
      <RouterProvider router={router} />
    </ApiProvider>
  );
}
