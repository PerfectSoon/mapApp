function showNotification(message, type) {
  const container = document.getElementById('notificationContainer');
  // Ограничим число уведомлений максимум 3 одновременно
  if (container.children.length >= 3) {
    container.removeChild(container.firstChild);
  }

  const notification = document.createElement('div');
  notification.classList.add('notification');
  notification.classList.add(
    type === 'success'
      ? 'notification-success'
      : 'notification-error'
  );
  notification.innerText = message;
  container.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

document.getElementById("registerForm").addEventListener("submit", async function(e) {
  e.preventDefault();

  // Элементы формы
  const emailInput = document.getElementById("registerEmail");
  const passwordInput = document.getElementById("registerPassword");
  const roleSelect = document.getElementById("registerRole");
  const submitBtn = this.querySelector('button[type="submit"]');

  // Сбор и простая валидация
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const role = roleSelect.value;
  if (!role) {
    showNotification("Пожалуйста, выберите роль.", "error");
    return;
  }

  // Дизейблим кнопку и показываем индикатор (простейший)
  submitBtn.disabled = true;
  submitBtn.innerText = "Регистрация...";

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role })
    });
    const data = await response.json();

    if (response.ok) {
      showNotification("Регистрация прошла успешно!", "success");
      // Небольшая задержка, чтобы пользователь успел увидеть уведомление
      setTimeout(() => window.location.href = "login.html", 1000);
    } else {
      showNotification("Ошибка регистрации: " + (data.detail || data.message), "error");
    }
  } catch (error) {
    console.error(error);
    showNotification("Ошибка регистрации. Попробуйте еще раз.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Зарегистрироваться";
  }
});