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


document.getElementById("registerForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  const email = document.getElementById("registerEmail").value;
  const password = document.getElementById("registerPassword").value;
  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      showNotification("Регистрация прошла успешно!", "success");
      window.location.href = "login.html";
    } else {
      showNotification("Ошибка регистрации: " + data.detail , "error");
    }
  } catch (error) {
     showNotification("Ошибка регистрации. Попробуйте еще раз.", "error");
  }
});