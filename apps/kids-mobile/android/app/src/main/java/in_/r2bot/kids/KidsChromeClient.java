package in_.r2bot.kids;

import android.net.Uri;
import android.webkit.GeolocationPermissions;
import android.webkit.PermissionRequest;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;

/**
 * Capacitor's BridgeWebChromeClient already turns a page's getUserMedia({ video })
 * into the Android CAMERA runtime prompt and grants the web request only once the
 * child's grown-up allows it (onPermissionRequest -> permission launcher -> grant).
 * This subclass narrows what it will grant, for a kids app:
 *  - only the camera (Workshop AR "magic window"), never the microphone, MIDI or
 *    protected-media IDs, which the base class would grant without asking;
 *  - only to the app's own bundled pages (https://localhost);
 *  - never location.
 */
public class KidsChromeClient extends BridgeWebChromeClient {

    private final Uri appOrigin;

    public KidsChromeClient(Bridge bridge) {
        super(bridge);
        this.appOrigin = Uri.parse(bridge.getLocalUrl());
    }

    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        String[] resources = request.getResources();
        boolean cameraOnly = resources != null && resources.length > 0;
        if (resources != null) {
            for (String resource : resources) {
                if (!PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                    cameraOnly = false;
                }
            }
        }
        Uri origin = request.getOrigin();
        boolean fromApp = origin != null &&
            origin.getHost() != null &&
            origin.getHost().equalsIgnoreCase(appOrigin.getHost()) &&
            origin.getScheme() != null &&
            origin.getScheme().equalsIgnoreCase(appOrigin.getScheme());
        if (cameraOnly && fromApp) {
            // Base class: asks for CAMERA at runtime, then grants or denies the web request.
            super.onPermissionRequest(request);
        } else {
            request.deny();
        }
    }

    @Override
    public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
        callback.invoke(origin, false, false);
    }
}
