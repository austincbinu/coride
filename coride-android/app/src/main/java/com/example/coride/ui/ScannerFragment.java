package com.example.coride.ui;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.Fragment;

import com.example.coride.MainActivity;
import com.example.coride.database.AppDatabase;
import com.example.coride.databinding.FragmentScannerBinding;
import com.example.coride.model.User;
import com.example.coride.util.AdmissionValidator;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.common.InputImage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ScannerFragment extends Fragment {

    private FragmentScannerBinding binding;
    private AppDatabase db;
    private ExecutorService cameraExecutor;
    private ExecutorService dbExecutor;
    private boolean isScanned = false;
    private AdmissionValidator.ValidationResult currentResult;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentScannerBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        db = AppDatabase.getInstance(requireContext());
        cameraExecutor = Executors.newSingleThreadExecutor();
        dbExecutor = Executors.newSingleThreadExecutor();

        startCamera();

        binding.btnVerifyScanned.setOnClickListener(v -> {
            if (currentResult == null || !currentResult.isValid) {
                Toast.makeText(getContext(), "Please scan a valid ID first", Toast.LENGTH_SHORT).show();
                return;
            }

            String name = binding.etScannedName.getText().toString();
            if (name.isEmpty()) {
                Toast.makeText(getContext(), "Please enter your name", Toast.LENGTH_SHORT).show();
                return;
            }

            dbExecutor.execute(() -> {
                User user = new User();
                user.name = name;
                user.admissionNo = currentResult.admissionNo;
                user.branchCode = currentResult.branchCode;
                user.department = currentResult.deptName;
                user.role = "Student";
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

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture = ProcessCameraProvider.getInstance(requireContext());

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(binding.cameraPreview.getSurfaceProvider());

                BarcodeScanner scanner = BarcodeScanning.getClient();

                ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build();

                imageAnalysis.setAnalyzer(cameraExecutor, imageProxy -> {
                    @SuppressWarnings("UnsafeOptInUsageError")
                    android.media.Image mediaImage = imageProxy.getImage();
                    if (mediaImage != null && !isScanned) {
                        InputImage image = InputImage.fromMediaImage(mediaImage, imageProxy.getImageInfo().getRotationDegrees());
                        scanner.process(image)
                                .addOnSuccessListener(barcodes -> {
                                    for (Barcode barcode : barcodes) {
                                        String rawValue = barcode.getRawValue();
                                        if (rawValue != null) {
                                            AdmissionValidator.ValidationResult result = AdmissionValidator.validate(rawValue);
                                            if (result.isValid) {
                                                isScanned = true;
                                                currentResult = result;
                                                requireActivity().runOnUiThread(() -> {
                                                    binding.tvScannedResult.setText(result.admissionNo);
                                                    binding.etScannedAdm.setText(result.admissionNo);
                                                    binding.layoutDetails.setVisibility(View.VISIBLE);
                                                    binding.chipYear.setText("Year: " + result.year);
                                                    binding.chipSerial.setText("No: " + result.serialNo);
                                                    binding.chipBranch.setText(result.branchCode);
                                                });
                                                break;
                                            }
                                        }
                                    }
                                })
                                .addOnFailureListener(e -> Log.e("Scanner", "Barcode scan failed", e))
                                .addOnCompleteListener(task -> imageProxy.close());
                    } else {
                        imageProxy.close();
                    }
                });

                CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;
                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(getViewLifecycleOwner(), cameraSelector, preview, imageAnalysis);

            } catch (Exception e) {
                Log.e("Scanner", "Use case binding failed", e);
            }
        }, ContextCompat.getMainExecutor(requireContext()));
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
        cameraExecutor.shutdown();
        dbExecutor.shutdown();
    }
}
