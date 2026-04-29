import { createContext, useContext, type ReactNode } from "react";
import { createApiClient, type ApiClient } from "./api";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider({
  api,
  children,
}: {
  api: ApiClient;
  children: ReactNode;
}) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const api = useContext(ApiContext);

  if (!api) {
    return createApiClient();
  }

  return api;
}
