# Spec Validation Test Authoring Guide

## Core Principle

Each test should validate ONLY the feature being tested, using the minimal set of additional language features. This prevents false negatives when an unrelated feature is broken.

## Broken Features

Spec validation tests cannot be skipped. Every test either passes or fails -- a failure means the feature is not yet implemented or is broken, which is valuable signal. Tests that are NOT testing the broken feature but were incidentally using it should be rewritten to avoid the broken feature entirely.
