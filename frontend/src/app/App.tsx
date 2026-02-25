import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Toaster } from "sonner";
import { router } from "./routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* DndProvider hoisted here to prevent "two HTML5 backends" crash on navigation */}
      <DndProvider backend={HTML5Backend}>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#161b22",
              border: "1px solid #21262d",
              color: "#c9d1d9",
              fontSize: "12px",
            },
          }}
        />
      </DndProvider>
    </QueryClientProvider>
  );
}