package my.smartboard.pipemasters;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.provider.Settings;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.HandlerThread;
import android.graphics.ImageFormat;
import android.graphics.Rect;
import android.graphics.YuvImage;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
import android.util.Base64;
import android.util.Size;
import android.view.Surface;
import org.json.JSONArray;
import org.json.JSONObject;
import java.nio.ByteBuffer;
import java.io.OutputStream;
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
    private static final int CAMERA_PREFLIGHT_REQUEST = 1105;
    private static final int REPORT_EXPORT_REQUEST = 1106;
    private static final int MAX_GAME_BYTES = 900_000;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private WebView view;
    private TextView splash;
    private PermissionRequest pending;
    private boolean nativeCameraPreflightPending = false;
    private volatile boolean updating = false;
    private String pendingBugReport;
    private CameraDevice nativeCamera;
    private CameraCaptureSession nativeSession;
    private ImageReader nativeReader;
    private HandlerThread cameraThread;
    private Handler cameraHandler;
    private volatile boolean nativeRequested = false;
    private long lastNativeFrame = 0;

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
        // WebView may stringify the origin with a trailing slash or a default port.
        // Validate the URI components rather than comparing its entire string.
        android.net.Uri origin = req.getOrigin();
        boolean trustedOrigin = origin != null
            && "https".equalsIgnoreCase(origin.getScheme())
            && "appassets.androidplatform.net".equalsIgnoreCase(origin.getHost())
            && (origin.getPort() == -1 || origin.getPort() == 443);
        // Grant only camera video access, never microphone or other WebView permissions.
        // Some WebView versions include additional resources in a video permission request.
        boolean videoRequested = Arrays.asList(req.getResources())
            .contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
        if (!trustedOrigin || !videoRequested) {
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

    private void preflightCameraPermission() {
        if (Build.VERSION.SDK_INT < 23 ||
            checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            sendPreflightResult(true);
            return;
        }
        if (nativeCameraPreflightPending) return;
        nativeCameraPreflightPending = true;
        requestPermissions(new String[] {Manifest.permission.CAMERA}, CAMERA_PREFLIGHT_REQUEST);
    }

    private void sendPreflightResult(boolean granted) {
        if (view != null) {
            view.evaluateJavascript(
                "window.pipeMastersNativeCameraPermission && window.pipeMastersNativeCameraPermission(" +
                    (granted ? "true" : "false") + ");", null);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] perms, int[] results) {
        super.onRequestPermissionsResult(requestCode, perms, results);
        boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
        if (requestCode == CAMERA_PREFLIGHT_REQUEST) {
            nativeCameraPreflightPending = false;
            sendPreflightResult(granted);
        } else if (requestCode == CAMERA_REQUEST && pending != null) {
            PermissionRequest request = pending;
            pending = null;
            if (granted) request.grant(new String[] {PermissionRequest.RESOURCE_VIDEO_CAPTURE});
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


    private void script(String js) {
        main.post(() -> { if(view!=null)view.evaluateJavascript(js,null); });
    }
    private void nativeCameraError(String reason) {
        script("window.pipeMastersNativeCameraError && window.pipeMastersNativeCameraError("+JSONObject.quote(reason)+");");
        main.post(this::stopNativeCameraInternal);
    }
    @SuppressLint("MissingPermission")
    private void startNativeCameraInternal(String preferred) {
        stopNativeCameraInternal();
        if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.CAMERA)!=PackageManager.PERMISSION_GRANTED){
            nativeCameraError("Android Camera permission is not granted.");return;
        }
        try {
            CameraManager manager=(CameraManager)getSystemService(CAMERA_SERVICE);
            if(manager==null)throw new IOException("Android CameraManager unavailable.");
            String[] all=manager.getCameraIdList();
            if(all.length==0)throw new IOException("No camera exposed through Android Camera2.");
            String chosen=null;
            for(String id:all){
                Integer facing=manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
                if("external".equals(preferred)&&facing!=null&&facing==CameraCharacteristics.LENS_FACING_EXTERNAL){chosen=id;break;}
                if(!"external".equals(preferred)&&facing!=null&&facing==CameraCharacteristics.LENS_FACING_FRONT){chosen=id;break;}
            }
            if(chosen==null){
                if("external".equals(preferred))throw new IOException("No external camera exposed through Android Camera2.");
                chosen=all[0];
            }
            CameraCharacteristics characteristics=manager.getCameraCharacteristics(chosen);
            StreamConfigurationMap map=characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            Size[] sizes=map==null?null:map.getOutputSizes(ImageFormat.YUV_420_888);
            if(sizes==null||sizes.length==0)throw new IOException("Camera cannot provide YUV video frames.");
            Size picked=sizes[0];int best=Integer.MAX_VALUE;
            for(Size size:sizes){
                int cost=Math.abs(size.getWidth()-640)+Math.abs(size.getHeight()-480);
                if(size.getWidth()<320||size.getHeight()<240)cost+=100000;
                if(cost<best){best=cost;picked=size;}
            }
            nativeReader=ImageReader.newInstance(picked.getWidth(),picked.getHeight(),ImageFormat.YUV_420_888,2);
            cameraThread=new HandlerThread("PipeMastersCamera2");cameraThread.start();
            cameraHandler=new Handler(cameraThread.getLooper());
            nativeRequested=true;lastNativeFrame=0;
            nativeReader.setOnImageAvailableListener(reader->{
                Image frame=null;
                try{
                    frame=reader.acquireLatestImage();
                    if(frame==null||!nativeRequested)return;
                    long now=SystemClock.elapsedRealtime();
                    if(now-lastNativeFrame<180)return;
                    lastNativeFrame=now;
                    byte[] jpeg=compressYuv(frame);
                    if(jpeg.length>0&&jpeg.length<140000&&nativeRequested){
                        String encoded=Base64.encodeToString(jpeg,Base64.NO_WRAP);
                        script("window.pipeMastersNativeFrame && window.pipeMastersNativeFrame("+
                            JSONObject.quote("data:image/jpeg;base64,"+encoded)+");");
                    }
                }catch(Exception ignored){/* Skip invalid image; next frame may succeed. */}
                finally{if(frame!=null)frame.close();}
            },cameraHandler);
            manager.openCamera(chosen,new CameraDevice.StateCallback(){
                @Override public void onOpened(CameraDevice camera){
                    if(!nativeRequested){camera.close();return;}
                    nativeCamera=camera;
                    try{
                        Surface output=nativeReader.getSurface();
                        CaptureRequest.Builder capture=camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
                        capture.addTarget(output);
                        camera.createCaptureSession(Arrays.asList(output),new CameraCaptureSession.StateCallback(){
                            @Override public void onConfigured(CameraCaptureSession session){
                                if(!nativeRequested){session.close();return;}
                                nativeSession=session;
                                try{
                                    session.setRepeatingRequest(capture.build(),null,cameraHandler);
                                    script("window.pipeMastersNativeCameraStarted && window.pipeMastersNativeCameraStarted();");
                                }catch(Exception e){nativeCameraError("Could not start native camera frames: "+e.getMessage());}
                            }
                            @Override public void onConfigureFailed(CameraCaptureSession session){
                                nativeCameraError("Native camera stream configuration failed.");
                            }
                        },cameraHandler);
                    }catch(Exception e){nativeCameraError("Native camera session failed: "+e.getMessage());}
                }
                @Override public void onDisconnected(CameraDevice camera){
                    camera.close();nativeCameraError("Native camera disconnected or is in use.");
                }
                @Override public void onError(CameraDevice camera,int error){
                    camera.close();nativeCameraError("Android Camera2 error code "+error);
                }
            },cameraHandler);
        }catch(Exception e){nativeCameraError("Could not open Android Camera2: "+e.getMessage());}
    }
    private static byte[] compressYuv(Image image)throws IOException{
        int width=image.getWidth(),height=image.getHeight();
        Image.Plane[] planes=image.getPlanes();
        if(planes.length<3)throw new IOException("Unsupported YUV frame.");
        byte[] nv21=new byte[width*height*3/2];
        ByteBuffer y=planes[0].getBuffer(),u=planes[1].getBuffer(),v=planes[2].getBuffer();
        int offset=0;
        for(int row=0;row<height;row++){
            int base=row*planes[0].getRowStride();
            for(int col=0;col<width;col++)
                nv21[offset++]=y.get(base+col*planes[0].getPixelStride());
        }
        for(int row=0;row<height/2;row++){
            int uBase=row*planes[1].getRowStride(),vBase=row*planes[2].getRowStride();
            for(int col=0;col<width/2;col++){
                nv21[offset++]=v.get(vBase+col*planes[2].getPixelStride());
                nv21[offset++]=u.get(uBase+col*planes[1].getPixelStride());
            }
        }
        ByteArrayOutputStream out=new ByteArrayOutputStream(30000);
        if(!new YuvImage(nv21,ImageFormat.NV21,width,height,null).compressToJpeg(
            new Rect(0,0,width,height),65,out))throw new IOException("JPEG compression failed.");
        return out.toByteArray();
    }
    private void stopNativeCameraInternal(){
        nativeRequested=false;
        if(nativeSession!=null){try{nativeSession.stopRepeating();}catch(Exception ignored){}
            nativeSession.close();nativeSession=null;}
        if(nativeCamera!=null){nativeCamera.close();nativeCamera=null;}
        if(nativeReader!=null){nativeReader.close();nativeReader=null;}
        if(cameraThread!=null){cameraThread.quitSafely();cameraThread=null;cameraHandler=null;}
    }
    private String getNativeCameraDiagnostics(){
        JSONObject report=new JSONObject();
        try{
            report.put("model",Build.MANUFACTURER+" "+Build.MODEL);
            report.put("androidVersion",Build.VERSION.RELEASE);
            report.put("sdk",Build.VERSION.SDK_INT);
            report.put("cameraPermission",Build.VERSION.SDK_INT<23||
                checkSelfPermission(Manifest.permission.CAMERA)==PackageManager.PERMISSION_GRANTED);
            report.put("nativeCameraActive",nativeRequested);
            CameraManager manager=(CameraManager)getSystemService(CAMERA_SERVICE);
            JSONArray cameras=new JSONArray();
            if(manager!=null)for(String id:manager.getCameraIdList()){
                JSONObject cam=new JSONObject();cam.put("id",id);
                Integer facing=manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING);
                cam.put("facing",facing==null?"unknown":facing==CameraCharacteristics.LENS_FACING_FRONT?"front":
                    facing==CameraCharacteristics.LENS_FACING_BACK?"back":
                    facing==CameraCharacteristics.LENS_FACING_EXTERNAL?"external":"unknown");
                cameras.put(cam);
            }
            report.put("cameras",cameras);
        }catch(Exception e){try{report.put("diagnosticError",e.toString());}catch(Exception ignored){}}
        return report.toString();
    }
    private void beginBugReportExport(String json){
        if(json==null||json.length()>250000)return;
        pendingBugReport=json;
        try{
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE,"PipeMasters-camera-report.json");
            startActivityForResult(intent,REPORT_EXPORT_REQUEST);
        }catch(Exception e){
            Toast.makeText(this,"Report picker unavailable: "+e.getMessage(),Toast.LENGTH_LONG).show();
        }
    }
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode!=REPORT_EXPORT_REQUEST)return;
        String report=pendingBugReport;pendingBugReport=null;
        if(resultCode!=RESULT_OK||data==null||data.getData()==null||report==null)return;
        try(OutputStream out=getContentResolver().openOutputStream(data.getData())){
            if(out==null)throw new IOException("No output stream");
            out.write(report.getBytes(StandardCharsets.UTF_8));
            Toast.makeText(this,"Camera report saved.",Toast.LENGTH_SHORT).show();
        }catch(Exception e){Toast.makeText(this,"Report save failed: "+e.getMessage(),Toast.LENGTH_LONG).show();}
    }

    public final class GameBridge {
        @JavascriptInterface public void requestCameraPermission() {
            main.post(() -> preflightCameraPermission());
        }
        @JavascriptInterface public void checkForUpdates() {
            main.post(() -> checkUpdates(false, true));
        }
        @JavascriptInterface public void openCameraSettings() {
            main.post(() -> {
                try {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    intent.setData(android.net.Uri.fromParts("package", getPackageName(), null));
                    startActivity(intent);
                } catch (Exception ignored) {
                    Toast.makeText(MainActivity.this,
                        "Open Android Settings → Apps → Pipe Masters → Permissions → Camera",
                        Toast.LENGTH_LONG).show();
                }
            });
        }
        @JavascriptInterface public String getCameraDiagnostics() { return getNativeCameraDiagnostics(); }
        @JavascriptInterface public void saveBugReport(String json) {
            main.post(() -> beginBugReportExport(json));
        }
        @JavascriptInterface public void startNativeCamera(String preferred) {
            main.post(() -> startNativeCameraInternal(preferred));
        }
        @JavascriptInterface public void stopNativeCamera() {
            main.post(MainActivity.this::stopNativeCameraInternal);
        }
        @JavascriptInterface public String getAppVersion() { return "Android shell 0.6.0"; }
    }

    @Override public void onBackPressed() {
        if (view != null && view.canGoBack()) view.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (pending != null) pending.deny();
        stopNativeCameraInternal();
        io.shutdownNow();
        if (view != null) { view.loadUrl("about:blank"); view.destroy(); }
        super.onDestroy();
    }
}
