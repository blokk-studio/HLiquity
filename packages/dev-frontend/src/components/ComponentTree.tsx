import React, { ReactElement } from "react";

/** renders as list of components with its following sibling as its children using a function */
export const ComponentTree: React.FC<
  React.PropsWithChildren<{
    renderers: ((children: ReactElement) => ReactElement)[];
  }>
> = ({ renderers, children }) => {
  const tree = renderers
    .toReversed()
    .reduce((children, renderer) => renderer(children), <>{children}</>);

  return tree;
};
