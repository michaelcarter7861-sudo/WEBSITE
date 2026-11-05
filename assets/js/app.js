(() => {
  const search = document.querySelector("#tool-search");
  const cards = [...document.querySelectorAll(".tool-card")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const empty = document.querySelector("#empty-state");
  const menuButton = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");
  let activeFilter = "all";

  function updateCards() {
    const query = (search?.value || "").trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matchesCategory = activeFilter === "all" || card.dataset.category === activeFilter;
      const haystack = (card.dataset.search + " " + card.textContent).toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const show = matchesCategory && matchesSearch;
      card.hidden = !show;
      if (show) visible++;
    });
    if (empty) empty.hidden = visible > 0;
  }

  search?.addEventListener("input", updateCards);
  filters.forEach(button => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filters.forEach(item => item.classList.toggle("active", item === button));
    updateCards();
  }));
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      event.preventDefault(); search?.focus();
    }
    if (event.key === "Escape") search?.blur();
  });
  menuButton?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open"); menuButton?.setAttribute("aria-expanded", "false");
  }));
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
})();