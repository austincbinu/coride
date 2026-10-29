package com.example.coride.ui.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.coride.databinding.ItemRideCardBinding;
import com.example.coride.model.Ride;

import java.util.ArrayList;
import java.util.List;

public class RideAdapter extends RecyclerView.Adapter<RideAdapter.RideViewHolder> {

    private List<Ride> rides = new ArrayList<>();

    public void setRides(List<Ride> rides) {
        this.rides = rides;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public RideViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRideCardBinding binding = ItemRideCardBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new RideViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull RideViewHolder holder, int position) {
        Ride ride = rides.get(position);
        holder.binding.tvRiderName.setText(ride.creatorName);
        holder.binding.tvRoute.setText(ride.fromLocation + " → " + ride.destination);
        holder.binding.tvDateTime.setText(ride.dateTime);
        holder.binding.tvVehicle.setText(ride.vehicle + " (" + ride.seats + " seats)");
        if (ride.notes != null && !ride.notes.isEmpty()) {
            holder.binding.tvNotes.setVisibility(View.VISIBLE);
            holder.binding.tvNotes.setText(ride.notes);
        } else {
            holder.binding.tvNotes.setVisibility(View.GONE);
        }
    }

    @Override
    public int getItemCount() {
        return rides != null ? rides.size() : 0;
    }

    static class RideViewHolder extends RecyclerView.ViewHolder {
        ItemRideCardBinding binding;

        public RideViewHolder(@NonNull ItemRideCardBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }
}
