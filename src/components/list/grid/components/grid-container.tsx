
import { ReactNode } from "react";

interface GridContainerProps {
  children: ReactNode;
}

export function GridContainer({ children }: GridContainerProps) {
  return (
    <div className="h-full flex flex-col full-screen-grid">
      {children}
    </div>
  );
}
