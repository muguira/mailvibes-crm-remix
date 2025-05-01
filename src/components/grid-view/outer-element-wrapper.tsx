
import React from 'react';

export const OuterElementWrapper = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        height: '100%',
        width: '100%',
        position: 'relative', 
        overflow: 'auto',
        zIndex: 7
      }}
      {...rest}
    />
  )
);

OuterElementWrapper.displayName = 'OuterElementWrapper';
