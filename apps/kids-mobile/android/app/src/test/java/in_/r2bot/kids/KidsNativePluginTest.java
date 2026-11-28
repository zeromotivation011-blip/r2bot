package in_.r2bot.kids;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

/** Device-free checks of the file-name and type rules used when the app saves or shares a file. */
public class KidsNativePluginTest {

    @Test
    public void fileNamesStayPlainNames() {
        assertEquals("r2bot-kids-backup-2026-11-28.txt", KidsNativePlugin.safeFileName("r2bot-kids-backup-2026-11-28.txt"));
        assertEquals("-..-etc-passwd", KidsNativePlugin.safeFileName("../../etc/passwd"));
        assertEquals("a-b.png", KidsNativePlugin.safeFileName("a/b.png"));
        assertEquals("hidden.txt", KidsNativePlugin.safeFileName("...hidden.txt"));
        assertEquals("r2bot-kids-file", KidsNativePlugin.safeFileName(""));
        assertEquals("r2bot-kids-file", KidsNativePlugin.safeFileName(null));
        assertEquals(120, KidsNativePlugin.safeFileName(new String(new char[300]).replace('\0', 'x') + ".pdf").length());
    }

    @Test
    public void mimeTypesAreCheckedNotTrusted() {
        assertEquals("text/plain", KidsNativePlugin.safeMime("text/plain;charset=utf-8"));
        assertEquals("image/png", KidsNativePlugin.safeMime("IMAGE/PNG"));
        assertEquals("application/pdf", KidsNativePlugin.safeMime("application/pdf"));
        assertEquals("application/octet-stream", KidsNativePlugin.safeMime("text/html\n<script>"));
        assertEquals("application/octet-stream", KidsNativePlugin.safeMime(null));
    }
}
