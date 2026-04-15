import { useEffect, useState } from 'react';
import { isMuted, setMuted, subscribeMute } from './sounds';

export function useMute(): [boolean, (m: boolean) => void] {
  const [muted, setM] = useState(isMuted());
  useEffect(() => subscribeMute(setM), []);
  return [muted, setMuted];
}
