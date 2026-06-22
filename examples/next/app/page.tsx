import { getVariant } from '@abnxt/next/server';
import Hero from './Hero';

export default async function Home() {
  const serverVariant = await getVariant('homepage-hero');
  return (
    <main>
      <h1>abnxt Next example</h1>
      <p>server-resolved variant: {serverVariant || '(control)'}</p>
      <Hero />
    </main>
  );
}
