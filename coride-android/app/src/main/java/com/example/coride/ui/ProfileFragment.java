package com.example.coride.ui;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentProfileBinding;
import com.example.coride.model.User;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ProfileFragment extends Fragment {

    private FragmentProfileBinding binding;
    private AppDatabase db;
    private ExecutorService executor = Executors.newSingleThreadExecutor();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentProfileBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        
        db = AppDatabase.getInstance(requireContext());
        
        executor.execute(() -> {
            User user = db.userDao().getCurrentUser();
            if (user != null) {
                requireActivity().runOnUiThread(() -> {
                    binding.tvName.setText(user.name);
                    binding.tvAdmissionNo.setText(user.admissionNo);
                    binding.tvDepartment.setText(user.department);
                    
                    if (user.name != null && !user.name.isEmpty()) {
                        binding.tvAvatar.setText(String.valueOf(user.name.charAt(0)).toUpperCase());
                    }
                });
            }
        });

        binding.btnLogout.setOnClickListener(v -> {
            executor.execute(() -> {
                db.userDao().deleteAll();
                requireActivity().runOnUiThread(() -> {
                    if (getActivity() instanceof MainActivity) {
                        ((MainActivity) getActivity()).logout();
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
