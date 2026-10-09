import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Incentive Builder | Growth, aligned.', description: 'Design sales incentives that move your business forward.' };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html> }
