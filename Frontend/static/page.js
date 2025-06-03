// page.js
document.addEventListener('DOMContentLoaded', () => {
  // ‼️ Перед тем как показывать что-либо, убедимся в наличии токена
  const token = localStorage.getItem("access_token");
  if (!token) {
    // Без token — сразу на логин
    window.location.replace("login.html");
    return;
  }

  // Если токен есть, прячем/показываем кнопки
  document.getElementById("loginBtn").style.display   = "none";
  document.getElementById("profileBtn").style.display = "block";

  // Сразу подтягиваем профиль
  fetchProfile();

  // Навешиваем события
  document.getElementById("loginBtn").addEventListener("click", () => {
    window.location.href = "login.html";
  });

  document.getElementById("profileBtn").addEventListener("click", () => {
    const profileModal = document.getElementById("profileModal");
    profileModal.style.display = "block";
    fetchProfile();
  });

  document.getElementById("profile-modal-close").addEventListener("click", () => {
    document.getElementById("profileModal").style.display = "none";
  });

  window.addEventListener("click", event => {
    const profileModal = document.getElementById("profileModal");
    if (event.target === profileModal) {
      profileModal.style.display = "none";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.replace("login.html");
  });

  document.getElementById("adminBtn").addEventListener("click", () => {
    window.location.href = "admin.html";
  });
});

// Всегда заново читаем токен перед запросом
function fetchProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  fetch("/auth/profile", {
    headers: { "Authorization": "Bearer " + token }
  })
    .then(response => {
      if (!response.ok) {
        // если сервеp вернул 401/403 — скорее всего токен невалиден
        throw new Error("Неавторизован");
      }
      return response.json();
    })
    .then(data => {
      document.getElementById("profileEmail").textContent = data.email;
      document.getElementById("profileRole").textContent  = formatRole(data.role);

      // Права на кнопки
      document.getElementById("adminBtn").style.display  =
        data.role === "admin" ? "block" : "none";
      document.getElementById("exportBtn").style.display =
        data.role === "scientific" ? "block" : "none";
    })
    .catch(err => {
      console.warn("fetchProfile error:", err);
      // При любом сбое — чистим токен и редиректим
      localStorage.removeItem("access_token");
      alert("Сессия истекла, пожалуйста, авторизуйтесь заново.");
      window.location.replace("login.html");
    });
}

function formatRole(role) {
  switch (role?.toLowerCase()) {
    case "admin":      return "Администратор";
    case "scientific": return "Научный сотрудник";
    case "user":       return "Гость";
    default:           return role || "неизвестно";
  }
}
