# Logo templates for proof validation

`proof_validator.py` performs OpenCV template matching against the files below
to identify Yape vs Plin receipts. Drop the cropped logo PNGs here before
turning on `PROOF_VALIDATION_ENABLED`.

## Required files

- `yape_logo.png` — cropped Yape logo (the purple "Yape" wordmark). ~100x100px
  at 1x is enough; the matcher rescales internally.
- `plin_logo.png` — cropped Plin logo (the blue "plin" wordmark, BCP-style).

## How to produce them

1. Take a real Yape/Plin receipt screenshot (yours or a teammate's).
2. Crop tightly around the logo with no surrounding whitespace.
3. Save as grayscale PNG (the matcher converts to grayscale anyway, but the
   cleaner the template, the higher the match score).
4. Calibrate `proof_logo_match_threshold` (default `0.65`) against 20-30 real
   receipts: lower it if real receipts are rejected, raise it if random images
   pass.

## Fallback

If a logo template is missing or the score is below threshold, the validator
falls back to keyword detection on the OCR output (e.g. it looks for "yape" or
"plin" in the text). That keeps the validator working when templates are not
yet provided, but accuracy is lower.
