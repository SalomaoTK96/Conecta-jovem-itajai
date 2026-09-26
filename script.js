const jobs = [
  {
    title: "Aprendiz Administrativo",
    company: "Empresa Local",
    area: "Administrativo",
    city: "Itajaí",
    type: "Aprendiz",
    schedule: "4h/dia"
  },
  {
    title: "Estágio em Tecnologia",
    company: "Empresa Local",
    area: "Tecnologia",
    city: "Itajaí",
    type: "Estágio",
    schedule: "6h/dia"
  },
  {
    title: "Jovem Aprendiz - Comércio",
    company: "Empresa Local",
    area: "Comércio",
    city: "Navegantes",
    type: "Aprendiz",
    schedule: "4h/dia"
  },
  {
    title: "Auxiliar de Logística",
    company: "Empresa Local",
    area: "Logística",
    city: "Itajaí",
    type: "Aprendiz",
    schedule: "4h/dia"
  },
  {
    title: "Estágio em Atendimento",
    company: "Empresa Local",
    area: "Serviços",
    city: "Balneário Camboriú",
    type: "Estágio",
    schedule: "6h/dia"
  },
  {
    title: "Aprendiz em Tecnologia",
    company: "Empresa Local",
    area: "Tecnologia",
    city: "Itajaí",
    type: "Aprendiz",
    schedule: "4h/dia"
  }
];

function renderJobs(list) {
  const container = document.getElementById("jobs");
  const count = document.getElementById("resultCount");

  count.textContent = `${list.length} oportunidade${list.length === 1 ? "" : "s"}`;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty">
        Nenhuma oportunidade encontrada com esses filtros.
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(job => `
    <article class="job-card">
      <div class="job-top">
        <div>
          <h3>${job.title}</h3>
          <div class="job-company">${job.company}</div>
        </div>
        <span class="tag ${job.type === "Estágio" ? "blue" : ""}">${job.type}</span>
      </div>

      <div class="job-location">📍 ${job.city}</div>

      <div class="job-info">
        <span class="info">${job.area}</span>
        <span class="info">${job.schedule}</span>
      </div>

      <div class="job-footer">
        <span>Publicado recentemente</span>
        <button class="apply" onclick="alert('Detalhes da vaga serão exibidos aqui.')">
          Ver vaga →
        </button>
      </div>
    </article>
  `).join("");
}

function filterJobs() {
  const keyword = document.getElementById("keyword").value.toLowerCase().trim();
  const area = document.getElementById("area").value;
  const city = document.getElementById("city").value;

  const filtered = jobs.filter(job => {
    const text = `${job.title} ${job.company} ${job.area} ${job.city}`.toLowerCase();

    return (
      (!keyword || text.includes(keyword)) &&
      (!area || job.area === area) &&
      (!city || job.city === city)
    );
  });

  renderJobs(filtered);
}

document.getElementById("keyword").addEventListener("keydown", event => {
  if (event.key === "Enter") filterJobs();
});

function openModal(id) {
  document.getElementById(id).classList.add("show");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

document.querySelectorAll(".modal").forEach(modal => {
  modal.addEventListener("click", event => {
    if (event.target === modal) modal.classList.remove("show");
  });
});

renderJobs(jobs);
