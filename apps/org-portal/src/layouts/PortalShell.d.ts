import { type ReactNode } from 'react';
export type PortalPersona = 'org' | 'teacher' | 'student';
interface PortalShellProps {
    persona: PortalPersona;
    children: ReactNode;
}
export declare function PortalShell({ persona, children }: PortalShellProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=PortalShell.d.ts.map