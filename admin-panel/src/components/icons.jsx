/* the exact SVGs from the HTML pages — same viewBox, same stroke settings,
   same path data, so the icons render pixel for pixel as before */
const wrap = (sw, d, extra) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

export const IcoMenu = () => wrap(2, <path d="M3 6h18M3 12h18M3 18h18" />);
export const IcoBack = () => wrap(2.2, <path d="M19 12H5M11 18l-6-6 6-6" />);
export const IcoClose = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p && p.sw ? p.sw : 2.2} strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const IcoSend = () => wrap(2, <path d="m22 2-7 20-4-9-9-4 20-7Z" />);
export const IcoEmoji = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5h.01M15 9.5h.01" />
  </svg>
);
export const IcoSearch = () => (
  <svg className="s-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
export const IcoNavHome = () => wrap(2, <path d="M3 10.5 12 3l9 7.5V21H3z" />);
export const IcoNavChat = () => wrap(2, <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />);
export const IcoNavProfile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
export const IcoReply = () => wrap(2, <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 6 6v4" /></>);
export const IcoCopy = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
export const IcoEdit = () => wrap(2, <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
export const IcoTrash = () => wrap(2, <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />);
