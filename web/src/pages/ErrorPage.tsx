import { TriangleAlert, TriangleAlertIcon } from "lucide-react";
import { useRouteError } from "react-router";
import CountBtn from "~/components/count-btn";

export default function ErrorPage() {
  const routerError = useRouteError();
  // covert error to object
  const { status, statusText, data, error } = routerError as {
    status: number;
    statusText: string;
    data: string;
    error: string;
  };

  console.log(routerError);
  console.log("error:", data);
  return (
    <div className="absolute inset-0 flex items-center justify-center dark:bg-neutral-950">
      <div className="bg-card ring-foreground/10 text-card-foreground m-4 rounded-md px-8 py-4 ring-1">
        <div className="font-geist flex flex-col items-center gap-2 text-center">
          <TriangleAlert className="text-foreground" />
          <span>Something went wrong!</span>
          {status && statusText && (
            <div className="text-muted-foreground mt-2 text-sm">
              {status} {statusText}
            </div>
          )}
          {data && <div className="text-muted-foreground text-sm">{data}</div>}
        </div>
      </div>
      <CountBtn className="absolute top-4 right-4" />
    </div>
  );
}
