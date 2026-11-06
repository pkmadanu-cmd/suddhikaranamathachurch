import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const showPassword = document.getElementById("showPassword");
const message = document.getElementById("loginMessage");

showPassword.addEventListener("change", () => {
  passwordInput.type = showPassword.checked ? "text" : "password";
});
const button = document.getElementById("loginButton");

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "./dashboard.html";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  message.textContent = "";
  button.disabled = true;
  button.textContent = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "./dashboard.html";
  } catch (error) {
    console.error(error);

    const messages = {
      "auth/invalid-credential": "The email or password is incorrect.",
      "auth/user-not-found": "No user was found with this email.",
      "auth/wrong-password": "The password is incorrect.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Please try again later."
    };

    message.textContent = messages[error.code] || "Unable to sign in. Please try again.";
  } finally {
    button.disabled = false;
    button.textContent = "Sign In";
  }
});
