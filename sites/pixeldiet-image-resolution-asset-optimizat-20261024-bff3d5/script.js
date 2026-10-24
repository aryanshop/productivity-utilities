document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const dashboardSection = document.getElementById('dashboard-section');
  const uploadSection = document.querySelector('.upload-section');
  const assetList = document.getElementById('asset-list');
  const emptyInspector = document.getElementById('empty-inspector');
  const inspectorContent = document.getElementById('inspector-content');
  const clearAllBtn = document.getElementById('clear-all-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');

  const metricCount = document.getElementById('metric-count');
  const metricOriginalSize = document.getElementById('metric-original-size');
  const metricCompressedSize = document.getElementById('metric-compressed-size');
  const metricSavings = document.getElementById('metric-savings');

  const previewImg = document.getElementById('preview-img');
  const inspectFilename = document.getElementById('inspect-filename');
  const inspectDims = document.getElementById('inspect-dims');
  const inspectRatio = document.getElementById('inspect-ratio');
  const inspectType = document.getElementById('inspect-type');
  const inspectSize = document.getElementById('inspect-size');
  const time4g = document.getElementById('time-4g');
  const timeBroadband = document.getElementById('time-broadband');
  const codeSrcset = document.getElementById('code-srcset');
  const codeCss = document.getElementById('code-css');

  let assets = [];
  let activeAssetId = null;

  // Drag and drop event listeners
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    handleFiles(files);
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = '';
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const asset = {
            id: 'asset_' + Math.random().toString(36.substring(2, 9)),
            name: file.name,
            type: file.type || 'image/jpeg',
            size: file.size,
            width: img.naturalWidth,
            height: img.naturalHeight,
            url: e.target.result
          };
          assets.push(asset);
          updateDashboard();
          if (!activeAssetId) {
            setActiveAsset(asset.id);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
  }

  function getAspectRatio(w, h) {
    const divisor = gcd(w, h);
    return `${w / divisor}:${h / divisor}`;
  }

  function updateDashboard() {
    if (assets.length === 0) {
      dashboardSection.classList.add('hidden');
      return;
    }

    dashboardSection.classList.remove('hidden');

    metricCount.textContent = assets.length;

    const totalBytes = assets.reduce((acc, curr) => acc + curr.size, 0);
    metricOriginalSize.textContent = formatBytes(totalBytes);

    // Estimated compressed size (mocking typical modern WebP/AVIF lossless/lossy savings of ~35%)
    const estCompressedBytes = Math.round(totalBytes * 0.65);
    metricCompressedSize.textContent = formatBytes(estCompressedBytes);
    metricSavings.textContent = '35%';

    renderAssetList();
  }

  function renderAssetList() {
    assetList.innerHTML = '';
    assets.forEach(asset => {
      const li = document.createElement('li');
      li.className = `asset-item ${asset.id === activeAssetId ? 'active' : ''}`;
      li.innerHTML = `
        <div class="asset-item-info">
          <span class="asset-item-name">${asset.name}</span>
          <span class="asset-item-meta">${asset.width}x${asset.height} &bull; ${formatBytes(asset.size)}</span>
        </div>
        <button class="asset-item-remove" title="Remove asset">&times;</button>
      `;

      li.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        setActiveAsset(asset.id);
      });

      const removeBtn = li.querySelector('.asset-item-remove');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeAsset(asset.id);
      });

      assetList.appendChild(li);
    });
  }

  function setActiveAsset(id) {
    activeAssetId = id;
    const asset = assets.find(a => a.id === id);

    if (!asset) {
      emptyInspector.classList.remove('hidden');
      inspectorContent.classList.add('hidden');
      return;
    }

    emptyInspector.classList.add('hidden');
    inspectorContent.classList.remove('hidden');

    previewImg.src = asset.url;
    inspectFilename.textContent = asset.name;
    inspectDims.textContent = `${asset.width} × ${asset.height} px`;
    inspectRatio.textContent = getAspectRatio(asset.width, asset.height);
    inspectType.textContent = asset.type;
    inspectSize.textContent = formatBytes(asset.size);

    // Network speed simulation calculations
    // 4G mobile ~10 Mbps = 1.25 MB/s
    // Broadband ~50 Mbps = 6.25 MB/s
    const speed4gSec = (asset.size / (1.25 * 1024 * 1024)).toFixed(2);
    const speedBroadbandSec = (asset.size / (6.25 * 1024 * 1024)).toFixed(2);

    time4g.textContent = `${speed4gSec}s`;
    timeBroadband.textContent = `${speedBroadbandSec}s`;

    // Code snippets generation
    const safeName = asset.name.replace(/\.[^/.]+$/, "");
    codeSrcset.value = `<img src="${asset.name}" srcset="${safeName}-400w.jpg 400w, ${safeName}-800w.jpg 800w" sizes="(max-width: 800px) 100vw, 800px" alt="${safeName}" loading="lazy" width="${asset.width}" height="${asset.height}">`;
    codecss.value = `background-image: url('${asset.name}');
background-size: cover;
aspect-ratio: ${asset.width} / ${asset.height};`;

    renderAssetList();
  }

  function removeAsset(id) {
    assets = assets.filter(a => a.id !== id);
    if (activeAssetId === id) {
      activeAssetId = assets.length > 0 ? assets[0].id : null;
    }
    updateDashboard();
    setActiveAsset(activeAssetId);
  }

  clearAllBtn.addEventListener('click', () => {
    assets = [];
    activeAssetId = null;
    updateDashboard();
    setActiveAsset(null);
  });

  exportJsonBtn.addEventListener('click', () => {
    if (assets.length === 0) return;
    const report = {
      app: "PixelDiet",
      exportDate: new Date().toISOString(),
      totalAssets: assets.length,
      assets: assets.map(a => ({
        name: a.name,
        type: a.type,
        sizeBytes: a.size,
        width: a.width,
        height: a.height,
        aspectRatio: getAspectRatio(a.width, a.height)
      }))
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixeldiet-asset-report.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Copy button handlers
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const textarea = document.getElementById(targetId);
      if (textarea) {
        textarea.select();
        navigator.clipboard.writeText(textarea.value);
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = originalText;
        }, 1500);
      }
    });
  });
});
