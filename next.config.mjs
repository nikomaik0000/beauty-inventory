import withPWAInit from "next-pwa";

// Phase 6A note on how deploys reach installed users, since this uses
// next-pwa 5.6.0's defaults (verified in node_modules/next-pwa/index.js)
// rather than anything custom:
//   - skipWaiting: a newly-deployed service worker activates as soon as
//     it finishes installing, instead of waiting for every open tab to
//     be closed first.
//   - clientsClaim (next-pwa's default, made explicit here): once
//     activated, the new worker immediately takes over network control
//     for any *new* navigation/reload — a tab that's already open and
//     never reloads keeps running on the worker it started with, which
//     is unavoidable without forcing a reload the user didn't ask for.
//   - cleanupOutdatedCaches (also next-pwa's default, made explicit
//     here): the previous deploy's precached files are deleted on
//     activation, so storage doesn't grow with every release.
//   - Build assets under /_next/static/** are content-hashed per
//     deploy, so old and new versions never collide in the cache even
//     mid-rollout.
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default withPWA(nextConfig);
