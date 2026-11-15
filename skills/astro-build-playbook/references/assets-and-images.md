# Asset localisation and image selection

### Phase 4: Image Pipeline & Asset Localisation
1. **The Image Decision Gate (`astro:assets` vs `public/images/`)**:
   - **Use `astro:assets` (`<Image />` or `<Picture />` from `src/assets/`)**: For in-page visuals, card thumbnails, team photos, and author avatars. Astro processes images with Sharp at build time to generate responsive WebP/AVIF variants, automated `srcset`, and inferred `width`/`height` eliminating CLS.
   - **EmDash media**: use the CMS media value and rendering API with the selected image service. Bundled public image references do not create media-library records; see `emdash.md`.
   - **Use `public/images/`**: For Content Collections where image paths are stored as raw JSON/YAML strings (`/images/hero.webp`), and for the site-wide default Open Graph social card (`/images/og-default.jpg`).
   - **Page-level `og:image` from Content Collection `image()` assets**: never pass `poster.src` raw to `og:image`; resolve it with `getImage()` in `BaseLayout.astro` and emit its real dimensions (see `seo-and-metadata.md` §1).
2. **Hero / LCP Preload**:
   - For the Hero image, always supply `fetchpriority="high"` and `loading="eager"`. Preload the candidate in `BaseLayout.astro`.
3. **Figma Asset Pipeline**: Figma MCP asset URLs expire after about 7 days, and child-node exports flatten transparency onto the parent's fill. Rebuild transparent or rotated layers from the **raw image fill** plus design-context geometry, verified against the export; never colour-key a flattened export. Crop to each frame's rendered region with sharp, and commit the script (e.g. `<project>/scripts/process-figma-assets.cjs`) mapping inputs to Figma node IDs. See `figma-mcp-ingestion.md` §3.
4. **Zero External Runtime Media**:
   - Download all external stock imagery to local project folders. Zero runtime requests to Unsplash, Cloudinary, or Google Fonts.
5. **Unsplash stand-ins:**
   - **Searching:** `unsplash.com` search pages answer curl with a 307, so read them in a
     browser on that origin (fetch `/s/photos/<query>` and parse it). Take photo IDs from
     the image `src`, not the slug: IDs can contain hyphens.
   - **Free-licence photos** download from the CDN with curl:
     `images.unsplash.com/photo-…?w=2400&fm=jpg` (the `src` minus its size parameters).
   - **Unsplash+ photos** (`plus.unsplash.com/premium_photo-…`): the licence holder
     downloads them from their own signed-in account, so the licence is recorded against
     it. Give them the photo page URLs and work from the files they download, not from a
     CDN copy you fetched.
   - **Processing:** crop and encode from the original JPEG, never from an already
     compressed WebP (re-encoding loses quality). Match the existing aspect and pixel size,
     and check the crop under every `object-fit: cover` ratio the site uses (e.g. 3:2
     masters shown as 4:3 cards). Reusing the existing filenames keeps content references
     unchanged.
   - **Alt text:** rewrite it for each new photo; the old alt described the old image.
   - **Record** each image's page URL and licence (Unsplash or Unsplash+) in the project
     record. Neither licence requires a visible credit.
