package in_.r2bot.kids;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** Device-free checks of the bundled app's path rules (./gradlew testDebugUnitTest). */
public class KidsRoutesTest {

    @Test
    public void pagesMapToTheirIndexHtml() {
        assertEquals("kids/index.html", KidsRoutes.pageAssetFor("/kids/"));
        assertEquals("kids/index.html", KidsRoutes.pageAssetFor("/kids"));
        assertEquals("kids/hangar/index.html", KidsRoutes.pageAssetFor("/kids/hangar/"));
        assertEquals("kids/hangar/index.html", KidsRoutes.pageAssetFor("/kids/hangar"));
        assertEquals("kids/course/3/14/index.html", KidsRoutes.pageAssetFor("/kids/course/3/14/"));
        assertEquals("atlas/index.html", KidsRoutes.pageAssetFor("/atlas/"));
    }

    @Test
    public void filesTheRootAndProxyRoutesAreLeftToCapacitor() {
        assertNull(KidsRoutes.pageAssetFor("/"));
        assertNull(KidsRoutes.pageAssetFor(""));
        assertNull(KidsRoutes.pageAssetFor(null));
        assertNull(KidsRoutes.pageAssetFor("/kids/hangar/index.txt"));
        assertNull(KidsRoutes.pageAssetFor("/_next/static/chunks/main-abc.js"));
        assertNull(KidsRoutes.pageAssetFor("/offline.html"));
        assertNull(KidsRoutes.pageAssetFor("/kids/audio/spark.v2.mp3"));
        assertNull(KidsRoutes.pageAssetFor("/_capacitor_file_/data/x"));
        assertNull(KidsRoutes.pageAssetFor("/_capacitor_http_interceptor_"));
    }

    @Test
    public void pathsThatClimbAreRefused() {
        assertNull(KidsRoutes.pageAssetFor("/kids/../../secret"));
        assertNull(KidsRoutes.pageAssetFor("/kids/./hangar"));
        assertNull(KidsRoutes.pageAssetFor("/kids//hangar"));
        assertNull(KidsRoutes.pageAssetFor("/kids\\hangar"));
    }

    @Test
    public void onlyTheKidsAppStaysInTheWebView() {
        assertTrue(KidsRoutes.staysInApp("/"));
        assertTrue(KidsRoutes.staysInApp("/kids"));
        assertTrue(KidsRoutes.staysInApp("/kids/"));
        assertTrue(KidsRoutes.staysInApp("/kids/play/sumo/"));
        assertTrue(KidsRoutes.staysInApp("/_next/static/media/x.woff2"));
        assertTrue(KidsRoutes.staysInApp("/offline.html"));
        assertTrue(KidsRoutes.staysInApp("/index.html"));
        assertFalse(KidsRoutes.staysInApp("/kidsx"));
        assertFalse(KidsRoutes.staysInApp("/atlas/concept/pid-controller/"));
        assertFalse(KidsRoutes.staysInApp("/privacy"));
        assertFalse(KidsRoutes.staysInApp("/legal/privacy.html"));
    }

    @Test
    public void nonKidsPagesOpenOnTheWebsite() {
        assertEquals("https://www.r2bot.in/privacy", KidsRoutes.siteUrlFor("/privacy", null, null));
        assertEquals("https://www.r2bot.in/atlas/?q=pid#faq", KidsRoutes.siteUrlFor("/atlas/", "q=pid", "faq"));
        assertEquals("https://www.r2bot.in/", KidsRoutes.siteUrlFor("", "", ""));
    }

    @Test
    public void onlyBrowserMailAndDialerLeaveTheApp() {
        assertTrue(KidsRoutes.opensExternally("https"));
        assertTrue(KidsRoutes.opensExternally("HTTP"));
        assertTrue(KidsRoutes.opensExternally("mailto"));
        assertTrue(KidsRoutes.opensExternally("tel"));
        assertFalse(KidsRoutes.opensExternally("intent"));
        assertFalse(KidsRoutes.opensExternally("market"));
        assertFalse(KidsRoutes.opensExternally("file"));
        assertFalse(KidsRoutes.opensExternally(null));
    }

    @Test
    public void backLeavesTheAppOnlyFromHome() {
        assertTrue(KidsRoutes.isHome("/kids/"));
        assertTrue(KidsRoutes.isHome("/kids"));
        assertTrue(KidsRoutes.isHome("/"));
        assertFalse(KidsRoutes.isHome("/kids/hangar/"));
        assertFalse(KidsRoutes.isHome("/offline.html"));
    }
}
