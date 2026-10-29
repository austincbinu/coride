package com.example.coride.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentPostRequestBinding;
import com.example.coride.model.RideRequest;
import com.example.coride.model.User;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PostRequestFragment extends Fragment {

    private FragmentPostRequestBinding binding;
    private AppDatabase db;
    private ExecutorService executor = Executors.newSingleThreadExecutor();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentPostRequestBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        db = AppDatabase.getInstance(requireContext());

        binding.btnPostRequest.setOnClickListener(v -> {
            String from = binding.etFrom.getText().toString();
            String dest = binding.etDestination.getText().toString();
            String date = binding.etDate.getText().toString();
            String time = binding.etTime.getText().toString();
            String notes = binding.etNotes.getText().toString();

            if (from.isEmpty() || dest.isEmpty() || date.isEmpty() || time.isEmpty()) {
                Toast.makeText(getContext(), "Please fill all required fields", Toast.LENGTH_SHORT).show();
                return;
            }

            executor.execute(() -> {
                User currentUser = db.userDao().getCurrentUser();
                RideRequest request = new RideRequest();
                request.requesterName = currentUser != null ? currentUser.name : "Unknown User";
                request.fromLocation = from;
                request.destination = dest;
                request.dateTime = date + " " + time;
                request.notes = notes;

                db.rideRequestDao().insertRideRequest(request);

                requireActivity().runOnUiThread(() -> {
                    Toast.makeText(getContext(), "Ride request posted!", Toast.LENGTH_SHORT).show();
                    if (getActivity() instanceof MainActivity) {
                        ((MainActivity) getActivity()).loadFragment(new RequestsFragment());
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
