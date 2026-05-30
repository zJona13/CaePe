# Logo templates for proof validation

`proof_validator.py` performs OpenCV template matching against the files below
to identify Yape vs Plin receipts. Drop the cropped logo PNGs here before
turning on `PROOF_VALIDATION_ENABLED`.

## Required files

- `yape_logo.png` — cropped Yape logo (purple "Yape" wordmark on violet bg).
- `plin_logo.png` — turquoise "plin" speech-bubble logo cropped from a real
  Plin receipt. Match score ~0.99 against the reference, well above the 0.65
  threshold.

## Reference receipts

`yape_reference.jpeg` and `plin_reference.jpeg` are full sample receipts kept
for visual calibration. Not used by matcher; safe to delete if you trim repo
size.

## How to produce them

1. Take a real Yape/Plin receipt screenshot.
2. Crop tightly around the logo.
3. Save as PNG. Matcher converts to grayscale, rescales 0.4x–2.0x internally.
4. Calibrate `proof_logo_match_threshold` (default `0.65`) against 20–30 real
   receipts: lower if real receipts rejected, raise if random images pass.

## Fallback

If a logo template is missing or the score is below threshold, the validator
falls back to keyword detection on the OCR output (e.g. it looks for "yape" or
"plin" in the text). That keeps the validator working when templates are not
yet provided, but accuracy is lower.
