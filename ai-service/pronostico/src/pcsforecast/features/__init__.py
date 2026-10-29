"""Time-safe features for machine-learning models (phase F4).

Features are built from one training history at a time, so nothing after the origin can enter a
model: the history itself ends at the origin (``protocol.origins.TrainView``).
"""
