# Approved illustrated app artwork

This correction replaces the PR106/107 line-glyph approximations with actual image artwork extracted from the reference supplied on 2026-09-27. It does not redraw the approved designs or claim Apple authorship.

## Source and asset contract

Source: the 1536 x 1024 reference sheet supplied in the conversation at 19:06:48. SHA-256: `eb667a9d0d4e682492ca96997119c0ae0dd2e5ce7b86225a052f60829b3eb28e`.

Thirteen matching module illustrations are separate, transparent, 160 x 160 WebP files in `public/app-icons/illustrated-v1/`. Labels and sheet background are not part of the files. The leather Bible's red bookmark is retained. WebP quality is 86; pixels are cropped from the reference rather than enlarged or regenerated. These are UI assets, not 1024px App Store masters.

The exact matches are Overview, Bible, Journal, Prayer, Notes, Morning Formula, Mind Map, Artifacts, the AI orb, Tasks, Habits, Vision Board and Settings. The UI retains the product name Lumen AI; My AI and the reference's Lyman AI label resolve to the same orb. Daily deliberately shares the sunrise. Sleep and secondary modules without matching supplied artwork retain their existing fallbacks; no claim is made that they were present in this reference.

## Rendering and extension

`appIconArtwork.ts` is the shared registry. `buildHomeApps` supplies its image paths to both the home launcher and mini-phone. HubSidebar uses that same registry and IosAppIcon at 28px, with 36px rows. Routes, module names, badges, grouping and application behavior are unchanged.

The image branch must not use `.ios-icon`, generated gloss, a color background, a CSS sprite, extra corner clipping or `object-cover`. The artwork already includes its material, lighting and transparent corners. A missing file may use its existing glyph fallback; a successfully loaded image must never render the substitute glyph.

To add a module: supply and review a separate transparent artwork asset; add a versioned path and label mapping to the registry; retain a fallback icon in the module data; extend the integrity checks and UI tests. Do not substitute another module's picture without an explicit alias decision. Keep navigation labels outside the image, and maintain decorative image semantics.

## Verification

`node scripts/verify-approved-app-artwork.mjs` checks the exact Git blob checksum, full decode, 160px dimensions and transparency of every supplied file. `ApprovedAppArtwork.test.tsx` exercises actual renderer, registry, launcher and sidebar components. `node scripts/verify-approved-app-artwork-browser.mjs` opens the real sidebar and home/mini-phone components in an isolated Vite fixture with fake dashboard/auth data, tests image loading and mobile navigation, and saves screenshots. This does not log into production or test backend saving.
