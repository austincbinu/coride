package com.example.coride.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentOfferRideBinding;
import com.example.coride.model.Ride;
import com.example.coride.model.User;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class OfferRideFragment extends Fragment {

    private FragmentOfferRideBinding binding;
    private AppDatabase db;
    private ExecutorService executor = Executors.newSingleThreadExecutor();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentOfferRideBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        db = AppDatabase.getInstance(requireContext());

        String[] vehicles = {"Car", "Bike", "Scooter"};
        ArrayAdapter<String> spinnerAdapter = new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, vehicles);
        binding.spinnerVehicle.setAdapter(spinnerAdapter);

        binding.btnPostRide.setOnClickListener(v -> {
            String from = binding.etFrom.getText().toString();
            String dest = binding.etDestination.getText().toString();
            String date = binding.etDate.getText().toString();
            String time = binding.etTime.getText().toString();
            String seatsStr = binding.etSeats.getText().toString();
            String notes = binding.etNotes.getText().toString();
            String vehicle = binding.spinnerVehicle.getSelectedItem().toString();

            if (from.isEmpty() || dest.isEmpty() || date.isEmpty() || time.isEmpty() || seatsStr.isEmpty()) {
                Toast.makeText(getContext(), "Please fill all required fields", Toast.LENGTH_SHORT).show();
                return;
            }

            executor.execute(() -> {
                User currentUser = db.userDao().getCurrentUser();
                Ride ride = new Ride();
                ride.creatorName = currentUser != null ? currentUser.name : "Unknown User";
                ride.fromLocation = from;
                ride.destination = dest;
                ride.dateTime = date + " " + time;
                ride.vehicle = vehicle;
                ride.seats = Integer.parseInt(seatsStr);
                ride.notes = notes;

                db.rideDao().insertRide(ride);

                requireActivity().runOnUiThread(() -> {
                    Toast.makeText(getContext(), "Ride offer posted!", Toast.LENGTH_SHORT).show();
                    if (getActivity() instanceof MainActivity) {
                        ((MainActivity) getActivity()).loadFragment(new RidesFragment());
                    }
                });
            });
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
        executor.shutdown();
    }
}
