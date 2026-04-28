# 2026-04-28: Documentation Profile Presets

## Summary

Added first-class Javadoc profile presets to the generator.

## Included profiles

- Strict standard Javadoc
- Oracle / OpenJDK-like
- Google Java Style-like
- Open Source Project preset

## Behavior changes

- The generator now exposes a top-level documentation profile selector.
- The open-source preset enables a copyright header and Apache 2.0 by default.
- The Google-style preset suppresses author/version metadata.
- Javadoc summaries are normalized to sentence form when possible.
- Tag ordering is now consistent across the profiles.

## Notes

This change is focused on documentation output style only. It does not alter the app's file format or export model.
