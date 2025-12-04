// script.js
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET_NAME } from "./supabase-config.js";

/* -------------------------
   Helpers
   -------------------------*/
function randomId(len = 6) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function setProgress(id, percentage) {
  const progressContainer = document.getElementById(id);
  if (!progressContainer) return;
  const progressBar = progressContainer.querySelector("div");
  if (percentage >= 0 && percentage < 100) {
    progressContainer.style.display = "block";
    progressBar.style.width = `${percentage}%`;
  } else {
    progressBar.style.width = "100%";
    setTimeout(() => {
      progressContainer.style.display = "none";
      progressBar.style.width = "0%";
    }, 500);
  }
}

function showNotification(message) {
  const notification = document.getElementById("notification");
  if (!notification) {
    alert(message);
    return;
  }
  notification.innerHTML = `<span class="text-white">${message}</span>`;
  notification.classList.remove("opacity-0");
  notification.classList.add("opacity-100");
  setTimeout(() => {
    notification.classList.remove("opacity-100");
    notification.classList.add("opacity-0");
  }, 3000);
}

async function copyLinkToClipboard(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.value) {
    showNotification("No link to copy yet.");
    return;
  }
  try {
    await navigator.clipboard.writeText(input.value);
    showNotification("Link copied to clipboard!");
  } catch (err) {
    // fallback
    input.select();
    document.execCommand("copy");
    showNotification("Link copied to clipboard!");
  }
}

/* -------------------------
   Upload file with real progress (XHR + Supabase Storage REST)
   -------------------------*/
async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const fileLink = document.getElementById("fileLink");
  const fileProgressId = "fileProgress";

  if (!fileInput || fileInput.files.length === 0) {
    showNotification("Please select a file first.");
    return;
  }

  const file = fileInput.files[0];
  const timestampedName = `${Date.now()}-${file.name}`;
  const path = encodeURIComponent(timestampedName);

  // Show initial progress
  setProgress(fileProgressId, 0);

  try {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${path}`;

    xhr.open("PUT", url, true);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    // optional cache-control
    xhr.setRequestHeader("x-upsert", "true");

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(fileProgressId, percent);
      }
    };

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload"));
    });

    xhr.send(file);
    await uploadPromise;

    // Build public URL (Supabase public object URL)
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;

    // generate short id and insert mapping into links table
    const shortId = randomId();
    const { error: dbError } = await supabase.from("links").insert({ id: shortId, path: publicUrl });

    if (dbError) {
      console.error("DB insert error:", dbError);
      showNotification("Failed to save link to database.");
      setProgress(fileProgressId, 100);
      return;
    }

    fileLink.value = `${window.location.origin}/#${shortId}`;
    setProgress(fileProgressId, 100);
    showNotification(`Upload complete! Link generated.`);
  } catch (err) {
    console.error(err);
    showNotification("Upload failed: " + (err.message || err));
    setProgress(fileProgressId, 0);
  }
}

/* -------------------------
   Upload text (as a .txt file) with progress
   -------------------------*/
async function uploadText() {
  const textInput = document.getElementById("textInput");
  const textLink = document.getElementById("textLink");
  const textProgressId = "textProgress";

  const content = textInput ? textInput.value.trim() : "";
  if (!content) {
    showNotification("Please paste some text first.");
    return;
  }

  const filename = `${Date.now()}.txt`;
  const blob = new Blob([content], { type: "text/plain" });
  const path = encodeURIComponent(filename);

  setProgress(textProgressId, 0);

  try {
    const xhr = new XMLHttpRequest();
    const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${path}`;
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader("x-upsert", "true");

    xhr.upload.onprogress = function (e) {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setProgress(textProgressId, percent);
      }
    };

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error during text upload"));
    });

    xhr.send(blob);
    await uploadPromise;

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;

    const shortId = randomId();
    const { error: dbError } = await supabase.from("links").insert({ id: shortId, path: publicUrl });

    if (dbError) {
      console.error("DB insert error:", dbError);
      showNotification("Failed to save text link to database.");
      setProgress(textProgressId, 100);
      return;
    }

    textLink.value = `${window.location.origin}/#${shortId}`;
    setProgress(textProgressId, 100);
    showNotification("Text link generated!");
  } catch (err) {
    console.error(err);
    showNotification("Upload failed: " + (err.message || err));
    setProgress(textProgressId, 0);
  }
}

/* -------------------------
   Copy link helper
   -------------------------*/
function copyLink(inputId) {
  copyLinkToClipboard(inputId);
}

/* -------------------------
   On page load: handle hash redirect
   -------------------------*/
async function handleHashRedirect() {
  const id = window.location.hash.slice(1);
  if (!id) return;

  document.body.innerHTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#111;color:white;"><div style="text-align:center;">
  <h2 style="font-size:20px;margin-bottom:10px">Redirecting…</h2>
  <p style="opacity:.7">Please wait — we are fetching your file.</p>
  </div></div>`;

  try {
    const { data, error } = await supabase.from("links").select("path").eq("id", id).single();
    if (error || !data) {
      document.body.innerHTML = "<h2 style='text-align:center;margin-top:3rem;color:#fff'>Link not found or expired.</h2>";
      return;
    }
    window.location.href = data.path;
  } catch (err) {
    console.error(err);
    document.body.innerHTML = "<h2 style='text-align:center;margin-top:3rem;color:#fff'>Something went wrong.</h2>";
  }
}

/* -------------------------
   Expose to window for HTML onclick to work
   -------------------------*/
window.uploadFile = uploadFile;
window.uploadText = uploadText;
window.copyLink = copyLink;

// Run redirect handler immediately
handleHashRedirect();
