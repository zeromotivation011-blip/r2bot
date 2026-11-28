package in_.r2bot.kids;

import java.util.Locale;

/**
 * The bundled app's path rules, as plain Java (no Android types) so the JVM unit
 * test in src/test can check every rule without a device.
 *
 * The app serves a Next.js static export (output: 'export', trailingSlash: true)
 * from the APK's assets at https://localhost/. A page lives at
 * {@code <path>/index.html}; JS/CSS/audio/3D/RSC payloads all have a file extension.
 */
final class KidsRoutes {

    /** Where outbound links to non-kids pages of the website go (system browser only). */
    static final String SITE_ORIGIN = "https://www.r2bot.in";

    private KidsRoutes() {}

    /**
     * The asset (relative to the web root, no leading slash) that holds the page for
     * an extensionless request path, e.g. "/kids/hangar/" and "/kids/hangar" both map to
     * "kids/hangar/index.html". Returns null when the path is not a page request and
     * must be left to Capacitor: the root "/", anything whose last segment has a '.',
     * Capacitor's internal proxy routes, and any path that tries to climb with "..".
     */
    static String pageAssetFor(String path) {
        if (path == null || path.isEmpty() || path.equals("/")) return null;
        if (!path.startsWith("/")) return null;
        if (path.startsWith("/_capacitor_")) return null;
        if (path.contains("\\") || path.indexOf('\0') >= 0) return null;
        for (String segment : path.split("/")) {
            if (segment.equals("..") || segment.equals(".")) return null;
        }
        String trimmed = path;
        while (trimmed.endsWith("/") && trimmed.length() > 1) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        if (trimmed.contains("//")) return null;
        String last = trimmed.substring(trimmed.lastIndexOf('/') + 1);
        if (last.isEmpty() || last.contains(".")) return null;
        return trimmed.substring(1) + "/index.html";
    }

    /**
     * True when a navigation to this local path may load inside the app's WebView:
     * the root, everything under /kids, the Next.js build output under /_next, and
     * single-segment static files at the root (index.html, 404.html, favicon...).
     * Every other local path is a page of the main website, which the app does not
     * carry: it opens on www.r2bot.in in the system browser instead.
     */
    static boolean staysInApp(String path) {
        if (path == null || path.isEmpty() || path.equals("/")) return true;
        if (path.equals("/kids") || path.startsWith("/kids/")) return true;
        if (path.startsWith("/_next/")) return true;
        String rest = path.substring(1);
        return !rest.contains("/") && rest.contains(".");
    }

    /** The website URL for a local, non-kids path (encoded parts, as a Uri gives them). */
    static String siteUrlFor(String encodedPath, String encodedQuery, String encodedFragment) {
        StringBuilder sb = new StringBuilder(SITE_ORIGIN);
        sb.append(encodedPath == null || encodedPath.isEmpty() ? "/" : encodedPath);
        if (encodedQuery != null && !encodedQuery.isEmpty()) sb.append('?').append(encodedQuery);
        if (encodedFragment != null && !encodedFragment.isEmpty()) sb.append('#').append(encodedFragment);
        return sb.toString();
    }

    /**
     * Schemes a main-frame navigation may hand to another app (the system browser,
     * the mail app, the dialer). Anything else (intent:, market:, file:, custom app
     * schemes) is dropped: a kids app does not launch arbitrary apps from a link.
     */
    static boolean opensExternally(String scheme) {
        if (scheme == null) return false;
        String s = scheme.toLowerCase(Locale.ROOT);
        return s.equals("https") || s.equals("http") || s.equals("mailto") || s.equals("tel");
    }

    /** True on the R2BOT Kids home screen (and the root, which forwards to it): Back leaves the app there. */
    static boolean isHome(String path) {
        return path == null || path.isEmpty() || path.equals("/") || path.equals("/index.html")
            || path.equals("/kids") || path.equals("/kids/") || path.equals("/kids/index.html");
    }
}
