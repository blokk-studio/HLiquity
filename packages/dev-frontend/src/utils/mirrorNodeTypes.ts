/**
 * Type definition for Mirror Node API client
 * Matches the openapi-fetch Client interface used by useMirrorNodeClient()
 */
export type MirrorNodeClient = {
  GET: <T = any>(
    path: any,
    options?: any
  ) => Promise<{ data?: T; error?: any }>;
};
