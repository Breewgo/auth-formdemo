import { useEffect } from "react";
import Head from "next/head";
import { startAutoSync } from "../lib/offlineDb";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Upload items saved offline, now and whenever the signal comes back.
    startAutoSync();

    // Service worker (public/sw.js) so the installed app opens offline. Production
    // builds only: in `next dev` it would serve stale code. Browsers allow it only on
    // https:// or localhost; the iOS (Capacitor) build has no service workers and skips this.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
