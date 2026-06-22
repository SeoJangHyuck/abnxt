'use client';

import { useEffect, useState } from 'react';
import { Experiment, Variant, useExperiment } from '@abnxt/next';

export default function Hero() {
  const { variant, source } = useExperiment('homepage-hero');
  const [exposures, setExposures] = useState<string[]>([]);

  // 벤더 중립 분석 글루: domEvent 구독(어떤 분석 도구로도 전달 가능).
  useEffect(() => {
    const onExposure = (e: Event) => {
      const d = (e as CustomEvent).detail as {
        experiment: string;
        variant: string;
      };
      setExposures((prev) => [...prev, `${d.experiment}=${d.variant}`]);
    };
    window.addEventListener('abnxt:exposure', onExposure);
    return () => window.removeEventListener('abnxt:exposure', onExposure);
  }, []);

  return (
    <section>
      <Experiment name="homepage-hero">
        <Variant name="A">
          <div className="hero-a">Hero A</div>
        </Variant>
        <Variant name="B">
          <div className="hero-b">Hero B</div>
        </Variant>
      </Experiment>
      <p>
        client variant: {variant} (source: {source})
      </p>
      <p>exposures: {exposures.join(', ') || '(none yet)'}</p>
    </section>
  );
}
