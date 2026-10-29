package com.example.coride.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.SearchView;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentRidesBinding;
import com.example.coride.ui.adapter.RideAdapter;

public class RidesFragment extends Fragment {

    private FragmentRidesBinding binding;
    private RideAdapter adapter;
    private AppDatabase db;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentRidesBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        db = AppDatabase.getInstance(requireContext());
        adapter = new RideAdapter();
        
        binding.ridesRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.ridesRecycler.setAdapter(adapter);

        db.rideDao().getAllRides().observe(getViewLifecycleOwner(), rides -> {
            adapter.setRides(rides);
        });

        binding.searchRides.setOnQueryTextListener(new SearchView.OnQueryTextListener() {
            @Override
            public boolean onQueryTextSubmit(String query) {
                return false;
            }

            @Override
            public boolean onQueryTextChange(String newText) {
                if (newText.isEmpty()) {
                    db.rideDao().getAllRides().observe(getViewLifecycleOwner(), rides -> adapter.setRides(rides));
                } else {
                    db.rideDao().searchByDestination(newText).observe(getViewLifecycleOwner(), rides -> adapter.setRides(rides));
                }
                return true;
            }
        });

        binding.fabOfferRide.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).loadFragment(new OfferRideFragment());
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
