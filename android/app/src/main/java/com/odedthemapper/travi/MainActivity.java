package com.odedthemapper.travi;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

// The app's map screen uses the plain browser navigator.geolocation API (not
// a Capacitor plugin), so Android's WebView needs to be told to allow it —
// otherwise every location prompt is silently denied by default. This grants
// the WebView's geolocation prompt automatically once the user has approved
// the normal Android runtime permission dialog, requested below on launch.
public class MainActivity extends BridgeActivity {
  private static final int LOCATION_PERMISSION_REQUEST = 1001;

  @Override
  public void onCreate(Bundle savedInstanceState) {
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
  }
}
