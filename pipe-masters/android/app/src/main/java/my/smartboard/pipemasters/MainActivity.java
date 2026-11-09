package my.smartboard.pipemasters;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Pipe Masters Android shell. Browser and APK use the same GitHub HTML source. */
public final class MainActivity extends Activity {
    private static final String GAME_URL = "https://appassets.androidplatform.net/game/index.html";
    private static final String UPDATE_URL = "https://raw.githubusercontent.com/mohammaddhameri-blip/smartboardgames/main/pipe-masters/index.html";
    private static final int CAMERA_REQUEST = 1104;
    private static final int MAX_GAME_BYTES = 900_000;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView view;
    private TextView splash;
    private PermissionRequest pending;
    private volatile boolean updating = false;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xff0b1622);
        view = new WebView(this);
        root.addView(view, new FrameLayout.LayoutParams(-1, -1));
        splash = new TextView(this);
        splash.setGravity(17);
        splash.setTextSize(18);
        splash.setTextColor(0xffffffff);
        splash.setBackgroundColor(0xff0b1622);
        splash.setText("PIPE MASTERS\n\nChecking for the latest game…");
        root.addView(splash, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        configureWebView();
        checkUpdates(true, false);
    }

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    private void configureWebView() {
        WebSettings s = view.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/game/", path -> {
                if (!"index.html".equals(path)) return null;
                try {
                    File cached = new File(getFilesDir(), "latest-game.html");
                    InputStream body = cached.isFile() ? new FileInputStream(cached)
                        : getAssets().open("index.html");
                    return new WebResourceResponse("text/html", "UTF-8", body);
                } catch (IOException e) {
                    return new WebResourceResponse("text/plain", "UTF-8",
                        new ByteArrayInputStream("Offline game unavailable".getBytes(StandardCharsets.UTF_8)));
                }
            }).build();
        view.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !GAME_URL.equals(r.getUrl().toString());
            }
            @Override public void onPageFinished(WebView v, String url) {
                if (GAME_URL.equals(url)) splash.setVisibility(View.GONE);
            }
        });
        view.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest req) {
                main.post(() -> handleCameraPermission(req));
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest req) {
                if (pending == req) pending = null;
            }
        });
        view.addJavascriptInterface(new GameBridge(), "PipeMastersAndroid");
    }

    private void handleCameraPermission(PermissionRequest req) {
        // Restrict permission to our secure game origin and camera capture only.
        if (!"https://appassets.androidplatform.net".equals(req.getOrigin().toString()) ||
            !Arrays.asList(req.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE) ||
            req.getResources().length != 1) {
            req.deny();
            return;
        }
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            if (pending != null && pending != req) pending.deny();
            pending = req;
            requestPermissions(new String[] {Manifest.permission.CAMERA}, CAMERA_REQUEST);
        } else {
            req.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] perms, int[] results) {
        super.onRequestPermissionsResult(requestCode, perms, results);
        if (requestCode == CAMERA_REQUEST && pending != null) {
            PermissionRequest request = pending;
            pending = null;
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED)
                request.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            else request.deny();
        }
    }

    private static byte[] fetchGame() throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(UPDATE_URL + "?fresh=" + System.currentTimeMillis()).openConnection();
        conn.setConnectTimeout(4500);
        conn.setReadTimeout(4500);
        conn.setInstanceFollowRedirects(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        try {
            if (conn.getResponseCode() != 200) throw new IOException("Update server returned " + conn.getResponseCode());
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (InputStream in = conn.getInputStream()) {
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) != -1) {
                    if (out.size() + n > MAX_GAME_BYTES) throw new IOException("Update is too large");
                    out.write(buffer, 0, n);
                }
            }
            byte[] data = out.toByteArray();
            String head = new String(data, 0, Math.min(data.length, 1500), StandardCharsets.UTF_8).toLowerCase();
            if (!head.contains("<!doctype html") || !head.contains("<html"))
                throw new IOException("Invalid game update");
            return data;
        } finally { conn.disconnect(); }
    }

    private boolean saveIfChanged(byte[] next) throws Exception {
        File file = new File(getFilesDir(), "latest-game.html");
        if (file.exists()) {
            try (InputStream in = new FileInputStream(file)) {
                ByteArrayOutputStream current = new ByteArrayOutputStream();
                byte[] buf = new byte[8192]; int n;
                while ((n = in.read(buf)) != -1) current.write(buf, 0, n);
                if (MessageDigest.isEqual(MessageDigest.getInstance("SHA-256").digest(current.toByteArray()),
                    MessageDigest.getInstance("SHA-256").digest(next))) return false;
            }
        }
        File tmp = new File(getFilesDir(), "latest-game.tmp");
        try (FileOutputStream stream = new FileOutputStream(tmp)) {
            stream.write(next);
            stream.getFD().sync();
        }
        if (!tmp.renameTo(file)) throw new IOException("Unable to save the update");
        return true;
    }

    private synchronized void checkUpdates(boolean onLaunch, boolean requested) {
        if (updating) return;
        updating = true;
        io.execute(() -> {
            boolean changed = false;
            boolean online = false;
            try { changed = saveIfChanged(fetchGame()); online = true; }
            catch (Exception ignored) { /* Offline: bundled or cached game remains playable. */ }
            final boolean changedFinal = changed, onlineFinal = online;
            main.post(() -> {
                updating = false;
                if (onLaunch) {
                    splash.setText("PIPE MASTERS\n\nOpening the game…");
                    view.loadUrl(GAME_URL);
                } else if (changedFinal) {
                    Toast.makeText(this, "Game updated. Reloading the new version.", Toast.LENGTH_SHORT).show();
                    view.loadUrl(GAME_URL);
                } else if (requested) {
                    Toast.makeText(this, onlineFinal ? "Pipe Masters is up to date." :
                        "Offline. Using your saved version.", Toast.LENGTH_SHORT).show();
                }
            });
        });
    }

    public final class GameBridge {
        @JavascriptInterface public void checkForUpdates() {
            main.post(() -> checkUpdates(false, true));
        }
        @JavascriptInterface public String getAppVersion() { return "Android shell 0.2.0"; }
    }

    @Override public void onBackPressed() {
        if (view != null && view.canGoBack()) view.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (pending != null) pending.deny();
        io.shutdownNow();
        if (view != null) { view.loadUrl("about:blank"); view.destroy(); }
        super.onDestroy();
    }
}
