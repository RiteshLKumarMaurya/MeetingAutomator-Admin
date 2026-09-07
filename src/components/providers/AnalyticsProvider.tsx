'use client';

import { useEffect } from 'react';
import Clarity from '@microsoft/clarity';

export default function AnalyticsProvider() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) {
      Clarity.init(process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID);
    }
  }, []);

  return null;
}