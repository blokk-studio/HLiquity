/** @jsxImportSource theme-ui */
import { SVGProps } from "react";

/**
 * hedera icon from simple icons
 *
 * https://icon-sets.iconify.design/simple-icons/hedera/
 */
export const Hedera: React.FC<SVGProps<SVGSVGElement>> = props => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M12 0a12 12 0 1 0 0 24a12 12 0 0 0 0-24m4.957 17.396h-1.581V14.01H8.622v3.378H7.05V6.604h1.58v3.384h6.754V6.604h1.58zm-1.581-6.259H8.622v1.724h6.754Z"
      />
    </svg>
  );
};
