package com.odedthemapper.travi;

import android.Manifest;
import android.animation.Animator;
import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.LinearInterpolator;
import android.webkit.GeolocationPermissions;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
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
    applyBottomInsetAsPadding();

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
  }

  // Edge-to-edge (above) makes content draw behind BOTH the status bar and
  // the bottom nav bar — that's only wanted at the top (so the page's own
  // background reaches the physical top instead of a mismatched status-bar
  // strip). This gives the bottom back to the system: pads the content root
  // by exactly the bottom system-bar inset, so the WebView (and everything
  // in it, including its own bottom nav) sits above the nav buttons like a
  // normal non-edge-to-edge app, while the top stays untouched/edge-to-edge.
  private void applyBottomInsetAsPadding() {
    View root = findViewById(android.R.id.content);
    ViewCompat.setOnApplyWindowInsetsListener(root, (view, insets) -> {
      Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
      view.setPadding(0, 0, 0, systemBars.bottom);
      return insets;
    });
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

    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public void onPageCommitVisible(WebView view, String url) {
        super.onPageCommitVisible(view, url);
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
