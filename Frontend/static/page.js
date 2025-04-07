const token = localStorage.getItem("access_token");

if (token) {
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("profileBtn").style.display = "block";
    // При наличии токена сразу запрашиваем профиль для определения роли
    fetchProfile(token);
} else {
    document.getElementById("loginBtn").style.display = "block";
    document.getElementById("profileBtn").style.display = "none";
}

document.getElementById("loginBtn").addEventListener("click", function() {
    window.location.href = "login.html";
});

document.getElementById("profileBtn").addEventListener("click", function() {
    const profileModal = document.getElementById("profileModal");
    profileModal.style.display = "block";
    // При клике можно также обновить профиль
    fetchProfile(token);
});

document.getElementById("profile-modal-close").addEventListener("click", function() {
    document.getElementById("profileModal").style.display = "none";
});

window.addEventListener("click", function(event) {
    const profileModal = document.getElementById("profileModal");
    if (event.target === profileModal) {
        profileModal.style.display = "none";
    }
});

document.getElementById("logoutBtn").addEventListener("click", function() {
    localStorage.removeItem("access_token");
    window.location.reload();
});

// Обработчик для кнопки админки
document.getElementById("adminBtn").addEventListener("click", function() {
    window.location.href = "admin.html";
});

function fetchProfile(token) {
    fetch("/auth/profile", {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Ошибка при получении профиля");
        }
        return response.json();
    })
    .then(data => {
        document.getElementById("profileData").textContent = JSON.stringify(data, null, 2);
        // Если роль пользователя admin, показываем кнопку админки
        if (data.role && data.role.toLowerCase() === "admin") {
            document.getElementById("adminBtn").style.display = "block";
        } else {
            document.getElementById("adminBtn").style.display = "none";
        }
    })
    .catch(err => {
        console.error(err);
        alert("Ошибка загрузки профиля. Возможно, токен устарел.");
    });


}
