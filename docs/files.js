/* ============================================================
   FILES — unico punto di accesso ai contenuti multimediali.
   Il pulsante 📎 apre il menu File / Foto / Fotocamera; il file
   scelto (o la foto scattata) viene mostrato in anteprima nella
   barra di input, pronto per essere allegato al messaggio.
   ============================================================ */

const JarvisFiles = (() => {
  const fileBtn = document.getElementById("fileBtn");
  const fileMenu = document.getElementById("fileMenu");
  const pickFile = document.getElementById("pickFile");
  const pickPhoto = document.getElementById("pickPhoto");
  const pickCamera = document.getElementById("pickCamera");

  const attachPreview = document.getElementById("attachPreview");
  const attachImg = document.getElementById("attachImg");
  const attachName = document.getElementById("attachName");
  const attachCancel = document.getElementById("attachCancel");

  let currentAttachment = null; // { file, base64, mime, isImage, name }

  function toggleMenu() {
    fileMenu.classList.toggle("open");
  }
  function closeMenu() {
    fileMenu.classList.remove("open");
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data:<mime>;base64,....
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const base64 = await fileToBase64(file);
    currentAttachment = { file, base64, mime: file.type, isImage, name: file.name };

    attachName.textContent = file.name;
    if (isImage) {
      attachImg.src = base64;
      attachImg.hidden = false;
    } else {
      attachImg.hidden = true;
    }
    attachPreview.hidden = false;
  }

  function clearAttachment() {
    currentAttachment = null;
    attachPreview.hidden = true;
    attachImg.src = "";
  }

  function getAttachment() {
    return currentAttachment;
  }

  function init() {
    fileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    document.addEventListener("click", (e) => {
      if (!fileMenu.contains(e.target) && e.target !== fileBtn) closeMenu();
    });

    fileMenu.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", () => {
        closeMenu();
        const kind = b.dataset.kind;
        const input = kind === "file" ? pickFile : kind === "photo" ? pickPhoto : pickCamera;
        input.value = "";
        input.onchange = () => handleFile(input.files[0]);
        input.click();
      });
    });

    attachCancel.addEventListener("click", clearAttachment);
  }

  return { init, getAttachment, clearAttachment };
})();

JarvisFiles.init();
