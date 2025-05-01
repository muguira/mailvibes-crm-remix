
import { ReactNode } from "react";
import { GridContainerProps } from "@/components/grid-view/types";

interface GridContainerWrapperProps extends GridContainerProps {
  children: ReactNode;
}

export function GridContainer({ children, ...props }: GridContainerWrapperProps) {
  return (
    <div className="h-full flex flex-col full-screen-grid">
      {children}
    </div>
  );
}
