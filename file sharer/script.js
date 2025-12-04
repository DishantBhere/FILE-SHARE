import { supabase } from "./supabase-config.js";

// Generate a short ID like "k3nf92"
function randomId(len = 6) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < len; i++) {
        out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
}

/*-------------------------------------------------------
   FILE UPLOAD
--------------------------------------------------------*/
async function uploadFile() {
    const fileInput = document.getElementById("fileInput");
    const fileLink = document.getElementById("fileLink");

    if (!fileInput.files.length) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];
    const fileName = `${Date.now()}-${file.name}`;

    // Upload to Supabase bucket **files** (not shared)
    const { error: uploadError } = await supabase
        .storage
        .from("files")
        .upload(fileName, file);

    if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        console.error(uploadError);
        return;
    }

    // Get public URL
    const { data: urlData } = supabase
        .storage
        .from("files")
        .getPublicUrl(fileName);

    const fullUrl = urlData.publicUrl;

    // Generate short ID
    const shortId = randomId();

    // Insert into links table
    const { error: dbError } = await supabase
        .from("links")
        .insert({
            id: shortId,
            path: fullUrl
        });

    if (dbError) {
        alert("Database error: " + dbError.message);
        console.error(dbError);
        return;
    }

    // Output final short link
    fileLink.value = `${window.location.origin}/#${shortId}`;
}

/*-------------------------------------------------------
   TEXT UPLOAD
--------------------------------------------------------*/
async function uploadText() {
    const textInput = document.getElementById("textInput");
    const textLink = document.getElementById("textLink");

    if (!textInput.value.trim()) {
        alert("Please enter text.");
        return;
    }

    const content = textInput.value.trim();
    const fileName = `${Date.now()}.txt`;

    const blob = new Blob([content], { type: "text/plain" });

    // Upload text file to Supabase bucket **files**
    const { error: uploadError } = await supabase
        .storage
        .from("files")
        .upload(fileName, blob);

    if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        console.error(uploadError);
        return;
    }

    const { data: urlData } = supabase
        .storage
        .from("files")
        .getPublicUrl(fileName);

    const fullUrl = urlData.publicUrl;

    const shortId = randomId();

    const { error: dbError } = await supabase
        .from("links")
        .insert({
            id: shortId,
            path: fullUrl
        });

    if (dbError) {
        alert("Database error: " + dbError.message);
        console.error(dbError);
        return;
    }

    textLink.value = `${window.location.origin}/#${shortId}`;
}

/*-------------------------------------------------------
   EXPOSE FUNCTIONS TO HTML
--------------------------------------------------------*/
window.uploadFile = uploadFile;
window.uploadText = uploadText;
