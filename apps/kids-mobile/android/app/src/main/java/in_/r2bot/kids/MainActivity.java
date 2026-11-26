package in_.r2bot.kids;

import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * R2BOT Kids shell. Everything the child sees is https://www.r2bot.in/kids
 * (plus the bundled offline page); this class only adds what a web page
 * cannot do for itself:
 *  - the system Back button / gesture walks back through the site's history
 *    and only leaves the app from the first page; on the offline page it skips
 *    the failed URL so Back can never loop;
 *  - WebView remote debugging is on for debug builds only, never in release.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null && isOnErrorPage(webView)) {
                    // Capacitor shows the offline page by loadUrl(errorUrl) AFTER the
                    // failed load, so history ends [.., page before, failed URL, offline page].
                    // A plain goBack() would retry the failed URL, fail again and push the
                    // offline page again: a Back trap. Skip the failed entry instead; every
                    // Back still moves one real page closer to the start, so it always ends.
                    if (webView.canGoBackOrForward(-2)) {
                        webView.goBackOrForward(-2);
                        return;
                    }
                    leaveApp();
                    return;
                }
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    return;
                }
                leaveApp();
            }

            private void leaveApp() {
                // First page: leave the app the normal way (predictive back animation).
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }

    /** True while the bundled offline page (server.errorPath) is showing. */
    private boolean isOnErrorPage(WebView webView) {
        String errorUrl = getBridge() != null ? getBridge().getErrorUrl() : null;
        String current = webView.getUrl();
        if (errorUrl == null || current == null) return false;
        return current.equals(errorUrl) || current.startsWith(errorUrl + "?") || current.startsWith(errorUrl + "#");
    }
}
