function showNotification(message, type) {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.classList.add('notification');
  if (type === 'success') {
    notification.classList.add('notification-success');
  } else if (type === 'error') {
    notification.classList.add('notification-error');
  }
  notification.innerText = message;
  container.appendChild(notification);
  // Удаляем уведомление через 3 секунды
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const clientId = document.getElementById("clientId").value;
  const clientSecret = document.getElementById("clientSecret").value;
  try {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);
    formData.append("client_id", clientId);
    formData.append("client_secret", clientSecret);
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString()
    });
    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("access_token", data.access_token);

      // После входа перенаправляем пользователя на главную страницу
      window.location.href = "index.html";
    } else {
      showNotification("Ошибка авторизации: " + (data.detail || "Неверные данные"), "error");
    }
  } catch (error) {
    showNotification("Ошибка авторизации. Попробуйте еще раз.", "error");
  }
});
