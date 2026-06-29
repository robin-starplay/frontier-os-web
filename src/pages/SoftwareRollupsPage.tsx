import React from 'react';
import { BuyerLandingTemplate } from '@/components/BuyerLandingTemplate';
import { BUYER_PAGE_MAP } from '@/data/buyerPages';

export default function SoftwareRollupsPage() {
  return <BuyerLandingTemplate data={BUYER_PAGE_MAP['software-rollups']} />;
}
