# Windows + RTX 4060 Laptop 训练环境

当前机器检测结果：

```text
GPU: NVIDIA GeForce RTX 4060 Laptop GPU
VRAM: 8188 MiB
Driver CUDA: 12.1
当前 python: 3.14.5
```

不要用 Python 3.14 安装 PyTorch CUDA。当前 PyTorch CUDA wheel 对 Python 3.14 支持不稳定，容易出现：

```text
ERROR: Could not find a version that satisfies the requirement torch
ERROR: No matching distribution found for torch
```

建议安装 Python 3.12，并给 YOLO26 单独建虚拟环境。

## 1. 安装 Python 3.12

如果电脑有 winget：

```powershell
winget install Python.Python.3.12
```

安装完成后重新打开 PowerShell，确认：

```powershell
py -0p
```

应该能看到类似：

```text
-V:3.12  C:\Users\...\Python312\python.exe
-V:3.14  C:\Python314\python.exe
```

## 2. 创建训练虚拟环境

进入项目目录：

```powershell
cd "C:\Users\Admin（无密码）\Desktop\消防与用电安全智能检查\消防与用电安全智能检查"
```

创建 Python 3.12 虚拟环境：

```powershell
py -3.12 -m venv .venv-yolo26
```

激活：

```powershell
.\.venv-yolo26\Scripts\Activate.ps1
```

如果 PowerShell 不允许激活脚本，先执行一次：

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

然后重新激活。

## 3. 安装 CUDA 版 PyTorch

```powershell
python -m pip install --upgrade pip
python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

验证 GPU：

```powershell
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'no cuda')"
```

看到 `True` 和 `NVIDIA GeForce RTX 4060 Laptop GPU` 就可以用显卡训练。

## 4. 安装 YOLO26 训练依赖

```powershell
python -m pip install -r .\training\yolo26\requirements.txt
```

验证：

```powershell
python -c "import yaml; print('yaml ok')"
python -c "from ultralytics import YOLO; print('ultralytics ok')"
```

## 5. RTX 4060 Laptop 推荐训练命令

稳妥版：

```powershell
python .\training\yolo26\scripts\train_yolo26.py --model yolo26n.pt --epochs 100 --imgsz 640 --batch 8 --device 0 --workers 2
```

如果显存不足：

```powershell
python .\training\yolo26\scripts\train_yolo26.py --model yolo26n.pt --epochs 100 --imgsz 640 --batch 4 --device 0 --workers 2
```

如果显存还有余量：

```powershell
python .\training\yolo26\scripts\train_yolo26.py --model yolo26n.pt --epochs 100 --imgsz 640 --batch 12 --device 0 --workers 2
```

## 6. CPU 临时跑通流程

不建议正式训练，只用于确认流程：

```powershell
python .\training\yolo26\scripts\train_yolo26.py --model yolo26n.pt --epochs 20 --imgsz 640 --batch 2 --device cpu --workers 0
```
