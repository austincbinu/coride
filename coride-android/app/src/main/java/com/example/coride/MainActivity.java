package com.example.coride;

import android.os.Bundle;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.ActivityMainBinding;
import com.example.coride.model.User;
import com.example.coride.ui.OfferRideFragment;
import com.example.coride.ui.ProfileFragment;
import com.example.coride.ui.RequestsFragment;
import com.example.coride.ui.RidesFragment;
import com.example.coride.ui.VerifyFragment;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private AppDatabase db;
    private ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        db = AppDatabase.getInstance(this);

        checkVerificationStatus();

        binding.bottomNav.setOnItemSelectedListener(item -> {
            int itemId = item.getItemId();
            if (itemId == R.id.navigation_rides) {
                loadFragment(new RidesFragment());
                return true;
            } else if (itemId == R.id.navigation_requests) {
                loadFragment(new RequestsFragment());
                return true;
            } else if (itemId == R.id.navigation_offer_ride) {
                loadFragment(new OfferRideFragment());
                return true;
            } else if (itemId == R.id.navigation_profile) {
                loadFragment(new ProfileFragment());
                return true;
            }
            return false;
        });
    }

    private void checkVerificationStatus() {
        executor.execute(() -> {
            User user = db.userDao().getCurrentUser();
            runOnUiThread(() -> {
                if (user != null && user.isVerified) {
                    showMainNavigation();
                } else {
                    showVerification();
                }
            });
        });
    }

    public void showVerification() {
        binding.bottomNav.setVisibility(View.GONE);
        loadFragment(new VerifyFragment());
    }

    public void showMainNavigation() {
        binding.bottomNav.setVisibility(View.VISIBLE);
        binding.bottomNav.setSelectedItemId(R.id.navigation_rides);
    }

    public void logout() {
        showVerification();
    }

    public void loadFragment(Fragment fragment) {
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.nav_host_fragment, fragment)
                .commit();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        executor.shutdown();
    }
}
