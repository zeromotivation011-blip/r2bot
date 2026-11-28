package in_.r2bot.kids;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * R2BOT Kids, the standalone app. Every page, script, sound and 3D model is bundled
 * in the APK (Capacitor webDir "www", served at https://localhost); nothing is loaded
 * from www.r2bot.in and the app works with no network. This class only adds what a
 * web page cannot do for itself:
 *  - {@link KidsWebViewClient}: maps /kids/hangar/ to kids/hangar/index.html (Capacitor
 *    would serve the root page), shows the bundled not-found page for unknown paths,
 *    and sends every link that is not part of the app to the system browser;
 *  - the same page mapping for service-worker fetches;
 *  - {@link KidsChromeClient}: the camera, and only the camera, for Workshop AR;
 *  - {@link KidsNativePlugin}: saving files, the share sheet, printing and the phone's own
 *    text-to-speech, which a WebView cannot do (called from lib/kids/native-app.ts);
 *  - Back walks back through the app's history and leaves the app from the home screen.
 *
 * WebView remote debugging needs no code here: with android.webContentsDebuggingEnabled
 * left unset, Capacitor turns it on for debuggable (debug) builds only.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Before super.onCreate: Capacitor registers plugins when it builds the bridge.
        registerPlugin(KidsNativePlugin.class);
        super.onCreate(savedInstanceState);

        final Bridge bridge = getBridge();
        if (bridge != null) {
            final KidsWebViewClient client = new KidsWebViewClient(bridge);
            bridge.setWebViewClient(client);
            bridge.getWebView().setWebChromeClient(new KidsChromeClient(bridge));

            if (bridge.getConfig().isResolveServiceWorkerRequests()) {
                ServiceWorkerController.getInstance().setServiceWorkerClient(
                    new ServiceWorkerClient() {
                        @Override
                        public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                            WebResourceResponse page = client.mapLocalPage(request);
                            return page != null ? page : bridge.getLocalServer().shouldInterceptRequest(request);
                        }
                    }
                );
            }
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && !isOnHome(webView) && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                // Home screen (or nothing to go back to): leave the app the normal way,
                // so the system plays the predictive back animation.
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }

    private static boolean isOnHome(WebView webView) {
        String current = webView.getUrl();
        if (current == null) return true;
        return KidsRoutes.isHome(Uri.parse(current).getPath());
    }
}
