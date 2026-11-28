package in_.r2bot.kids;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * What an Android WebView cannot do by itself, for the bundled kids pages
 * (lib/kids/native-app.ts is the only caller):
 *
 *  - saveFile: an Android WebView drops {@code <a download href="blob:...">} clicks, so the
 *    backup code file, robot cards and certificate PDFs are written here, to
 *    Downloads/R2BOT Kids (MediaStore, Android 10+, no storage permission). On Android 7-9,
 *    where that needs a storage permission the app does not ask for, the share sheet opens
 *    instead so the grown-up chooses where the file goes (Drive, Files, email).
 *  - shareFile / shareText: the WebView has no navigator.share; this opens the Android share sheet.
 *  - print: window.print() does nothing in a WebView; this prints the current page through
 *    the system print service (which also offers "Save as PDF").
 *  - speak / stopSpeaking: speechSynthesis in a WebView usually has no voices and stays silent;
 *    this reads text with the phone's own text-to-speech engine, on the device.
 *
 * Capacitor only accepts plugin calls from the app's own pages (https://localhost).
 */
@CapacitorPlugin(name = "KidsNative")
public class KidsNativePlugin extends Plugin {

    private static final String SAVE_FOLDER = "R2BOT Kids";
    private static final int MAX_FILE_BYTES = 25 * 1024 * 1024;

    private TextToSpeech tts;
    private volatile int ttsState = 0; // 0 starting, 1 ready, -1 unavailable
    private final List<Runnable> waitingForTts = new ArrayList<>();
    private final Map<String, PluginCall> speaking = new ConcurrentHashMap<>();

    @Override
    public void load() {
        Context context = getContext();
        tts = new TextToSpeech(context.getApplicationContext(), status -> {
            synchronized (waitingForTts) {
                ttsState = status == TextToSpeech.SUCCESS ? 1 : -1;
                for (Runnable r : waitingForTts) r.run();
                waitingForTts.clear();
            }
        });
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override
            public void onStart(String utteranceId) {}

            @Override
            public void onDone(String utteranceId) {
                finishSpeech(utteranceId, "end");
            }

            @Override
            @Deprecated
            public void onError(String utteranceId) {
                finishSpeech(utteranceId, "error");
            }

            @Override
            public void onError(String utteranceId, int errorCode) {
                finishSpeech(utteranceId, "error");
            }

            @Override
            public void onStop(String utteranceId, boolean interrupted) {
                finishSpeech(utteranceId, "cancel");
            }
        });
    }

    // ── files ────────────────────────────────────────────────────────────────

    @PluginMethod
    public void saveFile(final PluginCall call) {
        final byte[] data = decode(call);
        if (data == null) return;
        final String name = safeFileName(call.getString("fileName"));
        final String mime = safeMime(call.getString("mime"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (writeToDownloads(data, name, mime)) {
                runOnUi(() -> Toast.makeText(getContext(), "Saved in Downloads › " + SAVE_FOLDER + ": " + name, Toast.LENGTH_LONG).show());
                JSObject ret = new JSObject();
                ret.put("result", "saved");
                ret.put("where", "Downloads › " + SAVE_FOLDER);
                call.resolve(ret);
                return;
            }
        }
        // Android 7-9 (or the write failed): let the grown-up choose where it goes.
        share(call, data, name, mime, call.getString("title", name), "shared");
    }

    @PluginMethod
    public void shareFile(final PluginCall call) {
        final byte[] data = decode(call);
        if (data == null) return;
        share(call, data, safeFileName(call.getString("fileName")), safeMime(call.getString("mime")), call.getString("title", ""), "shared");
    }

    @PluginMethod
    public void shareText(final PluginCall call) {
        final String text = call.getString("text", "");
        if (text == null || text.isEmpty()) {
            call.reject("Nothing to share");
            return;
        }
        final String title = call.getString("title", "");
        runOnUi(() -> {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType("text/plain");
            send.putExtra(Intent.EXTRA_TEXT, text);
            if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
            if (startChooser(send, title)) {
                resolveResult(call, "shared");
            } else {
                call.reject("No app can share this");
            }
        });
    }

    private void share(final PluginCall call, byte[] data, String name, String mime, final String title, final String result) {
        final Uri uri;
        try {
            File dir = new File(getContext().getCacheDir(), "shared");
            if (!dir.isDirectory() && !dir.mkdirs()) throw new IOException("No cache folder");
            // One file at a time: clear what an earlier share left behind.
            File[] old = dir.listFiles();
            if (old != null) for (File f : old) //noinspection ResultOfMethodCallIgnored
                f.delete();
            File file = new File(dir, name);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(data);
            }
            uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
        } catch (IOException | IllegalArgumentException e) {
            call.reject("Could not prepare the file");
            return;
        }
        final String type = mime;
        runOnUi(() -> {
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(type);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            if (title != null && !title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
            send.setClipData(ClipData.newRawUri("", uri));
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if (startChooser(send, title)) {
                resolveResult(call, result);
            } else {
                call.reject("No app can take this file");
            }
        });
    }

    private boolean writeToDownloads(byte[] data, String name, String mime) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
        ContentResolver resolver = getContext().getContentResolver();
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mime);
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + SAVE_FOLDER);
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);
        Uri uri = null;
        try {
            uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (uri == null) return false;
            try (OutputStream out = resolver.openOutputStream(uri)) {
                if (out == null) throw new IOException("No output stream");
                out.write(data);
            }
            values.clear();
            values.put(MediaStore.MediaColumns.IS_PENDING, 0);
            resolver.update(uri, values, null, null);
            return true;
        } catch (IOException | RuntimeException e) {
            if (uri != null) {
                try {
                    resolver.delete(uri, null, null);
                } catch (RuntimeException ignored) {
                    // nothing more to clean up
                }
            }
            return false;
        }
    }

    private boolean startChooser(Intent send, String title) {
        Activity activity = getActivity();
        if (activity == null) return false;
        try {
            Intent chooser = Intent.createChooser(send, title == null || title.isEmpty() ? null : title);
            chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(chooser);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    private byte[] decode(PluginCall call) {
        String b64 = call.getString("data");
        if (b64 == null || b64.isEmpty()) {
            call.reject("No file data");
            return null;
        }
        if (b64.length() > (MAX_FILE_BYTES / 3) * 4 + 4) {
            call.reject("File too large");
            return null;
        }
        try {
            return Base64.decode(b64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Bad file data");
            return null;
        }
    }

    /** A plain file name: no folders, no control characters, never empty. */
    static String safeFileName(String raw) {
        String name = raw == null ? "" : raw.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]+", "-").trim();
        while (name.startsWith(".")) name = name.substring(1);
        if (name.isEmpty()) name = "r2bot-kids-file";
        if (name.length() > 120) name = name.substring(name.length() - 120);
        return name;
    }

    static String safeMime(String raw) {
        if (raw == null) return "application/octet-stream";
        String mime = raw.split(";")[0].trim().toLowerCase(Locale.ROOT);
        return mime.matches("[a-z]+/[a-z0-9.+-]+") ? mime : "application/octet-stream";
    }

    // ── print ────────────────────────────────────────────────────────────────

    @PluginMethod
    public void print(final PluginCall call) {
        final String raw = call.getString("title", "R2BOT Kids");
        final String jobName = raw == null || raw.trim().isEmpty() ? "R2BOT Kids" : raw.trim();
        runOnUi(() -> {
            Activity activity = getActivity();
            WebView webView = getBridge().getWebView();
            PrintManager printManager = activity == null ? null : (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
            if (printManager == null || webView == null) {
                call.reject("Printing is not available on this device");
                return;
            }
            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(jobName);
            printManager.print(jobName, adapter, new PrintAttributes.Builder().build());
            resolveResult(call, "printing");
        });
    }

    // ── speech ───────────────────────────────────────────────────────────────

    @PluginMethod
    public void speechInfo(final PluginCall call) {
        whenTtsSettled(() -> {
            JSObject ret = new JSObject();
            ret.put("available", ttsState == 1);
            String lang = "en-GB";
            try {
                if (ttsState == 1 && tts.getVoice() != null && tts.getVoice().getLocale() != null) {
                    lang = tts.getVoice().getLocale().toLanguageTag();
                }
            } catch (RuntimeException ignored) {
                // keep the default
            }
            ret.put("lang", lang);
            call.resolve(ret);
        });
    }

    /** Speaks one utterance; resolves with {event: "end" | "error" | "cancel"} when it finishes. */
    @PluginMethod
    public void speak(final PluginCall call) {
        final String id = call.getString("id");
        final String text = call.getString("text", "");
        if (id == null || id.isEmpty()) {
            call.reject("No id");
            return;
        }
        whenTtsSettled(() -> {
            if (ttsState != 1) {
                resolveEvent(call, "error");
                return;
            }
            if (text == null || text.trim().isEmpty()) {
                resolveEvent(call, "end");
                return;
            }
            String lang = call.getString("lang");
            if (lang != null && !lang.isEmpty()) {
                Locale locale = Locale.forLanguageTag(lang.replace('_', '-'));
                int ok = tts.isLanguageAvailable(locale);
                if (ok >= TextToSpeech.LANG_AVAILABLE) tts.setLanguage(locale);
            }
            Float rate = call.getFloat("rate", 1f);
            Float pitch = call.getFloat("pitch", 1f);
            Float volume = call.getFloat("volume", 1f);
            tts.setSpeechRate(clamp(rate == null ? 1f : rate, 0.3f, 2.5f));
            tts.setPitch(clamp(pitch == null ? 1f : pitch, 0.5f, 2f));
            Bundle params = new Bundle();
            params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, clamp(volume == null ? 1f : volume, 0f, 1f));
            speaking.put(id, call);
            String clipped = text.length() > TextToSpeech.getMaxSpeechInputLength() - 1
                ? text.substring(0, TextToSpeech.getMaxSpeechInputLength() - 1)
                : text;
            int res = tts.speak(clipped, TextToSpeech.QUEUE_ADD, params, id);
            if (res != TextToSpeech.SUCCESS) finishSpeech(id, "error");
        });
    }

    @PluginMethod
    public void stopSpeaking(final PluginCall call) {
        stopAllSpeech();
        call.resolve();
    }

    private void stopAllSpeech() {
        if (tts != null && ttsState == 1) {
            try {
                tts.stop();
            } catch (RuntimeException ignored) {
                // engine gone
            }
        }
        for (String id : new ArrayList<>(speaking.keySet())) finishSpeech(id, "cancel");
    }

    private void finishSpeech(String id, String event) {
        if (id == null) return;
        PluginCall call = speaking.remove(id);
        if (call != null) resolveEvent(call, event);
    }

    private void whenTtsSettled(Runnable r) {
        synchronized (waitingForTts) {
            if (ttsState == 0) {
                waitingForTts.add(r);
                return;
            }
        }
        r.run();
    }

    @Override
    protected void handleOnPause() {
        // The app went to the background: stop reading aloud.
        stopAllSpeech();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        stopAllSpeech();
        if (tts != null) {
            try {
                tts.shutdown();
            } catch (RuntimeException ignored) {
                // already gone
            }
        }
        super.handleOnDestroy();
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void runOnUi(Runnable r) {
        getBridge().executeOnMainThread(r);
    }

    private static float clamp(float v, float lo, float hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static void resolveResult(PluginCall call, String result) {
        JSObject ret = new JSObject();
        ret.put("result", result);
        call.resolve(ret);
    }

    private static void resolveEvent(PluginCall call, String event) {
        JSObject ret = new JSObject();
        ret.put("event", event);
        call.resolve(ret);
    }
}
