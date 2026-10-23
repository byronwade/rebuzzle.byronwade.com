import type { SVGProps } from "react";

/**
 * Brand marks for share targets. lucide-react 1.x dropped its brand icons,
 * so these are drawn locally with the same 24px box and currentColor fill.
 */
type IconProps = SVGProps<SVGSVGElement>;

export function XIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M17.75 3h3.07l-6.71 7.67L22 21h-6.18l-4.84-6.33L5.44 21H2.37l7.18-8.2L2 3h6.33l4.38 5.79L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M13.5 21v-7.5h2.53l.38-2.94H13.5V8.69c0-.85.24-1.43 1.46-1.43h1.55V4.63A20.6 20.6 0 0 0 14.25 4.5c-2.24 0-3.77 1.37-3.77 3.88v2.18H7.95v2.94h2.53V21h3.02Z" />
    </svg>
  );
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.25 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 13.4c0-3.1-1.66-4.54-3.87-4.54a3.34 3.34 0 0 0-3.02 1.66V8.5h-3.37V20h3.37v-5.69c0-1.5.28-2.95 2.14-2.95 1.83 0 1.86 1.71 1.86 3.05V20h3.38l-.49-6.6Z" />
    </svg>
  );
}

export function RedditIcon(props: IconProps) {
  return (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" {...props}>
      <path d="M22 12.14a2.2 2.2 0 0 0-3.73-1.58 10.8 10.8 0 0 0-5.84-1.85l1-4.68 3.25.69a1.57 1.57 0 1 0 .16-.77l-3.63-.77a.39.39 0 0 0-.46.3l-1.11 5.23a10.83 10.83 0 0 0-5.91 1.85 2.2 2.2 0 1 0-2.43 3.6 4.3 4.3 0 0 0-.05.66c0 3.37 3.92 6.1 8.75 6.1s8.75-2.73 8.75-6.1a4.3 4.3 0 0 0-.05-.66A2.2 2.2 0 0 0 22 12.14ZM7 13.71a1.57 1.57 0 1 1 1.57 1.57A1.57 1.57 0 0 1 7 13.71Zm8.77 4.15a5.77 5.77 0 0 1-3.77 1.18 5.77 5.77 0 0 1-3.77-1.18.41.41 0 0 1 .58-.58 4.95 4.95 0 0 0 3.19.94 4.95 4.95 0 0 0 3.19-.94.41.41 0 0 1 .58.58Zm-.32-2.58a1.57 1.57 0 1 1 1.57-1.57 1.57 1.57 0 0 1-1.57 1.57Z" />
    </svg>
  );
}
