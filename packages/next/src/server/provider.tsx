import { getServerAbState } from './state';
import { AbStateProvider } from '@abnxt/next';
import type { ABProviderProps } from '../types';

export async function ABProvider({ children, analytics }: ABProviderProps) {
  const state = await getServerAbState();
  return (
    <AbStateProvider
      state={state}
      analytics={analytics}
    >
      {children}
    </AbStateProvider>
  );
}
