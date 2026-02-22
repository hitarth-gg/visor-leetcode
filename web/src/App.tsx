import { createBrowserRouter, RouterProvider } from "react-router";
import Home from "./pages/Home";
import ErrorPage from "./pages/ErrorPage";
import AppLayout from "./pages/AppLayout";

function App() {
  const router = createBrowserRouter([
    {
      element: <AppLayout />,
      errorElement: <AppLayout children={<ErrorPage />} />,
      children: [
        {
          path: "/",
          element: <Home />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/error",
          element: <ErrorPage />,
          errorElement: <ErrorPage />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
