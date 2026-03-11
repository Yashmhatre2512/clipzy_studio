import torch
import torchvision.transforms as transforms
from PIL import Image
import cv2
import numpy as np
from torchvision import models

def analyze_scene_intensity(video_path, scene_times):
    """Analyze scene intensity using ResNet model."""
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    model = models.resnet50(pretrained=True).to(device)
    model.eval()

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])

    intensity_scores = []

    for i, (start_time, end_time) in enumerate(scene_times):
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000)
        success, frame = cap.read()

        if success:
            img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            img_tensor = transform(img).unsqueeze(0).to(device)

            with torch.no_grad():
                features = model(img_tensor)
                score = features.norm().item()  # Normalize as intensity score
                intensity_scores.append({
                    'scene': i + 1,
                    'start_time': start_time,
                    'end_time': end_time,
                    'intensity': score
                })

        cap.release()

    # Sort by intensity for selecting top highlights
    intensity_scores.sort(key=lambda x: x['intensity'], reverse=True)
    return intensity_scores[:5]  # Top 5 intense scenes
