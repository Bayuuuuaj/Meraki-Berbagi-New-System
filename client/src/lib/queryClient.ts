import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const apiUrl = import.meta.env.VITE_API_URL || "";

  // Get stored user ID for audit trail
  const storedUser = localStorage.getItem("meraki_user");
  let userId = "system";
  if (storedUser) {
    try {
      userId = JSON.parse(storedUser).id;
    } catch (e) {
      console.error("Failed to parse user for headers");
    }
  }

  const res = await fetch(`${apiUrl}${url}`, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      "ngrok-skip-browser-warning": "true",
      "x-user-id": userId,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const storedUser = localStorage.getItem("meraki_user");
      let userId = "system";
      if (storedUser) {
        try {
          userId = JSON.parse(storedUser).id;
        } catch (e) {
          console.error("Failed to parse user for query headers");
        }
      }

      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        headers: {
          "ngrok-skip-browser-warning": "true",
          "x-user-id": userId,
        },
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
