package com.example.coride.ui.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.coride.databinding.ItemRequestCardBinding;
import com.example.coride.model.RideRequest;

import java.util.ArrayList;
import java.util.List;

public class RequestAdapter extends RecyclerView.Adapter<RequestAdapter.RequestViewHolder> {

    private List<RideRequest> requests = new ArrayList<>();

    public void setRequests(List<RideRequest> requests) {
        this.requests = requests;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public RequestViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRequestCardBinding binding = ItemRequestCardBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new RequestViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull RequestViewHolder holder, int position) {
        RideRequest request = requests.get(position);
        holder.binding.tvRequesterName.setText(request.requesterName);
        holder.binding.tvRoute.setText(request.fromLocation + " → " + request.destination);
        holder.binding.tvDateTime.setText(request.dateTime);
        if (request.notes != null && !request.notes.isEmpty()) {
            holder.binding.tvNotes.setVisibility(View.VISIBLE);
            holder.binding.tvNotes.setText(request.notes);
        } else {
            holder.binding.tvNotes.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return requests != null ? requests.size() : 0;
    }

    static class RequestViewHolder extends RecyclerView.ViewHolder {
        ItemRequestCardBinding binding;

        public RequestViewHolder(@NonNull ItemRequestCardBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
