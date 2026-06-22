'use client';

import { Children, isValidElement, useContext } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { AbContext } from './context';
import { useExperiment } from './useExperiment';

export interface VariantProps {
  name: string;
  children?: ReactNode;
}

/** 마커 컴포넌트: 부모 <Experiment>가 선택해 렌더. */
export function Variant({ children }: VariantProps): ReactNode {
  return children;
}

export interface ExperimentProps {
  name: string;
  children: ReactNode;
}

export function Experiment({ name, children }: ExperimentProps): ReactNode {
  const ctx = useContext(AbContext);
  if (!ctx)
    throw new Error(
      '<Experiment> must be used within <ABProvider> / <AbStateProvider>',
    );

  const { variant } = useExperiment(name);

  const variants = Children.toArray(children).filter(
    (c): c is ReactElement<VariantProps> =>
      isValidElement(c) && c.type === Variant,
  );

  const match = variants.find((v) => v.props.name === variant);
  if (match) return match;

  // 폴백: 배정 변이에 해당하는 <Variant>가 없을 때만 control 변이로.
  const controlKey = ctx.state.config.experiments[name]?.control;
  const controlMatch = controlKey
    ? variants.find((v) => v.props.name === controlKey)
    : undefined;
  if (controlMatch) return controlMatch;

  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `abnxt: <Experiment name="${name}"> has no <Variant> for "${variant}" and no control fallback`,
    );
  }
  return null;
}
