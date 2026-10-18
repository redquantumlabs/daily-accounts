export type DashboardCardId =
  | 'monthly_spending'
  | 'yearly_spending'
  | 'monthly_chart'
  | 'yearly_chart'
  | 'monthly_calendar'
  | 'yearly_calendar'
  | 'all_years_calendar';

export interface FlipCardPair {
  id: string;
  frontCardId?: DashboardCardId | null;
  backCardId?: DashboardCardId | null;
}

export interface FlipCardConfig {
  isEnabled: boolean;
  pairs: FlipCardPair[];
}

export interface DashboardCardMeta {
  id: DashboardCardId;
  name: string;
  category: 'Spending' | 'Chart' | 'Calendar';
  icon: string;
}

export const AVAILABLE_DASHBOARD_CARDS: DashboardCardMeta[] = [
  {
    id: 'monthly_spending',
    name: 'Monthly Spending Card',
    category: 'Spending',
    icon: 'wallet-outline',
  },
  {
    id: 'yearly_spending',
    name: 'Yearly Spending Card',
    category: 'Spending',
    icon: 'cash-outline',
  },
  {
    id: 'monthly_chart',
    name: 'Monthly Spending Chart',
    category: 'Chart',
    icon: 'bar-chart-outline',
  },
  {
    id: 'yearly_chart',
    name: 'Yearly Spending Chart',
    category: 'Chart',
    icon: 'trending-up-outline',
  },
  {
    id: 'monthly_calendar',
    name: 'Monthly Spending Calendar',
    category: 'Calendar',
    icon: 'calendar-outline',
  },
  {
    id: 'yearly_calendar',
    name: 'Yearly Spending Calendar',
    category: 'Calendar',
    icon: 'calendar-number-outline',
  },
  {
    id: 'all_years_calendar',
    name: 'All Years Spending Calendar',
    category: 'Calendar',
    icon: 'albums-outline',
  },
];

export const DEFAULT_FLIP_CARD_CONFIG: FlipCardConfig = {
  isEnabled: false,
  pairs: [],
};
