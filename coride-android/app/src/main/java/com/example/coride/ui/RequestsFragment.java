package com.example.coride.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentRequestsBinding;
import com.example.coride.ui.adapter.RequestAdapter;

public class RequestsFragment extends Fragment {

    private FragmentRequestsBinding binding;
    private RequestAdapter adapter;
    private AppDatabase db;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentRequestsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        db = AppDatabase.getInstance(requireContext());
        adapter = new RequestAdapter();
        
        binding.requestsRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.requestsRecycler.setAdapter(adapter);

        db.rideRequestDao().getAllRideRequests().observe(getViewLifecycleOwner(), requests -> {
            adapter.setRequests(requests);
        });

        binding.fabNewRequest.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).loadFragment(new PostRequestFragment());
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
