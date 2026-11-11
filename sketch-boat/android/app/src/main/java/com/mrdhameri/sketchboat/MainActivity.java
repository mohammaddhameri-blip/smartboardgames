package com.mrdhameri.sketchboat;

import android.app.Activity;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.Color;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.IOException;

public final class MainActivity extends Activity {
    private static final int FILE_REQUEST = 4201;
    private static final String GAME_URL = "https://mohammaddhameri-blip.github.io/smartboardgames/sketch-boat/";
    private WebView web;
    private android.webkit.ValueCallback<Uri[]> pendingChooser;
    private Uri cameraUri;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8,22,34));
        web.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingChooser != null) pendingChooser.onReceiveValue(null);
                pendingChooser = callback;
                openImagePicker();
                return true;
            }
        });
        if (state != null) web.restoreState(state);
        else web.loadUrl(GAME_URL);
    }

    private void openImagePicker() {
        Intent gallery = new Intent(Intent.ACTION_GET_CONTENT);
        gallery.addCategory(Intent.CATEGORY_OPENABLE);
        gallery.setType("image/*");
        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        Intent[] initial = new Intent[0];
        cameraUri = null;
        try {
            File folder = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            if (folder == null) folder = getCacheDir();
            File photo = File.createTempFile("sketch-boat-", ".jpg", folder);
            cameraUri = FileProvider.getUriForFile(this, "com.mrdhameri.sketchboat.files", photo);
            camera.putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
            camera.setClipData(ClipData.newUri(getContentResolver(), "boat-photo", cameraUri));
            camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if (camera.resolveActivity(getPackageManager()) != null) initial = new Intent[]{camera};
        } catch (IOException | IllegalArgumentException e) { cameraUri = null; }

        Intent chooser = Intent.createChooser(gallery, "Capture or select boat drawing");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, initial);
        try { startActivityForResult(chooser, FILE_REQUEST); }
        catch (Exception e) {
            if (pendingChooser != null) pendingChooser.onReceiveValue(null);
            pendingChooser = null;
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if (requestCode == FILE_REQUEST && pendingChooser != null) {
            Uri selected = data != null ? data.getData() : null;
            if (selected == null && resultCode == RESULT_OK) selected = cameraUri;
            pendingChooser.onReceiveValue(resultCode == RESULT_OK && selected != null ? new Uri[]{selected} : null);
            pendingChooser = null; cameraUri = null;
        }
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle out) {
        if(web!=null) web.saveState(out);
        super.onSaveInstanceState(out);
    }

    @Override protected void onDestroy() {
        if(web!=null){web.destroy();web=null;}
        super.onDestroy();
    }
}
