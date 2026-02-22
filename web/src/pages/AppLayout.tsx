import { Outlet } from "react-router";
import Navbar from "~/components/Navbar";

type AppLayoutProps = {
  children?: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div>
      <Navbar />
      <main className="">{children ?? <Outlet />}</main>
    </div>
  );
}
