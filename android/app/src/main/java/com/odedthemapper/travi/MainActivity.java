package com.odedthemapper.travi;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import android.webkit.GeolocationPermissions;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

// The app's map screen uses the plain browser navigator.geolocation API (not
// a Capacitor plugin), so Android's WebView needs to be told to allow it —
// otherwise every location prompt is silently denied by default. This grants
// the WebView's geolocation prompt automatically once the user has approved
// the normal Android runtime permission dialog, requested below on launch.
public class MainActivity extends BridgeActivity {
  private static final int LOCATION_PERMISSION_REQUEST = 1001;
  // The Back button steps back inside the app; only two quick presses in a row (at the first screen) leave it.
  private static final long BACK_EXIT_WINDOW_MS = 2000;
  private long lastBackPressAt = 0;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Formally hands the system splash screen (Theme.SplashScreen, see
    // styles.xml) over to the Android 12+ API instead of leaving the theme
    // declared but never actually engaged — without this call the OS has no
    // defined moment to exit the splash and switch to postSplashScreenTheme,
    // which on some OEM skins (Samsung's OneUI in particular) left its own
    // icon+label chrome stuck on screen indefinitely instead of properly
    // dismissing. Must be called before super.onCreate().
    SplashScreen.installSplashScreen(this);

    // Edge-to-edge: lets the WebView draw underneath the (now transparent —
    // see styles.xml) status/nav bars instead of the OS reserving opaque
    // space for them, so there's no visible bar strip in a different color
    // than the app's own page background. Must be called before super's
    // onCreate() sets up the bridge's content view/WebView.
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    super.onCreate(savedInstanceState);

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this,
          new String[] {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
          LOCATION_PERMISSION_REQUEST
      );
    }

    getBridge().getWebView().getSettings().setGeolocationEnabled(true);
    getBridge().getWebView().setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
      @Override
      public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
        boolean granted =
            ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        callback.invoke(origin, granted, false);
      }
    });

    // The app wraps a real remote site (see capacitor.config.ts) — there's no
    // bundled local page to show instantly, so the WebView is blank white
    // from the moment the OS's own native splash theme dismisses (right
    // after onCreate) until the real page has fetched and painted, which
    // over mobile data can take a couple of seconds and reads as "the app is
    // frozen/slow" with zero feedback. This overlay keeps a branded, animated
    // version of the splash badge on screen for that entire gap, then fades
    // out the instant the WebView actually has something to show
    // (onPageCommitVisible — first paint, not full page-load-complete, so it
    // dismisses as early as it honestly can).
    showLoadingOverlay();
    installBackHandler();
    createNotificationChannel();
  }

  // The system Back button (or gesture) goes back one screen/step inside the app, using the WebView's own history
  // (the site pushes a history entry for every screen and for open sheets/viewers). At the very first screen a
  // single press only shows a hint; a second press within two seconds closes the app.
  private void installBackHandler() {
    getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
      @Override
      public void handleOnBackPressed() {
        WebView web = getBridge().getWebView();
        if (web != null && web.canGoBack()) {
          web.goBack();
          return;
        }
        long now = System.currentTimeMillis();
        if (now - lastBackPressAt < BACK_EXIT_WINDOW_MS) {
          finish();
        } else {
          lastBackPressAt = now;
          Toast.makeText(MainActivity.this, "לחצו שוב כדי לצאת מהאפליקציה", Toast.LENGTH_SHORT).show();
        }
      }
    });
  }

  // Android 8+ needs a notification channel; created here so push works even before the web page registers it.
  private void createNotificationChannel() {
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      android.app.NotificationChannel channel = new android.app.NotificationChannel(
          "travi_default", "טראבי", android.app.NotificationManager.IMPORTANCE_HIGH);
      channel.setDescription("עדכונים והמלצות לטיול");
      android.app.NotificationManager manager = getSystemService(android.app.NotificationManager.class);
      if (manager != null) manager.createNotificationChannel(channel);
    }
  }

  private void showLoadingOverlay() {
    FrameLayout overlay = new FrameLayout(this);
    overlay.setBackgroundColor(Color.WHITE);

    ImageView badge = new ImageView(this);
    badge.setImageResource(R.drawable.loading_badge);
    int size = dpToPx(96);
    FrameLayout.LayoutParams badgeParams = new FrameLayout.LayoutParams(size, size, Gravity.CENTER);
    overlay.addView(badge, badgeParams);

    ViewGroup root = findViewById(android.R.id.content);
    root.addView(overlay, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    ObjectAnimator scaleX = ObjectAnimator.ofFloat(badge, "scaleX", 1f, 1.12f);
    ObjectAnimator scaleY = ObjectAnimator.ofFloat(badge, "scaleY", 1f, 1.12f);
    ObjectAnimator alpha = ObjectAnimator.ofFloat(badge, "alpha", 1f, 0.75f);
    AnimatorSet pulse = new AnimatorSet();
    pulse.playTogether(scaleX, scaleY, alpha);
    pulse.setDuration(900);
    pulse.setInterpolator(new LinearInterpolator());
    for (Animator anim : pulse.getChildAnimations()) {
      ((ObjectAnimator) anim).setRepeatCount(ObjectAnimator.INFINITE);
      ((ObjectAnimator) anim).setRepeatMode(ObjectAnimator.REVERSE);
    }
    pulse.start();

    // The overlay stays up until the page on screen is verifiably the real
    // app. Dismissing it at first paint (onPageCommitVisible) showed whatever
    // was painted first — including Next's "This page couldn't load" error
    // page or a WebView network-error page — for a moment before the real
    // page replaced it. Instead: on a load error, or if the loaded page turns
    // out to be an error page, reload quietly behind the overlay.
    final String startUrl = getBridge().getServerUrl();
    final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    final int[] attempts = {0};
    final boolean[] failed = {false};
    final Runnable reveal = () -> {
      pulse.cancel();
      overlay.animate().alpha(0f).setDuration(250).withEndAction(() -> {
        if (overlay.getParent() != null) {
          ((ViewGroup) overlay.getParent()).removeView(overlay);
        }
      }).start();
    };
    final Runnable reload = () -> {
      if (overlay.getParent() != null) getBridge().getWebView().loadUrl(startUrl);
    };
    final Runnable onFailure = () -> {
      failed[0] = true;
      attempts[0]++;
      // Past the retry budget, stop hiding it: let whatever the WebView has
      // show, rather than trapping the user behind the logo forever.
      if (attempts[0] > 8) reveal.run();
      else handler.postDelayed(reload, Math.min(3000, 600L * attempts[0]));
    };
    // Absolute ceiling for a page that never reports finished.
    handler.postDelayed(() -> {
      if (overlay.getParent() != null) reveal.run();
    }, 30000);

    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        failed[0] = false;
      }

      @Override
      public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
        if (overlay.getParent() != null && request.isForMainFrame()) {
          onFailure.run();
          return; // no WebView error page / Capacitor error-path navigation
        }
        super.onReceivedError(view, request, error);
      }

      @Override
      public void onReceivedHttpError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (overlay.getParent() != null && request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
          onFailure.run();
        }
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (failed[0] || overlay.getParent() == null) return;
        // Give hydration a moment (a client-side exception replaces the page
        // with the error screen right after it), then look at the page text.
        handler.postDelayed(() -> {
          if (failed[0] || overlay.getParent() == null) return;
          view.evaluateJavascript(
              "(function(){try{var t=(document.title||'')+' '+((document.body&&document.body.innerText)||'').slice(0,600);"
                  + "return /^500:|This page couldn.t load|A server error occurred|Application error: a (client|server)-side exception|אין חיבור לאינטרנט/.test(t)}catch(e){return false}})()",
              result -> {
                if ("true".equals(result)) onFailure.run();
                else reveal.run();
              });
        }, 1200);
      }
    });
  }

  private int dpToPx(int dp) {
    return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics());
  }
}
