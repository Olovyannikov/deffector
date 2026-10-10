import type { ReactNode } from 'react';
import { EffectorNext } from '@effector/next';
import '@deffector-demo/shared/demo.css';

export const metadata = { title: 'deffector demo · Next.js' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EffectorNext>{children}</EffectorNext>
      </body>
    </html>
  );
}
