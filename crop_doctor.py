#!/usr/bin/env python3
"""
pipeline_crop_disease.py

Pipeline:
1. HDFS classifier (PyTorch) -> classification label + confidence
2. Segmentation (DeepLabV3 or custom) -> mask
3. YOLOv11 OBB (if available) OR compute OBBs from mask contours -> list of rotated boxes
4. Send image + classification + OBBs to Gemini for a detailed description

Replace placeholders (model paths, Gemini API key, endpoints) with your real assets.
"""

import argparse
import base64
import io
import json
import os
from typing import List, Tuple, Dict

import cv2
import numpy as np
import requests
from PIL import Image
import torch
import torchvision.transforms as T
import torchvision
from torchvision import models

# -------------------------
# Helpers & Config
# -------------------------
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Replace with your HDFS model checkpoint path
HDFS_MODEL_PATH = "hdfs_model.pth"

# Gemini/Generative API config - replace with your endpoint & key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "REPLACE_WITH_YOUR_KEY")
GEMINI_ENDPOINT = os.getenv("GEMINI_ENDPOINT", "https://generative.googleapis.com/v1beta2/models/your-gemini-model:generateText")


# -------------------------
# 1) HDFS classifier
# -------------------------
class HDFSClassifier:
    def __init__(self, model_path: str = HDFS_MODEL_PATH, device=DEVICE):
        self.device = device
        self.model = self._load_model(model_path)
        self.transform = T.Compose(
            [
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406],
                            std=[0.229, 0.224, 0.225]),
            ]
        )

    def _load_model(self, path):
        # Placeholder: Adjust the architecture to your saved checkpoint
        # Example: assume a small ResNet18-based classifier
        model = models.resnet18(pretrained=False)
        num_features = model.fc.in_features
        model.fc = torch.nn.Linear(num_features, 5)  # change 5 -> number of disease classes
        if os.path.exists(path):
            ckpt = torch.load(path, map_location=self.device)
            model.load_state_dict(ckpt.get("model_state", ckpt))
            print(f"[HDFSClassifier] Loaded model from {path}")
        else:
            print("[HDFSClassifier] Warning: model path not found. Using randomly initialized model.")
        model.eval()
        model.to(self.device)
        return model

    def predict(self, pil_img: Image.Image) -> Dict:
        img = self.transform(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            logits = self.model(img)
            probs = torch.nn.functional.softmax(logits, dim=-1).cpu().numpy()[0]
            pred_idx = int(np.argmax(probs))
            confidence = float(probs[pred_idx])
        # Map index to disease label - replace with your labels
        label_map = {
            0: "healthy",
            1: "early_blight",
            2: "late_blight",
            3: "rust",
            4: "scab",
        }
        label = label_map.get(pred_idx, f"class_{pred_idx}")
        return {"label": label, "confidence": confidence, "probs": probs.tolist(), "pred_idx": pred_idx}


# -------------------------
# 2) Segmentation (DeepLabV3 fallback)
# -------------------------
class Segmenter:
    def __init__(self, use_custom_model: bool = False, device=DEVICE):
        self.device = device
        if use_custom_model:
            # load your segmentation model here
            raise NotImplementedError("Custom segmentation loader not implemented")
        else:
            # Use DeepLabV3 (pretrained on COCO / Pascal) as a fallback for mask generation.
            self.model = models.segmentation.deeplabv3_resnet50(pretrained=True).to(self.device).eval()
        self.preprocess = T.Compose([
            T.Resize((512, 512)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    def segment(self, pil_img: Image.Image) -> np.ndarray:
        """
        Returns a binary mask (H,W) where plant / diseased areas are 1.
        Using pretrained DeepLab on general classes; for best results use a crop-specific segmenter.
        """
        original_size = pil_img.size  # (W, H)
        img = self.preprocess(pil_img).unsqueeze(0).to(self.device)
        with torch.no_grad():
            out = self.model(img)['out'][0]
            # out shape: [C, H, W] -> take argmax for class
            mask = out.argmax(0).byte().cpu().numpy()
            # Heuristic: treat non-background classes as foreground
            binary_mask = (mask != 0).astype(np.uint8) * 255  # 0/255
        # Resize mask back to original size
        binary_mask = cv2.resize(binary_mask, original_size, interpolation=cv2.INTER_NEAREST)
        return binary_mask


# -------------------------
# 3) YOLOv11 OBB (placeholder) OR compute OBB from masks
# -------------------------
def compute_obbs_from_mask(binary_mask: np.ndarray, min_area: int = 200) -> List[Dict]:
    """
    Compute oriented bounding boxes (OBB) from binary mask using contours + minAreaRect.
    Returns list of dicts: {'cx':, 'cy':, 'w':, 'h':, 'angle':, 'box_pts': np.ndarray(4,2), 'area':}
    Coordinates are in image pixel space (x to right, y down).
    """
    # Ensure mask is single-channel 0/255
    if len(binary_mask.shape) == 3:
        mask_gray = cv2.cvtColor(binary_mask, cv2.COLOR_BGR2GRAY)
    else:
        mask_gray = binary_mask
    # find contours
    contours, _ = cv2.findContours(mask_gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    obbs = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        rect = cv2.minAreaRect(cnt)  # ((cx,cy), (w,h), angle)
        (cx, cy), (w, h), angle = rect
        box = cv2.boxPoints(rect)  # 4 points
        box = np.int0(box)
        obb = {
            "cx": float(cx),
            "cy": float(cy),
            "w": float(w),
            "h": float(h),
            "angle": float(angle),
            "area": float(area),
            "box_pts": box.tolist(),  # 4x2
        }
        obbs.append(obb)
    return obbs


# If you have a YOLOv11 OBB model, implement this function to call it.
def detect_with_yolo_obb(image_bgr: np.ndarray) -> List[Dict]:
    """
    Placeholder: if you have a YOLOv11 OBB model, replace this stub with actual inference call.
    The function should return a list of detections where each detection has:
    {'label': str, 'confidence': float, 'cx':, 'cy':, 'w':, 'h':, 'angle':, 'box_pts': [[x1,y1],...]}
    """
    # Example: return empty to indicate no YOLOv11 available
    return []


# -------------------------
# 4) Gemini integration (template)
# -------------------------
def image_to_base64_bytes(pil_img: Image.Image) -> str:
    buffered = io.BytesIO()
    pil_img.save(buffered, format="JPEG", quality=90)
    img_bytes = buffered.getvalue()
    b64 = base64.b64encode(img_bytes).decode("utf-8")
    return b64


def send_to_gemini(image_b64: str, classification: Dict, obbs: List[Dict], extra_prompt: str = "") -> Dict:
    """
    Template to call Gemini / Google Generative API.
    You must replace GEMINI_ENDPOINT and headers with your actual endpoint & API key / auth system.
    This demonstrates packaging coordinates + classification + image.
    """
    if GEMINI_API_KEY == "REPLACE_WITH_YOUR_KEY":
        print("[Gemini] Warning: GEMINI_API_KEY is not set. Skipping remote call and returning local summary.")
        # Return a local prompt-based summary to let the pipeline be usable offline
        return {
            "gemini_available": False,
            "text": generate_local_summary(classification, obbs),
        }

    # Example JSON payload: adapt to the actual Gemini API you have access to.
    payload = {
        "prompt": {
            "text": f"Image-based plant disease analysis. Provide a detailed description including likely disease cause, severity, recommendations, and explanation for the bounding boxes / segments.\nExtra: {extra_prompt}\n\nClassification: {classification}\nBounding boxes (OBBs): {obbs}\n",
        },
        "image": {
            "content": image_b64  # many APIs accept base64 image under a field like this
        },
        "max_output_tokens": 800,
    }

    headers = {
        "Authorization": f"Bearer {GEMINI_API_KEY}",
        "Content-Type": "application/json",
    }

    resp = requests.post(GEMINI_ENDPOINT, headers=headers, json=payload, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"Gemini API error {resp.status_code}: {resp.text}")
    return resp.json()


def generate_local_summary(classification: Dict, obbs: List[Dict]) -> str:
    """Fallback summary generator when remote Gemini not available (simple rule-based)."""
    s = []
    s.append(f"Predicted class: {classification.get('label')} (confidence {classification.get('confidence'):.2f})")
    s.append("Detected regions (OBBs):")
    if not obbs:
        s.append("  - No oriented bounding boxes detected.")
    else:
        for i, obb in enumerate(obbs, 1):
            s.append(f"  - Region {i}: center=({obb['cx']:.1f},{obb['cy']:.1f}), "
                     f"w={obb['w']:.1f}, h={obb['h']:.1f}, angle={obb['angle']:.1f}, area={obb['area']:.1f}")
    s.append("\nSuggested actions: examine symptomatic leaves closely, consider lab testing for pathogen, remove badly affected tissue, apply recommended fungicide/pesticide according to local guidelines.")
    return "\n".join(s)


# -------------------------
# Visualization utilities
# -------------------------
def draw_obbs_on_image(image_bgr: np.ndarray, obbs: List[Dict]) -> np.ndarray:
    out = image_bgr.copy()
    for obb in obbs:
        pts = np.array(obb["box_pts"], dtype=np.int32)
        cv2.polylines(out, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
        cx, cy = int(obb["cx"]), int(obb["cy"])
        label = f"{obb.get('label','region')} {obb.get('area',0):.0f}"
        cv2.putText(out, label, (cx - 20, cy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return out


# -------------------------
# Main pipeline
# -------------------------
def run_pipeline(image_path: str, save_debug: bool = True, extra_prompt: str = ""):
    # Load image
    pil = Image.open(image_path).convert("RGB")
    img_bgr = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    hdfs = HDFSClassifier()
    seg = Segmenter()

    # 1) classification
    cls_res = hdfs.predict(pil)
    print(f"[Classifier] {cls_res['label']} (conf {cls_res['confidence']:.3f})")

    # 2) segmentation mask
    mask = seg.segment(pil)  # 0/255 np.uint8
    print(f"[Segmenter] mask shape: {mask.shape}, unique: {np.unique(mask)[:5]}")

    # 3) try YOLOv11 OBB (user model) first
    yolo_dets = detect_with_yolo_obb(img_bgr)
    if yolo_dets:
        obbs = yolo_dets
        print(f"[YOLO-OBB] returned {len(obbs)} detections")
    else:
        # fallback: compute OBBs from mask
        obbs = compute_obbs_from_mask(mask, min_area=300)
        print(f"[Fallback OBB] computed {len(obbs)} oriented boxes from mask")

    # Optionally correlate OBBs with classification label (attach label/confidence)
    for obb in obbs:
        obb["label"] = cls_res["label"]
        obb["confidence"] = cls_res["confidence"]

    # 4) prepare data for Gemini
    b64 = image_to_base64_bytes(pil)
    try:
        gemini_resp = send_to_gemini(b64, cls_res, obbs, extra_prompt=extra_prompt)
    except Exception as e:
        gemini_resp = {"error": str(e), "gemini_available": False, "text": generate_local_summary(cls_res, obbs)}

    # Debug visualization
    vis = draw_obbs_on_image(img_bgr, obbs)
    if save_debug:
        out_path = os.path.splitext(image_path)[0] + "_debug.jpg"
        cv2.imwrite(out_path, vis)
        mask_path = os.path.splitext(image_path)[0] + "_mask.png"
        cv2.imwrite(mask_path, mask)
        print(f"[IO] Saved debug image to {out_path} and mask to {mask_path}")

    # Return structured result
    return {
        "classification": cls_res,
        "obbs": obbs,
        "gemini": gemini_resp,
        "debug_image_path": out_path if save_debug else None,
        "mask_path": mask_path if save_debug else None,
    }


# -------------------------
# CLI
# -------------------------
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--image", required=True, help="Path to image")
    p.add_argument("--no-debug", dest="debug", action="store_false", help="Don't save debug images")
    p.add_argument("--extra-prompt", default="", help="Extra prompt text to send to Gemini")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    res = run_pipeline(args.image, save_debug=args.debug, extra_prompt=args.extra_prompt)
    # Print concise structured output
    print("\n=== PIPELINE RESULT ===")
    print(json.dumps({
        "classification": res["classification"],
        "num_obbs": len(res["obbs"]),
        "gemini_summary_available": bool(res["gemini"])
    }, indent=2))
    # If Gemini returned text, print short excerpt
    gem = res.get("gemini", {})
    if isinstance(gem, dict):
        # find a text field
        text = None
        for k in ("text", "output_text", "response", "content"):
            if k in gem:
                text = gem[k]
                break
        if text:
            print("\n=== Gemini Summary (excerpt) ===")
            print(text[:2000])  # print first 2000 chars
    print("Done.")
