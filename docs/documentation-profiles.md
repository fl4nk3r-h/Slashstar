# Documentation Profiles

The generator now supports four documentation profiles.

## Strict standard Javadoc

Recommended default profile.

- Keeps metadata and tag ordering neutral.
- Preserves class-level and method-level Javadoc fields.
- Suitable when you want predictable, spec-aligned output.

## Oracle / OpenJDK-like

A conservative source-code style inspired by Oracle and OpenJDK comments.

- Keeps metadata enabled.
- Retains author, version, and since tags.
- Uses the same standard Javadoc structure as the neutral profile.

## Google Java Style-like

A concise style that favors shorter, less decorative docs.

- Hides author and version metadata.
- Hides the class-level and method-level identity sections in the form.
- Keeps the essential comment body, parameters, return values, throws, deprecated notes, and cross references.

## Open Source Project preset

A convenience preset for public repositories.

- Enables a license header by default.
- Sets the license to Apache 2.0.
- Uses the neutral Javadoc profile behavior for the body.
- Starts with a fillable copyright holder and a ready-to-publish header.

## Output notes

- Paragraph summaries are normalized to sentence form when possible.
- The generator keeps `@param`, `@return`, `@throws`, `@deprecated`, and `@see` tags in a consistent order.
- Package and import blocks remain available across profiles.
