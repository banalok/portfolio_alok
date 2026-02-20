const state = {
  theme: localStorage.getItem("theme") || "dark",
  category: "All",
  q: "",
  projects: []
};

function setTheme(theme){
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  const label = document.querySelector("#themeLabel");
  if(label) label.textContent = theme === "dark" ? "Dark" : "Light";
}

function toggleTheme(){
  setTheme(state.theme === "dark" ? "light" : "dark");
}

function byCategory(projects){
  if(state.category === "All") return projects;
  return projects.filter(p => p.category === state.category);
}

function byQuery(projects){
  const q = state.q.trim().toLowerCase();
  if(!q) return projects;
  return projects.filter(p => {
    const blob = (p.title + " " + p.description + " " + p.tags.join(" ")).toLowerCase();
    return blob.includes(q);
  });
}


function renderMedia(media){
  if(!media || !media.length) return "";
  const items = media.map(m => {
    const type = (m.type || "").toLowerCase();

    // IMPORTANT: use raw src for real navigation; only escape for HTML attribute safety
    const rawSrc = String(m.src || "");
    const rawAlt = String(m.alt || "");

    const src = escapeHtml(rawSrc);
    const alt = escapeHtml(rawAlt);

    if(type === "video"){
      return `<video class="mediaItem" controls preload="metadata" playsinline src="${src}"></video>`;
    }

    // Images/GIFs: click-to-expand (lightbox)
    return `<img class="mediaItem mediaZoom"
                 src="${src}"
                 alt="${alt}"
                 loading="lazy"
                 role="button"
                 tabindex="0"
                 data-lightbox-src="${src}"
                 data-lightbox-alt="${alt}" />`;
  }).join("");
  return `<div class="mediaStrip">${items}</div>`;
}

function render(){
  const grid = document.querySelector("#projectsGrid");
  if(!grid) return;
  grid.innerHTML = "";
  const filtered = byQuery(byCategory(state.projects));
  const count = document.querySelector("#count");
  if(count) count.textContent = `${filtered.length} projects`;

  for(const p of filtered){
    const card = document.createElement("div");
    card.className = "card project";
    card.innerHTML = `
      ${renderMedia(p.media)}
      <div>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.description)}</p>
      </div>
      <div class="meta">
        ${p.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
      </div>
      
      <div>
        <a class="repo" href="${p.repo}" target="_blank" rel="noreferrer">Repo</a>
        <span class="small"> • ${escapeHtml(p.category)}</span>
      </div>
    `;
    grid.appendChild(card);
  }
}

function escapeHtml(s){
  return (s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

async function init(){
  setTheme(state.theme);

  const res = await fetch("./data/projects.json");
  state.projects = await res.json();

  // populate categories
  const categories = ["All", ...Array.from(new Set(state.projects.map(p=>p.category)))];
  const sel = document.querySelector("#categorySelect");
  for(const c of categories){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    sel.appendChild(opt);
  }

  sel.addEventListener("change", (e)=>{ state.category = e.target.value; render(); });
  const search = document.querySelector("#searchInput");
  search.addEventListener("input", (e)=>{ state.q = e.target.value; render(); });

  document.querySelector("#themeToggle").addEventListener("click", toggleTheme);

  render();
}

document.addEventListener("DOMContentLoaded", init);

// ---- Lightbox (expand images/GIFs) ----
function openLightbox(src, alt){
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if(!lb || !img) return;

  img.src = src;
  img.alt = alt || "";

  lb.style.display = "flex";
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox(){
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  if(!lb || !img) return;

  lb.style.display = "none";
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";

  // Stop GIFs in some browsers
  img.src = "";
  img.alt = "";
}

// Delegated listeners so it works for dynamically-rendered cards
document.addEventListener("click", (e) => {
  const targetImg = e.target.closest("img.mediaZoom");
  if(targetImg){
    openLightbox(targetImg.dataset.lightboxSrc, targetImg.dataset.lightboxAlt);
    return;
  }

  const lb = document.getElementById("lightbox");
  if(lb && lb.style.display === "flex"){
    if(e.target.id === "lightbox" || e.target.classList.contains("lightboxClose")){
      closeLightbox();
    }
  }
});

document.addEventListener("keydown", (e) => {
  if(e.key === "Escape") closeLightbox();

  const active = document.activeElement;
  if((e.key === "Enter" || e.key === " ") && active && active.classList && active.classList.contains("mediaZoom")){
    e.preventDefault();
    openLightbox(active.dataset.lightboxSrc, active.dataset.lightboxAlt);
  }
});