import { HeroSection } from '@/components/HeroSection';
import { MarketingSections } from '@/components/MarketingSections';

export function HomePage(): React.JSX.Element {
  return (
    <main>
      <HeroSection />
      <MarketingSections />
    </main>
  );
}
