package com.mrdhameri.sketchboathost;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.IOException;
import java.util.Arrays;

public final class MainActivity extends Activity {
    private static final String URL = "https://mohammaddhameri-blip.github.io/smartboardgames/sketch-boat/host.html";
    private static final int FILE_PICKER = 4002, CAMERA_PERMISSION = 4003;
    private WebView web;
    private Uri cameraUri;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private PermissionRequest cameraWebPermission;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(12,20,34));
        web.setLayoutParams(new ViewGroup.LayoutParams(-1,-1));
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        web.setWebViewClient(new WebViewClient());
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    if (!"mohammaddhameri-blip.github.io".equals(request.getOrigin().getHost())) {
                        request.deny(); return;
                    }
                    if (!Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                        request.deny(); return;
                    }
                    cameraWebPermission = request;
                    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
                    } else {
                        grantWebCamera();
                    }
                });
            }

            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (cameraWebPermission == request) cameraWebPermission = null;
            }

            @Override public boolean onShowFileChooser(WebView view, android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                launchPicker();
                return true;
            }
        });
        if (state == null) web.loadUrl(URL); else web.restoreState(state);
    }

    private void grantWebCamera() {
        if (cameraWebPermission != null) {
            cameraWebPermission.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            cameraWebPermission = null;
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] grantResults) {
        super.onRequestPermissionsResult(requestCode,permissions,grantResults);
        if (requestCode == CAMERA_PERMISSION && cameraWebPermission != null) {
            if (grantResults.length>0 && grantResults[0]==PackageManager.PERMISSION_GRANTED) grantWebCamera();
            else {cameraWebPermission.deny();cameraWebPermission=null;}
        }
    }

    private void launchPicker() {
        Intent file = new Intent(Intent.ACTION_GET_CONTENT);
        file.addCategory(Intent.CATEGORY_OPENABLE);
        file.setType("image/*");
        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        Intent[] extras = new Intent[0];
        cameraUri = null;
        try {
            File dir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
            if (dir == null) dir=getCacheDir();
            File photo = File.createTempFile("sketch-boat-host-", ".jpg",dir);
            cameraUri = FileProvider.getUriForFile(this,"com.mrdhameri.sketchboathost.files",photo);
            camera.putExtra(MediaStore.EXTRA_OUTPUT,cameraUri);
            camera.setClipData(ClipData.newUri(getContentResolver(),"Sketch",cameraUri));
            camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            if(camera.resolveActivity(getPackageManager())!=null)extras=new Intent[]{camera};
        }catch(IOException|IllegalArgumentException error){cameraUri=null;}
        Intent chooser=Intent.createChooser(file,"Photograph a boat sketch");
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS,extras);
        try{startActivityForResult(chooser,FILE_PICKER);}
        catch(Exception error){if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}}
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==FILE_PICKER&&fileCallback!=null){
            Uri image=data!=null?data.getData():null;
            if(image==null&&resultCode==RESULT_OK)image=cameraUri;
            fileCallback.onReceiveValue(resultCode==RESULT_OK&&image!=null?new Uri[]{image}:null);
            fileCallback=null;cameraUri=null;
        }
    }

    @Override public void onBackPressed() {
        if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();
    }
    @Override protected void onSaveInstanceState(Bundle out){
        if(web!=null)web.saveState(out);super.onSaveInstanceState(out);
    }
    @Override protected void onDestroy(){
        if(cameraWebPermission!=null){cameraWebPermission.deny();cameraWebPermission=null;}
        if(web!=null){web.destroy();web=null;}super.onDestroy();
    }
}
