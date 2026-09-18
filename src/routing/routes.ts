export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  applications: '/applications',
  documents: '/documents',
  settings: '/settings',
} as const;
export type RouteName = keyof typeof ROUTES;
export type RoutePattern = (typeof ROUTES)[RouteName];
