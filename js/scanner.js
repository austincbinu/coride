/* ==========================================================================
   coRide Barcode Scanner — Quagga2 Edition
   Decodes Code128 / Code39 / EAN barcodes from uploaded ID card photos
   ========================================================================== */

const IDScanner = {
  webcamStream: null,
  scannedRegisterNo: null,

  init() {
    this.bindEvents();
  },

  /* ── UI helpers ─────────────────────────────────────────── */

  setStatus(html, color) {
    const el = document.getElementById('scan-status-text');
    if (el) el.innerHTML = html;
    const dot = document.querySelector('.status-indicator');
    if (dot && color) dot.style.background = color;
  },

  showDecodedResult(rawCode, isValid, deptName, parsedDetails) {
    const regNoText  = document.getElementById('decoded-reg-no-text');
    const deptText   = document.getElementById('decoded-dept-text');
    const badge      = document.getElementById('decoded-badge');
    const regInput   = document.getElementById('scan-register-number-input');
    const displayBox = document.getElementById('decoded-barcode-display');
    const detailRow  = document.getElementById('decoded-details-row');

    // Show the raw barcode value (admission number) in the big display
    if (regNoText) regNoText.textContent = rawCode;
    if (regInput)  regInput.value = rawCode;
    this.scannedRegisterNo = rawCode;

    if (isValid && parsedDetails) {
      if (deptText)  deptText.textContent = '✅ ' + (deptName || 'Valid College ID');
      if (badge)     { badge.style.display = 'block'; badge.style.background = 'rgba(16,185,129,0.2)'; badge.style.color = 'var(--accent-emerald)'; badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Decoded'; }
      if (displayBox){ displayBox.style.borderColor = 'rgba(16,185,129,0.8)'; displayBox.style.background = 'rgba(16,185,129,0.12)'; }
      if (regNoText) regNoText.style.color = 'var(--accent-emerald)';

      // Populate parsed detail chips
      if (detailRow) {
        detailRow.style.display = 'flex';
        const cy = document.getElementById('chip-year');   if (cy) cy.textContent = `📅 Year: ${parsedDetails.year}`;
        const ca = document.getElementById('chip-admno');  if (ca) ca.textContent = `🔢 Serial No: ${parsedDetails.admNo}`;
        const cb = document.getElementById('chip-branch'); if (cb) cb.textContent = `🎓 Branch: ${parsedDetails.branchCode} (${parsedDetails.deptName})`;
      }
    } else {
      if (deptText)  deptText.textContent = '⚠️ Barcode read but format not recognised — correct below';
      if (badge)     { badge.style.display = 'block'; badge.style.background = 'rgba(245,158,11,0.2)'; badge.style.color = '#f59e0b'; badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Verify'; }
      if (displayBox){ displayBox.style.borderColor = 'rgba(245,158,11,0.6)'; displayBox.style.background = 'rgba(245,158,11,0.08)'; }
      if (regNoText) regNoText.style.color = '#f59e0b';
      if (detailRow) detailRow.style.display = 'none';
    }
  },

  showScanError(reason) {
    const regNoText  = document.getElementById('decoded-reg-no-text');
    const deptText   = document.getElementById('decoded-dept-text');
    const badge      = document.getElementById('decoded-badge');
    const displayBox = document.getElementById('decoded-barcode-display');
    const regInput   = document.getElementById('scan-register-number-input');

    if (regNoText)  { regNoText.textContent = '?'; regNoText.style.color = 'var(--accent-rose)'; }
    if (deptText)   deptText.textContent = reason || '❌ Barcode unreadable — enter Register Number manually below';
    if (badge)      { badge.style.display = 'block'; badge.style.background = 'rgba(244,63,94,0.15)'; badge.style.color = 'var(--accent-rose)'; badge.innerHTML = '<i class="fa-solid fa-xmark"></i> Failed'; }
    if (displayBox) { displayBox.style.borderColor = 'rgba(244,63,94,0.5)'; displayBox.style.background = 'rgba(244,63,94,0.06)'; }
    if (regInput)   { regInput.value = ''; regInput.placeholder = 'Type your register number (e.g. TLY25CS123)'; regInput.focus(); }
  },

  /* ── Event binding ──────────────────────────────────────── */

  bindEvents() {
    const fileInput    = document.getElementById('id-file-input');
    const dropZone     = document.getElementById('drag-upload-zone');
    const toggleCamBtn = document.getElementById('toggle-camera-btn');
    const confirmBtn   = document.getElementById('trigger-scan-btn');

    if (dropZone && fileInput) {
      dropZone.addEventListener('click', () => fileInput.click());

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent-emerald)';
      });
      dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'rgba(99,102,241,0.4)';
      });
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) this.handleImageUpload(f);
      });

      fileInput.addEventListener('change', (e) => {
        const f = e.target.files?.[0];
        if (f) this.handleImageUpload(f);
      });
    }

    toggleCamBtn?.addEventListener('click', () => this.toggleWebcam());
    confirmBtn?.addEventListener('click',   () => this.executeScanProcess());
  },

  /* ── Image upload → Quagga2 decode ─────────────────────── */

  handleImageUpload(file) {
    const dropZone = document.getElementById('drag-upload-zone');
    const reader   = new FileReader();

    this.setStatus(`<span style="color:var(--accent-primary);">🔍 Scanning barcode from <strong>${file.name}</strong>…</span>`, '#3b82f6');

    reader.onload = (e) => {
      const dataUrl = e.target.result;

      // Show image preview
      if (dropZone) {
        dropZone.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
        dropZone.style.background = 'rgba(0,0,0,0.85)';
      }

      this.decodeWithQuagga(dataUrl);
    };

    reader.readAsDataURL(file);
  },

  /* ── Core Quagga2 decode ─────────────────────────────────── */

  // Pre-process: grayscale + contrast boost → helps Quagga2 find bars clearly
  preprocessImage(dataUrl, callback) {
    const img = new Image();
    img.onload = () => {
      // Try at multiple scales — full, cropped bottom 40%, cropped middle strip
      const regions = [
        { sx: 0, sy: 0,               sw: img.width, sh: img.height },
        { sx: 0, sy: img.height * 0.5, sw: img.width, sh: img.height * 0.5 },
        { sx: 0, sy: img.height * 0.3, sw: img.width, sh: img.height * 0.4 },
        { sx: 0, sy: img.height * 0.7, sw: img.width, sh: img.height * 0.3 },
      ];

      const results = regions.map(r => {
        const canvas = document.createElement('canvas');
        const scale  = Math.min(1, 1200 / Math.max(r.sw, r.sh));
        canvas.width  = Math.round(r.sw * scale);
        canvas.height = Math.round(r.sh * scale);
        const ctx = canvas.getContext('2d');

        // Grayscale + high contrast
        ctx.filter = 'grayscale(1) contrast(2.5) brightness(1.1)';
        ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
      });

      callback(results);
    };
    img.src = dataUrl;
  },

  decodeWithQuagga(dataUrl) {
    if (typeof Quagga === 'undefined') {
      this.setStatus('⚠️ Barcode library still loading — wait a moment then try again.', '#f59e0b');
      return;
    }

    this.setStatus('<span style="color:var(--accent-primary);">🔍 Processing image…</span>', '#3b82f6');

    // Pre-process image into multiple regions with contrast boost
    this.preprocessImage(dataUrl, (processedImages) => {

      // Bar-strip readers in order of likelihood for college IDs
      const readerSets = [
        ['code_128_reader'],
        ['code_39_reader'],
        ['code_128_reader', 'code_39_reader'],
        ['i2of5_reader'],
        ['code_93_reader'],
      ];
      const patches = ['medium', 'large', 'small', 'x-large'];

      // Build attempt list: each processed image × each reader set × each patch size
      const attempts = [];
      for (const imgSrc of processedImages) {
        for (const readers of readerSets) {
          for (const patchSize of patches) {
            attempts.push({ imgSrc, readers, patchSize });
          }
        }
      }

      let idx = 0;

      const tryNext = () => {
        if (idx >= attempts.length) {
          this.showScanError('❌ Could not read barcode from this photo. Enter your Register Number manually below.');
          this.setStatus('⚠️ Barcode unreadable — type your register number manually below.', '#f43f5e');
          return;
        }

        const { imgSrc, readers, patchSize } = attempts[idx++];
        this.setStatus(
          `<span style="color:var(--text-muted);">🔍 Scanning… (attempt ${idx}/${attempts.length})</span>`,
          '#3b82f6'
        );

        Quagga.decodeSingle(
          {
            src: imgSrc,
            numOfWorkers: 0,
            locate: true,
            inputStream: { size: 1200 },
            decoder:  { readers, multiple: false },
            locator:  { patchSize, halfSample: true }
          },
          (result) => {
            const code = result?.codeResult?.code;
            if (code && code.trim().length > 0) {
              const decoded    = code.trim().toUpperCase();
              // Try admission number format first (year/admno/branch)
              const validation = AuthManager.validateAdmissionNumber(decoded);
              this.showDecodedResult(decoded, validation.isValid, validation.deptName, validation.isValid ? validation : null);
              const msg = validation.isValid
                ? `<strong style="color:var(--accent-emerald);">✅ Admission No Decoded: <span style="font-family:monospace">${decoded}</span> — ${validation.deptName}</strong>`
                : `<strong style="color:#f59e0b;">⚠️ Barcode read: "<span style="font-family:monospace">${decoded}</span>" — does not match YY/NNN/BRANCH format. Correct below.</strong>`;
              this.setStatus(msg, validation.isValid ? '#10b981' : '#f59e0b');
            } else {
              tryNext();
            }
          }
        );
      };

      tryNext();
    });
  },

  /* ── Webcam live scanning ───────────────────────────────── */

  async toggleWebcam() {
    const video    = document.getElementById('webcam-video');
    const dropZone = document.getElementById('drag-upload-zone');

    if (this.webcamStream) {
      // Stop camera
      this.webcamStream.getTracks().forEach(t => t.stop());
      this.webcamStream = null;
      if (video)    { video.classList.add('hidden'); video.srcObject = null; }
      if (dropZone) dropZone.style.display = 'flex';
      this.setStatus('Camera stopped. Upload an ID photo to scan.', null);
      return;
    }

    try {
      this.setStatus('Requesting camera access…', '#3b82f6');
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (video) {
        video.srcObject = this.webcamStream;
        video.classList.remove('hidden');
      }
      if (dropZone) dropZone.style.display = 'none';
      this.setStatus('📷 Camera active — hold barcode in frame. Scanning…', '#3b82f6');
      this.startLiveScan(video);
    } catch (err) {
      this.setStatus('⚠️ Webcam not accessible. Upload an ID photo instead.', '#f59e0b');
    }
  },

  startLiveScan(videoEl) {
    if (typeof Quagga === 'undefined') return;

    const captureAndDecode = () => {
      if (!this.webcamStream) return;

      const canvas = document.createElement('canvas');
      canvas.width  = videoEl.videoWidth  || 640;
      canvas.height = videoEl.videoHeight || 480;
      canvas.getContext('2d').drawImage(videoEl, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      Quagga.decodeSingle(
        {
          src: dataUrl,
          numOfWorkers: 0,
          locate: true,
          inputStream: { size: 800 },
          decoder: { readers: ['code_128_reader', 'code_39_reader'] },
          locator: { patchSize: 'medium', halfSample: true }
        },
        (result) => {
          const code = result?.codeResult?.code;
          if (code) {
            const decoded    = code.trim().toUpperCase();
            const validation = AuthManager.validateRegisterNumber(decoded);
            this.showDecodedResult(decoded, validation.isValid, validation.deptName);
            this.setStatus(`<strong style="color:var(--accent-emerald);">✅ Live Barcode Decoded: ${decoded}</strong>`, '#10b981');
            // Stop camera after successful decode
            this.webcamStream?.getTracks().forEach(t => t.stop());
            this.webcamStream = null;
          } else {
            if (this.webcamStream) setTimeout(captureAndDecode, 600);
          }
        }
      );
    };

    videoEl.addEventListener('loadedmetadata', () => {
      setTimeout(captureAndDecode, 500);
    });
  },

  /* ── Final confirm & login ──────────────────────────────── */

  executeScanProcess() {
    const ocrNameInput = document.getElementById('ocr-user-name');
    const regInput     = document.getElementById('scan-register-number-input');
    const errorMsg     = document.getElementById('ocr-error-msg');

    const realName   = ocrNameInput?.value.trim() || '';
    const activeRegNo = regInput?.value.trim()    || '';

    if (errorMsg) errorMsg.style.display = 'none';

    // 1 — Validate admission number (year/admno/branch format)
    const validation = AuthManager.validateAdmissionNumber(activeRegNo);
    if (!validation.isValid) {
      if (errorMsg) {
        errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <strong>Invalid Admission Number!</strong> "${activeRegNo}" — expected format: YY/NNN/BRANCH (e.g. 25/033/CS). Valid branches: CSE, ECE, EEE, ME, CE, ES, IT.`;
        errorMsg.style.display = 'block';
      }
      if (regInput) { regInput.style.borderColor = 'var(--accent-rose)'; regInput.focus(); }
      this.setStatus('<strong style="color:var(--accent-rose);">❌ Invalid Admission Number format!</strong>', '#f43f5e');
      window.appShowToast('Invalid Admission Number format.', 'warning');
      return;
    }

    // 2 — Require full name
    if (!realName) {
      if (errorMsg) { errorMsg.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Please enter your Full Name!'; errorMsg.style.display = 'block'; }
      if (ocrNameInput) { ocrNameInput.style.borderColor = 'var(--accent-rose)'; ocrNameInput.focus(); }
      window.appShowToast('Please enter your full name!', 'warning');
      return;
    }

    // ✅ Verified
    this.setStatus(`<strong style="color:var(--accent-emerald);">✅ Verified: ${realName} — ${validation.deptName} (${validation.admissionNo})</strong>`, '#10b981');

    AuthManager.saveUser({
      name:           realName,
      role:           'Student',
      admissionNo:    validation.admissionNo,
      registerNumber: validation.registerNumber,
      department:     validation.deptName,
      age:            21,
      phone:          '',
      method:         'ID Card Barcode Scan'
    });

    window.appShowToast(`✅ Welcome, ${realName}! (${validation.formattedRegNo})`, 'success');

    setTimeout(() => {
      document.getElementById('scan-modal')?.classList.remove('active');
      if (this.webcamStream) { this.webcamStream.getTracks().forEach(t => t.stop()); this.webcamStream = null; }
      RideManager.renderRidesList();
      RideManager.renderRequestsList();
      RideManager.renderMyTrips();
    }, 800);
  }
};
