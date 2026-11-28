package in_.r2bot.kids;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Logger;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The bundled app's WebViewClient. It extends Capacitor's BridgeWebViewClient, so
 * the bridge, plugins, page listeners and error handling keep working, and adds two
 * things Capacitor does not do for a multi-page static export:
 *
 * 1. Page mapping. Capacitor's WebViewLocalServer (html5 mode) answers EVERY
 *    extensionless path with the root index.html, which is right for a single-page
 *    app and wrong here: a reload of /kids/hangar/ would show the root page. A local
 *    request for an extensionless path is answered with {@code <path>/index.html}
 *    from the APK's web assets when that file exists, and with the bundled
 *    "not found" page (offline.html) when it does not. Everything else (the root,
 *    files with an extension, Capacitor's proxy routes) goes to Capacitor unchanged.
 *
 * 2. Navigation. Only https://localhost (the app) loads in the WebView, and only the
 *    root, /kids/**, /_next/** and root files. A link to any other local path is a page
 *    of the main website, which the app does not carry: it opens on www.r2bot.in in the
 *    system browser. Other hosts and mailto:/tel: open in their own apps; other schemes
 *    are dropped. Nothing outside the app ever loads inside the WebView.
 */
public class KidsWebViewClient extends BridgeWebViewClient {

    /** Bundled "not found" page, tried in order (the export's own page first). */
    private static final String[] NOT_FOUND_ASSETS = { "offline.html", "404.html", "404/index.html" };

    private final Bridge bridge;
    private final Context context;
    private final AssetManager assets;
    private final Uri appOrigin;
    private final Map<String, Boolean> assetExists = new ConcurrentHashMap<>();

    public KidsWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        this.context = bridge.getContext();
        this.assets = context.getAssets();
        this.appOrigin = Uri.parse(bridge.getLocalUrl());
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        WebResourceResponse page = mapLocalPage(request);
        return page != null ? page : super.shouldInterceptRequest(view, request);
    }

    /**
     * The page for an extensionless local request, or null to let Capacitor answer.
     * Also used for service-worker fetches (see MainActivity), so a worker that
     * precaches /kids/... pages stores the real page, not the root.
     */
    WebResourceResponse mapLocalPage(WebResourceRequest request) {
        Uri url = request.getUrl();
        if (!isAppOrigin(url)) return null;
        String method = request.getMethod();
        if (method != null && !method.equalsIgnoreCase("GET") && !method.equalsIgnoreCase("HEAD")) return null;

        String asset = KidsRoutes.pageAssetFor(url.getPath());
        if (asset == null) return null;
        if (exists(asset)) return html(asset, 200, "OK");

        for (String notFound : NOT_FOUND_ASSETS) {
            if (exists(notFound)) return html(notFound, 404, "Not Found");
        }
        return null;
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri url = request.getUrl();
        String scheme = url.getScheme() == null ? "" : url.getScheme().toLowerCase(Locale.ROOT);

        // data:/blob: (in-page downloads) behave exactly as in Capacitor.
        if (scheme.equals("data") || scheme.equals("blob")) {
            return super.shouldOverrideUrlLoading(view, request);
        }

        if (isAppOrigin(url)) {
            if (KidsRoutes.staysInApp(url.getPath())) {
                // Capacitor still blocks its internal proxy routes and lets plugins have a say.
                return super.shouldOverrideUrlLoading(view, request);
            }
            if (request.isForMainFrame()) {
                openOutside(Uri.parse(KidsRoutes.siteUrlFor(url.getEncodedPath(), url.getEncodedQuery(), url.getEncodedFragment())));
            }
            return true;
        }

        // Anything not the app: never inside the WebView. Frames are simply blocked;
        // a page-level link goes to the system browser / mail app / dialer.
        if (request.isForMainFrame() && KidsRoutes.opensExternally(scheme)) {
            openOutside(url);
        }
        return true;
    }

    private void openOutside(Uri url) {
        Intent intent = new Intent(Intent.ACTION_VIEW, url);
        String scheme = url.getScheme();
        if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
        }
        if (!(context instanceof android.app.Activity)) {
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        try {
            context.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Logger.warn("No app to open " + url.getScheme() + " link");
        }
    }

    private boolean isAppOrigin(Uri url) {
        return (
            url.getScheme() != null &&
            url.getHost() != null &&
            url.getScheme().equalsIgnoreCase(appOrigin.getScheme()) &&
            url.getHost().equalsIgnoreCase(appOrigin.getHost()) &&
            url.getPort() == appOrigin.getPort()
        );
    }

    private boolean exists(String asset) {
        Boolean known = assetExists.get(asset);
        if (known != null) return known;
        boolean found;
        try (InputStream in = assets.open(webAsset(asset))) {
            found = in != null;
        } catch (IOException e) {
            found = false;
        }
        assetExists.put(asset, found);
        return found;
    }

    private WebResourceResponse html(String asset, int status, String reason) {
        try {
            InputStream stream = assets.open(webAsset(asset));
            // Same treatment as Capacitor's own index.html: the bridge script is injected
            // here only on WebViews too old for document-start scripts (no-op otherwise).
            stream = bridge.getLocalServer().getJavaScriptInjectedStream(stream);
            Map<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-cache");
            return new WebResourceResponse("text/html", "UTF-8", status, reason, headers, stream);
        } catch (IOException e) {
            Logger.error("Unable to open bundled page " + asset, e);
            return null;
        }
    }

    private static String webAsset(String asset) {
        return Bridge.DEFAULT_WEB_ASSET_DIR + "/" + asset;
    }
}
