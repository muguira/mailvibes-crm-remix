
import React from 'react';

export const OuterElementWrapper = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  ({ style, ...rest }, ref) => (
    <div
      ref={ref}
      style={{
        ...style,
        height: '100%', // Ensure it takes full height
        width: '100%',
        position: 'relative',
        overflow: 'auto'
      }}
      {...rest}
    />
  )
);

OuterElementWrapper.displayName = 'OuterElementWrapper';
