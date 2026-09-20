package com.odedthemapper.travi;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
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
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
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
  private static final int NOTIFICATION_PERMISSION_REQUEST = 1002;

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

    // Everything below is cosmetic/optional polish on top of the stock
    // Capacitor activity. Each piece is isolated so that a failure in any one
    // of them (a missing WebView provider, an OEM quirk, a permission dialog
    // racing the activity lifecycle) degrades that one feature instead of
    // crashing the app at launch.
    try {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
          != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(
            this,
            new String[] {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION},
            LOCATION_PERMISSION_REQUEST
        );
      }

      // Android 13+ (API 33) treats notifications as a "dangerous" permission
      // requiring an explicit runtime grant, same as location above — without
      // it, the account page's own web-standard Notification.requestPermission()
      // call (see NotificationOptIn.tsx) resolves to denied with no OS prompt
      // ever shown, since the WebView has no notification channel to grant in
      // the first place. Requested up front here rather than lazily from the
      // web page specifically because Android WebView has no equivalent of the
      // onGeolocationPermissionsShowPrompt bridge callback for notifications —
      // there's no reliable way to trigger the native dialog from JS at all.
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
          && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
              != PackageManager.PERMISSION_GRANTED) {
        ActivityCompat.requestPermissions(
            this,
            new String[] {Manifest.permission.POST_NOTIFICATIONS},
            NOTIFICATION_PERMISSION_REQUEST
        );
      }
    } catch (Throwable t) {
      Log.e("Travi", "permission request failed", t);
    }

    if (getBridge() == null || getBridge().getWebView() == null) return;

    try {
      // Edge-to-edge (setDecorFitsSystemWindows(false) above) means the app
      // owns every inset itself, including the on-screen keyboard's — without
      // this, android:windowSoftInputMode="adjustResize" on its own wasn't
      // enough to actually shrink the WebView when the keyboard opened
      // (confirmed live: the points-list drawer, anchored to the page's own
      // fixed bottom edge via CSS, stayed pinned under the keyboard with a
      // stray gap above the real bottom nav — the web-side visualViewport
      // fix alone can't help if the WebView's own Android View never
      // resizes to begin with). Applying the IME inset as real bottom
      // padding on the WebView is what actually shrinks it, which is what
      // makes visualViewport correctly reflect the keyboard's height inside
      // the page's own JS afterward.
      // Android 15+ (targetSdk 35/36) forces edge-to-edge: the app draws under the
      // status and navigation bars and the WebView reports NO safe-area insets
      // to the page, so the web layout stretched under both bars. Reserve the
      // system bars (and the keyboard, when open) natively as padding and
      // consume the insets so the page's own env(safe-area-inset-*) stays 0
      // instead of being counted twice.
      ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
        androidx.core.graphics.Insets bars =
            insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        int imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
        view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, imeHeight));
        return WindowInsetsCompat.CONSUMED;
      });
      ViewCompat.requestApplyInsets(getBridge().getWebView());
      // The padded-out bar areas show the window background — match the page
      // (cream) instead of the black a null background gives, and use dark
      // status/nav icons so they stay readable on it.
      getWindow().getDecorView().setBackgroundColor(0xFFFBF6EE);
      androidx.core.view.WindowInsetsControllerCompat ctl = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
      ctl.setAppearanceLightStatusBars(true);

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
    } catch (Throwable t) {
      Log.e("Travi", "webview setup failed", t);
    }

    try {
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
    } catch (Throwable t) {
      Log.e("Travi", "loading overlay failed", t);
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

    final String startUrl = getBridge().getServerUrl();
    final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    final int[] failures = {0};
    final boolean[] failing = {false};

    // The WebView's own "page couldn't load" screen must never be what the
    // user sees: a main-frame failure right at cold start (network not ready
    // yet, radio waking up) is usually gone a moment later. So keep the
    // branded overlay up and quietly retry; only after several failures show
    // a native message with the real error and a retry button.
    Runnable[] retry = new Runnable[1];
    final android.widget.TextView message = new android.widget.TextView(this);
    message.setTextColor(Color.DKGRAY);
    message.setTextSize(15);
    message.setGravity(Gravity.CENTER);
    message.setVisibility(android.view.View.GONE);
    final android.widget.Button retryButton = new android.widget.Button(this);
    retryButton.setText("נסו שוב");
    retryButton.setVisibility(android.view.View.GONE);
    FrameLayout.LayoutParams msgParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
    msgParams.setMargins(dpToPx(24), dpToPx(120), dpToPx(24), 0);
    overlay.addView(message, msgParams);
    FrameLayout.LayoutParams btnParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
    btnParams.setMargins(0, dpToPx(260), 0, 0);
    overlay.addView(retryButton, btnParams);

    retry[0] = () -> {
      if (getBridge() != null && getBridge().getWebView() != null) getBridge().getWebView().loadUrl(startUrl);
    };
    retryButton.setOnClickListener(v -> {
      failures[0] = 0;
      message.setVisibility(android.view.View.GONE);
      retryButton.setVisibility(android.view.View.GONE);
      badge.setVisibility(android.view.View.VISIBLE);
      handler.post(retry[0]);
    });

    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      private void onMainFrameFailed(String description) {
        failing[0] = true;
        failures[0]++;
        if (failures[0] <= 6) {
          handler.postDelayed(retry[0], Math.min(4000, 700L * failures[0]));
        } else {
          badge.setVisibility(android.view.View.GONE);
          message.setText("לא הצלחנו להתחבר לטראבי.\nבדקו את החיבור לאינטרנט ונסו שוב.\n(" + description + ")");
          message.setVisibility(android.view.View.VISIBLE);
          retryButton.setVisibility(android.view.View.VISIBLE);
        }
      }

      @Override
      public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        failing[0] = false;
      }

      @Override
      public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
        if (request.isForMainFrame()) {
          onMainFrameFailed(error.getDescription() + "");
          return; // deliberately NOT calling super: no error page / errorPath navigation
        }
        super.onReceivedError(view, request, error);
      }

      @Override
      public void onReceivedHttpError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceResponse errorResponse) {
        super.onReceivedHttpError(view, request, errorResponse);
        if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
          onMainFrameFailed("HTTP " + errorResponse.getStatusCode());
        }
      }

      @Override
      public void onPageCommitVisible(WebView view, String url) {
        super.onPageCommitVisible(view, url);
        if (failing[0]) return; // that was an error page, not the app
        failures[0] = 0;
        pulse.cancel();
        overlay.animate().alpha(0f).setDuration(250).withEndAction(() -> {
          if (overlay.getParent() != null) {
            ((ViewGroup) overlay.getParent()).removeView(overlay);
          }
        }).start();
      }
    });
  }

  private int dpToPx(int dp) {
    return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, getResources().getDisplayMetrics());
  }
}
