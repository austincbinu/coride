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
import com.example.coride.databinding.FragmentVerifyBinding;
import com.example.coride.model.User;
import com.example.coride.util.AdmissionValidator;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class VerifyFragment extends Fragment {

    private FragmentVerifyBinding binding;
    private AppDatabase db;
    private ExecutorService executor = Executors.newSingleThreadExecutor();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentVerifyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        db = AppDatabase.getInstance(requireContext());

        binding.btnScanBarcode.setOnClickListener(v -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).loadFragment(new ScannerFragment());
            }
        });

        binding.btnEnterManually.setOnClickListener(v -> {
            binding.layoutManualForm.setVisibility(View.VISIBLE);
        });

        binding.btnCompleteVerify.setOnClickListener(v -> {
            String name = binding.etName.getText().toString();
            String adm = binding.etAdmissionNo.getText().toString();

            if (name.isEmpty() || adm.isEmpty()) {
                Toast.makeText(getContext(), "Please fill all fields", Toast.LENGTH_SHORT).show();
                return;
            }

            AdmissionValidator.ValidationResult result = AdmissionValidator.validate(adm);
            if (!result.isValid) {
                Toast.makeText(getContext(), "Invalid admission number format", Toast.LENGTH_SHORT).show();
                return;
            }

            executor.execute(() -> {
                User user = new User();
                user.name = name;
                user.admissionNo = result.admissionNo;
                user.branchCode = result.branchCode;
                user.department = result.deptName;
                user.role = binding.switchRole.isChecked() ? "Staff" : "Student";
                user.isVerified = true;

                db.userDao().insertUser(user);

                requireActivity().runOnUiThread(() -> {
                    Toast.makeText(getContext(), "Verified successfully!", Toast.LENGTH_SHORT).show();
                    if (getActivity() instanceof MainActivity) {
                        ((MainActivity) getActivity()).showMainNavigation();
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
