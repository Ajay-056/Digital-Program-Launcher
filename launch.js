document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const input = form.querySelector('input[name="name"]');
  const button = form.querySelector("button");
  const container = document.querySelector(".container");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = input.value;
    button.disabled = true;
    button.textContent = "Launching...";

    try {
      const response = await fetch("/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `name=${encodeURIComponent(name)}`,
      });

      if (response.ok) {
        // Show a success message
        form.style.display = "none";
        const successMessage = document.createElement("h3");
        successMessage.textContent = "You have launched! 🚀";
        successMessage.style.color = "#1a73e8";
        container.appendChild(successMessage);

        const infoMessage = document.createElement("p");
        infoMessage.innerHTML =
          'Check out the <a href="/status">status page</a> to see the live progress!';
        container.appendChild(infoMessage);
      } else {
        throw new Error("Launch failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during launch:", error);
      button.disabled = false;
      button.textContent = "Launch";
      alert(error.message);
    }
  });
});
