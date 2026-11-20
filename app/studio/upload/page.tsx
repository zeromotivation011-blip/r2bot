import type { Metadata } from 'next';
import UploadClient from './UploadClient';

// Private tool for the editor: upload a finished reel for R2BOT, Raj Study or Raj Chaupal.
// Password-gated by the control-room function, never indexed, never linked.
export const metadata: Metadata = {
  title: 'Reel upload',
  robots: { index: false, follow: false, nocache: true },
};

export default function StudioUploadPage() {
  return <UploadClient />;
}
