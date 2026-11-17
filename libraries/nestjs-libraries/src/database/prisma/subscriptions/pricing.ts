export interface PricingInnerInterface {
  current: string;
  label: string;
  month_price: number;
  year_price: number;
  channel?: number;
  posts_per_month: number;
  team_members: boolean;
  community_features: boolean;
  featured_by_gitroom: boolean;
  ai: boolean;
  import_from_channels: boolean;
  image_generator?: boolean;
  image_generation_count: number;
  generate_videos: number;
  clipping_minutes: number;
  public_api: boolean;
  webhooks: number;
  autoPost: boolean;
}
export interface PricingInterface {
  [key: string]: PricingInnerInterface;
}
export const pricing: PricingInterface = {
  FREE: {
    current: 'FREE',
    label: 'Free',
    month_price: 0,
    year_price: 0,
    channel: 0,
    image_generation_count: 0,
    posts_per_month: 0,
    team_members: false,
    community_features: false,
    featured_by_gitroom: false,
    ai: false,
    import_from_channels: false,
    image_generator: false,
    public_api: false,
    webhooks: 0,
    autoPost: false,
    generate_videos: 0,
    clipping_minutes: 0,
  },
  STANDARD: {
    current: 'STANDARD',
    label: 'Starter',
    month_price: 19,
    year_price: 190,
    channel: 3,
    posts_per_month: 1000000,
    image_generation_count: 20,
    team_members: false,
    ai: true,
    community_features: false,
    featured_by_gitroom: false,
    import_from_channels: true,
    image_generator: false,
    public_api: true,
    webhooks: 2,
    autoPost: false,
    generate_videos: 3,
    clipping_minutes: 60,
  },
  TEAM: {
    current: 'TEAM',
    label: 'Growth',
    month_price: 49,
    year_price: 490,
    channel: 8,
    posts_per_month: 1000000,
    image_generation_count: 100,
    community_features: true,
    team_members: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10,
    autoPost: true,
    generate_videos: 10,
    clipping_minutes: 120,
  },
  PRO: {
    current: 'PRO',
    label: 'Pro',
    month_price: 99,
    year_price: 990,
    channel: 20,
    posts_per_month: 1000000,
    image_generation_count: 300,
    community_features: true,
    team_members: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 30,
    autoPost: true,
    generate_videos: 30,
    clipping_minutes: 300,
  },
  ULTIMATE: {
    current: 'ULTIMATE',
    label: 'Agency',
    month_price: 199,
    year_price: 1990,
    channel: 50,
    posts_per_month: 1000000,
    image_generation_count: 500,
    community_features: true,
    team_members: true,
    featured_by_gitroom: true,
    ai: true,
    import_from_channels: true,
    image_generator: true,
    public_api: true,
    webhooks: 10000,
    autoPost: true,
    generate_videos: 60,
    clipping_minutes: 600,
  },
};
