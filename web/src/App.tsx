import { createBrowserRouter, RouterProvider } from "react-router";
import Home from "./pages/Home";
import ErrorPage from "./pages/ErrorPage";
import AppLayout from "./pages/AppLayout";
import SignIn from "./pages/SignIn";
import AuthCallback from "./pages/AuthCallback";
import CompanyProblems from "./pages/CompanyProblems";
import AllProblems from "./pages/AllProblems";
import Profile from "./pages/Profile";

const router = createBrowserRouter(
  [
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
          path: "/sign-in",
          element: <SignIn />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/auth/callback",
          element: <AuthCallback />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/company/:id",
          element: <CompanyProblems />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/all-problems",
          element: <AllProblems />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/profile",
          element: <Profile />,
          errorElement: <ErrorPage />,
        },
        {
          path: "/error",
          element: <ErrorPage />,
          errorElement: <ErrorPage />,
        },
      ],
    },
  ],
  {
    basename: "/visor-leetcode",
  },
);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
